/**
 * Fully transcribed exams: data/exams/<course>/<key>/extraction.json (exact question text,
 * crop boxes, a worked solution per part) + crops in public/exams/<course>-<key>/.
 * They replace the short descriptions of the matching exam from data/study.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import type {
  PrismaClient,
  ProgressStatus,
} from "../src/generated/prisma/client";

type Sub = {
  label: string;
  points?: number;
  text: string;
  /** Hebrew translation when the text is in English */
  text_he?: string;
  /** what is unclear in the source, for a person to check against the original */
  review?: string;
  solution?: string;
};
type Q = {
  number: number;
  /** topic keys of the course ("t3"); used by practice sheets */
  topics?: string[];
  points?: number;
  stem: string;
  stem_he?: string;
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
    sheet_number?: number;
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

/**
 * Detailed exams (data/exams) or practice sheets (data/sheets) of one course, keyed by
 * match_title (for exams: the title used in data/study).
 */
export function loadDetailed(slug: string, kind: "exams" | "sheets" = "exams") {
  const out = new Map<string, Detailed>();
  const root = `data/${kind}/${slug}`;
  if (!existsSync(root)) return out;
  for (const key of readdirSync(root)) {
    const file = `${root}/${key}/extraction.json`;
    if (!existsSync(file)) continue;
    const raw = readFileSync(file);
    const data = JSON.parse(raw.toString("utf8")) as Pick<
      Detailed,
      "exam" | "questions"
    >;
    const publicDir = `${kind}/${slug}-${key}`;
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
  // The first import of a detailed exam replaces its description-based questions. Keep what
  // users already recorded on them: statuses move to the matching new parts, times to the
  // question with the same number.
  const replaced = await db.question.findMany({
    where: { examId, id: { notIn: d.questions.map(qid) } },
    select: {
      number: true,
      times: { select: { userId: true, seconds: true } },
      subQuestions: {
        select: {
          label: true,
          progress: {
            where: { status: { not: "NOT_SOLVED" } },
            select: { userId: true, status: true },
          },
        },
      },
    },
  });
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
      stemTextHe: q.stem_he ?? null,
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
        textHe: s.text_he ?? null,
        reviewNote: s.review?.trim() || null,
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

  for (const old of replaced) {
    const q = d.questions.find((x) => x.number === old.number);
    if (!q) continue;
    const questionId = qid(q);
    for (const t of old.times) {
      await db.questionTime.upsert({
        where: { userId_questionId: { userId: t.userId, questionId } },
        update: { seconds: { increment: t.seconds } },
        create: { userId: t.userId, questionId, seconds: t.seconds },
      });
    }
    const rows: {
      userId: string;
      subQuestionId: string;
      status: ProgressStatus;
    }[] = [];
    for (const oldSub of old.subQuestions) {
      const letters = lettersOf(oldSub.label);
      const targets = q.subs.filter(
        (s) => !letters || letters.includes(s.label.trim().charAt(0)),
      );
      for (const p of oldSub.progress) {
        for (const s of targets)
          rows.push({
            userId: p.userId,
            subQuestionId: id(questionId, "ds", s.label),
            status: p.status,
          });
      }
    }
    // A part already marked on the new version keeps its own status.
    await db.userProgress.createMany({ data: rows, skipDuplicates: true });
  }
}

const HEB = "אבגדהוזחטיכלמנסעפצקרשת";

/** Letters covered by an imported part label: "א-ד" → א…ד; "" or unknown → null (= whole question). */
function lettersOf(label: string) {
  const m = label.match(/^([א-ת])(?:\s*[-–]\s*([א-ת]))?/);
  if (!m) return null;
  const a = HEB.indexOf(m[1]);
  const b = m[2] ? HEB.indexOf(m[2]) : a;
  return [...HEB.slice(a, b + 1)];
}

type RepeatSide = {
  title: string;
  number: number;
  same: number;
  parts: number;
};

/**
 * Repeated questions (data/repeats/<course>.json, made by ingest/find_repeats.py), stored in
 * both directions. Rebuilt on every import; pairs whose exam or question is missing are skipped.
 */
export async function importRepeats(
  db: PrismaClient,
  slug: string,
  courseId: string,
  examIdOf: (title: string) => string,
) {
  const file = `data/repeats/${slug}.json`;
  await db.questionRepeat.deleteMany({
    where: { question: { exam: { courseId } } },
  });
  if (!existsSync(file)) return;
  const pairs = JSON.parse(readFileSync(file, "utf8")) as {
    a: RepeatSide;
    b: RepeatSide;
    similarity: number;
  }[];
  const qId = (s: RepeatSide) => id(examIdOf(s.title), "dq", String(s.number));
  const wanted = pairs.flatMap((p) => [qId(p.a), qId(p.b)]);
  const existing = new Set(
    (
      await db.question.findMany({
        where: { id: { in: wanted } },
        select: { id: true },
      })
    ).map((q) => q.id),
  );
  const rows = pairs.flatMap((p) => {
    const a = qId(p.a);
    const b = qId(p.b);
    if (!existing.has(a) || !existing.has(b)) return [];
    return [
      {
        questionId: a,
        otherId: b,
        sameParts: p.a.same,
        totalParts: p.a.parts,
        similarity: p.similarity,
      },
      {
        questionId: b,
        otherId: a,
        sameParts: p.b.same,
        totalParts: p.b.parts,
        similarity: p.similarity,
      },
    ];
  });
  await db.questionRepeat.createMany({ data: rows, skipDuplicates: true });
  console.log(`${slug}: ${rows.length / 2} repeated question pairs`);
}
