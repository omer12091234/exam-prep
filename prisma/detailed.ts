/**
 * Fully transcribed exams: data/exams/<course>/<key>/extraction.json (exact question text,
 * crop boxes, a worked solution per part) + crops in public/exams/<course>-<key>/.
 * They replace the short descriptions of the matching exam from data/study.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import type { PrismaClient } from "../src/generated/prisma/client";

type Sub = { label: string; points?: number; text: string; solution?: string };
type Q = {
  number: number;
  points?: number;
  stem: string;
  figures?: string[];
  subs: Sub[];
};
type Crop = {
  file: string;
  question: number;
  page: number;
  bbox: number[];
  role: "SUB" | "STEM" | "FIGURE";
  order: number;
  needs_review: boolean;
};
export type Detailed = {
  key: string;
  publicDir: string;
  raw: Buffer;
  exam: {
    match_title: string;
    drive_file_id?: string;
    source_title?: string;
    date?: string;
    duration_minutes?: number;
    aids?: string;
  };
  questions: Q[];
  crops: Crop[];
};

const id = (...parts: string[]) =>
  createHash("sha1").update(parts.join("\u0000")).digest("hex").slice(0, 24);

/** Detailed exams of one course, keyed by the title used in data/study. */
export function loadDetailed(slug: string) {
  const out = new Map<string, Detailed>();
  const root = `data/exams/${slug}`;
  if (!existsSync(root)) return out;
  for (const key of readdirSync(root)) {
    const file = `${root}/${key}/extraction.json`;
    if (!existsSync(file)) continue;
    const raw = readFileSync(file);
    const data = JSON.parse(raw.toString("utf8")) as Pick<
      Detailed,
      "exam" | "questions"
    >;
    const publicDir = `exams/${slug}-${key}`;
    const manifest = `public/${publicDir}/manifest.json`;
    const crops = existsSync(manifest)
      ? (JSON.parse(readFileSync(manifest, "utf8")) as Crop[])
      : [];
    out.set(data.exam.match_title, { key, publicDir, raw, crops, ...data });
  }
  return out;
}

/**
 * Writes the detailed questions into an existing exam row. Ids are derived from the exam,
 * question number and part label, so a re-run updates in place and progress is kept.
 * (The first run replaces the description-based parts, whose progress cannot be mapped.)
 */
export async function importDetailed(
  db: PrismaClient,
  examId: string,
  courseId: string,
  d: Detailed,
) {
  await db.exam.update({
    where: { id: examId },
    data: {
      ...(d.exam.date ? { date: new Date(d.exam.date) } : {}),
      ...(d.exam.duration_minutes
        ? { durationMinutes: d.exam.duration_minutes }
        : {}),
      ...(d.exam.aids ? { aidsNote: d.exam.aids } : {}),
    },
  });
  const sha256 = createHash("sha256").update(d.raw).digest("hex");
  const sourceKey = d.exam.drive_file_id ?? `detailed:${examId}`;
  const sourceFields = {
    examId,
    sha256,
    title: d.exam.source_title ?? d.exam.match_title,
  };
  const source = await db.sourceFile.upsert({
    where: { driveFileId: sourceKey },
    update: sourceFields,
    create: {
      ...sourceFields,
      courseId,
      kind: "EXAM_SCAN",
      driveFileId: sourceKey,
      storagePath: d.publicDir,
      pageCount: Math.max(0, ...d.crops.map((c) => c.page)),
      status: "APPROVED",
    },
  });

  const qid = (q: Q) => id(examId, "dq", String(q.number));
  await db.question.deleteMany({
    where: { examId, id: { notIn: d.questions.map(qid) } },
  });

  for (const q of d.questions) {
    const questionId = qid(q);
    const qFields = {
      number: q.number,
      label: null,
      points: q.points ?? null,
      stemText: q.stem,
      figuresNote: q.figures?.join("\n") ?? null,
      needsReview: false,
    };
    await db.question.upsert({
      where: { id: questionId },
      update: qFields,
      create: { id: questionId, examId, ...qFields },
    });

    const sid = (s: Sub) => id(questionId, "ds", s.label);
    await db.subQuestion.deleteMany({
      where: { questionId, id: { notIn: q.subs.map(sid) } },
    });
    await db.questionImage.deleteMany({
      where: { OR: [{ questionId }, { subQuestion: { questionId } }] },
    });
    await db.solution.deleteMany({
      where: { author: "AI", subQuestion: { questionId } },
    });

    for (const [i, s] of q.subs.entries()) {
      const order = i + 1;
      const subQuestionId = sid(s);
      const sFields = {
        label: s.label,
        order,
        points: s.points ?? null,
        text: s.text,
      };
      await db.subQuestion.upsert({
        where: { id: subQuestionId },
        update: sFields,
        create: { id: subQuestionId, questionId, ...sFields },
      });
      const crop = d.crops.find(
        (c) => c.question === q.number && c.role === "SUB" && c.order === order,
      );
      if (crop) {
        await db.questionImage.create({
          data: {
            sourceFileId: source.id,
            subQuestionId,
            role: "SUB",
            page: crop.page,
            bbox: crop.bbox,
            path: `/${d.publicDir}/${crop.file}`,
            order: 0,
          },
        });
      }
      if (s.solution) {
        await db.solution.create({
          data: {
            subQuestionId,
            sourceFileId: source.id,
            author: "AI",
            contentMd: s.solution,
            pages: [],
          },
        });
      }
    }
    for (const c of d.crops.filter(
      (c) => c.question === q.number && c.role !== "SUB",
    )) {
      await db.questionImage.create({
        data: {
          sourceFileId: source.id,
          questionId,
          role: c.role,
          page: c.page,
          bbox: c.bbox,
          path: `/${d.publicDir}/${c.file}`,
          order: c.order,
        },
      });
    }
  }
}
