/**
 * Seeds the example exam (Intro to EE 1, Guy Cohen, 2023 semester A moed A)
 * from ingest/example/* and the crops in public/demo/2023A.
 * Idempotent: an already seeded exam is kept; SEED_FORCE=1 replaces its questions.
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { runtimeDbUrl } from "../src/lib/dburl";

type Sub = { label: string; points: number; text: string };
type Q = {
  number: number;
  points: number;
  stem: string;
  figures?: string[];
  subs: Sub[];
};
type Extraction = {
  exam: {
    lecturer: string;
    course: string;
    course_number: string;
    year: number;
    date: string;
    duration_minutes: number;
    aids: string;
  };
  questions: Q[];
};
type Crop = {
  file: string;
  question: number;
  page: number;
  bbox: number[];
  role: "SUB" | "STEM" | "FIGURE";
  order: number;
  sub?: string;
  needs_review: boolean;
};
type Grader = {
  rows: {
    q: number;
    sub: number;
    score: number;
    max: number;
    kind: "DEDUCTION" | "PRAISE";
    text: string;
  }[];
};

const read = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8")) as T;

async function main() {
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: runtimeDbUrl() }),
  });
  const ex = read<Extraction>("ingest/example/extraction.json");
  const crops = read<Crop[]>("public/demo/2023A/manifest.json");
  const grader = read<Grader>("ingest/example/grader_comments.json");

  const course = await db.course.upsert({
    where: { slug: "intro-ee-1" },
    update: {},
    create: {
      slug: "intro-ee-1",
      name: ex.exam.course,
      number: ex.exam.course_number,
      institution: "BGU",
    },
  });
  const lecturer = await db.lecturer.upsert({
    where: { name: ex.exam.lecturer },
    update: {},
    create: { name: ex.exam.lecturer },
  });

  const key = {
    courseId: course.id,
    year: ex.exam.year,
    semester: "A" as const,
    moed: 1,
    origin: "OFFICIAL" as const,
  };
  const examData = {
    lecturerId: lecturer.id,
    date: new Date(ex.exam.date),
    durationMinutes: ex.exam.duration_minutes,
    aidsNote: ex.exam.aids,
    published: true,
  };
  // Imported exams no longer have a unique year/semester/moed, so the example is found by its key.
  const importKey = "seed:intro-ee-1:2023A1";
  const existing = await db.exam.findFirst({
    where: { OR: [{ importKey }, key] },
  });
  const exam = existing
    ? await db.exam.update({
        where: { id: existing.id },
        data: { ...examData, importKey },
      })
    : await db.exam.create({ data: { ...key, ...examData, importKey } });

  const raw = readFileSync("ingest/example/extraction.json");
  const source = await db.sourceFile.upsert({
    where: { driveFileId: "1FqD4NQ_JrxtVhVpSJrvYSsR2QWjWu1QA" },
    update: { examId: exam.id },
    create: {
      courseId: course.id,
      examId: exam.id,
      kind: "EXAM_SCAN",
      title: "מועד א 2023.pdf",
      driveFileId: "1FqD4NQ_JrxtVhVpSJrvYSsR2QWjWu1QA",
      sha256: createHash("sha256").update(raw).digest("hex"), // demo: hash of the extraction, not the PDF
      storagePath: "demo/2023A",
      pageCount: 3,
      status: "APPROVED",
    },
  });

  // Re-creating the questions drops everyone's progress on them, so an existing exam is left
  // alone (this also runs on every deploy). SEED_FORCE=1 rebuilds it.
  if (
    existing &&
    process.env.SEED_FORCE !== "1" &&
    (await db.question.count({ where: { examId: exam.id } })) > 0
  ) {
    console.log(
      "example exam already seeded – skipped (SEED_FORCE=1 to rebuild)",
    );
    await db.$disconnect();
    return;
  }
  await db.question.deleteMany({ where: { examId: exam.id } }); // cascades to subs, images, comments

  for (const q of ex.questions) {
    const question = await db.question.create({
      data: {
        examId: exam.id,
        number: q.number,
        points: q.points,
        stemText: q.stem,
        figuresNote: q.figures?.join("\n"),
        needsReview: false,
      },
    });
    for (const [i, s] of q.subs.entries()) {
      const order = i + 1;
      const sub = await db.subQuestion.create({
        data: {
          questionId: question.id,
          label: s.label,
          order,
          points: s.points,
          text: s.text,
        },
      });
      const crop = crops.find(
        (c) => c.question === q.number && c.role === "SUB" && c.order === order,
      );
      if (crop) {
        await db.questionImage.create({
          data: {
            sourceFileId: source.id,
            subQuestionId: sub.id,
            role: "SUB",
            page: crop.page,
            bbox: crop.bbox,
            path: `/demo/2023A/${crop.file}`,
            order: 0,
          },
        });
      }
      for (const g of grader.rows.filter(
        (r) => r.q === q.number && r.sub === order,
      )) {
        await db.lecturerComment.create({
          data: {
            subQuestionId: sub.id,
            kind: g.kind,
            text: g.text || "(הורדו נקודות ללא הערה)",
            pointsLost: g.max - g.score,
            maxPoints: g.max,
          },
        });
      }
    }
    for (const c of crops.filter(
      (c) => c.question === q.number && c.role !== "SUB",
    )) {
      await db.questionImage.create({
        data: {
          sourceFileId: source.id,
          questionId: question.id,
          role: c.role,
          page: c.page,
          bbox: c.bbox,
          path: `/demo/2023A/${c.file}`,
          order: c.order,
        },
      });
    }
  }

  const counts = await db.subQuestion.count({
    where: { question: { examId: exam.id } },
  });
  console.log(
    `seeded exam ${ex.exam.year}/A/1 – ${ex.questions.length} questions, ${counts} sub-questions`,
  );
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
