import { db } from "@/lib/db";
import type { ProgressStatus } from "@/generated/prisma/client";

export type Counts = {
  ok: number;
  struggled: number;
  failed: number;
  total: number;
};

export const emptyCounts = (total = 0): Counts => ({
  ok: 0,
  struggled: 0,
  failed: 0,
  total,
});

/** "Done" = attempted, whatever the outcome. */
export const solved = (c: Counts) => c.ok + c.struggled + c.failed;

function add(c: Counts, s: ProgressStatus | undefined) {
  if (s === "OK") c.ok++;
  else if (s === "STRUGGLED") c.struggled++;
  else if (s === "FAILED") c.failed++;
}

/** Status of each sub-question for a user (missing → NOT_SOLVED). */
export async function subStatuses(userId: string, subIds: string[]) {
  const rows = await db.userProgress.findMany({
    where: { userId, subQuestionId: { in: subIds } },
    select: { subQuestionId: true, status: true },
  });
  const map = new Map<string, ProgressStatus>();
  for (const r of rows) if (r.subQuestionId) map.set(r.subQuestionId, r.status);
  return map;
}

export function countStatuses(
  subIds: string[],
  statuses: Map<string, ProgressStatus>,
): Counts {
  const c = emptyCounts(subIds.length);
  for (const id of subIds) add(c, statuses.get(id));
  return c;
}

export type DoneLeft = { done: number; started: number; total: number };
export type CourseStats = {
  /** sub-question counts (exams only) */
  counts: Counts;
  /** sub-question counts of the practice sheets */
  sheetCounts: Counts;
  /** practice sheets done / left, and their questions */
  sheets: DoneLeft;
  sheetQuestions: DoneLeft;
  /** an exam is done when every part of it has a status; started when at least one has */
  exams: DoneLeft;
  /** a question is done when every part of it has a status */
  questions: DoneLeft;
  perExam: Map<string, Counts>;
};

const emptyStats = (): CourseStats => ({
  counts: emptyCounts(),
  sheetCounts: emptyCounts(),
  sheets: { done: 0, started: 0, total: 0 },
  sheetQuestions: { done: 0, started: 0, total: 0 },
  exams: { done: 0, started: 0, total: 0 },
  questions: { done: 0, started: 0, total: 0 },
  perExam: new Map(),
});

/** Progress of one user in each course: parts, questions and exams done / left. Two queries. */
export async function courseStats(userId: string, courseIds: string[]) {
  const stats = new Map<string, CourseStats>(
    courseIds.map((id) => [id, emptyStats()]),
  );
  if (courseIds.length === 0) return stats;
  const subs = await db.subQuestion.findMany({
    where: {
      question: { exam: { courseId: { in: courseIds }, published: true } },
    },
    select: {
      id: true,
      questionId: true,
      question: {
        select: {
          examId: true,
          exam: { select: { courseId: true, kind: true } },
        },
      },
    },
  });
  const progress = await db.userProgress.findMany({
    where: {
      userId,
      status: { not: "NOT_SOLVED" },
      subQuestion: { question: { exam: { courseId: { in: courseIds } } } },
    },
    select: { subQuestionId: true, status: true },
  });
  const status = new Map(progress.map((p) => [p.subQuestionId!, p.status]));

  const perQuestion = new Map<
    string,
    { courseId: string; sheet: boolean; done: number; total: number }
  >();
  const sheetExams = new Set<string>();
  for (const s of subs) {
    const { examId } = s.question;
    const courseId = s.question.exam.courseId;
    const sheet = s.question.exam.kind === "SHEET";
    if (sheet) sheetExams.add(examId);
    const cs = stats.get(courseId)!;
    const st = status.get(s.id);
    let ec = cs.perExam.get(examId);
    if (!ec) cs.perExam.set(examId, (ec = emptyCounts()));
    for (const c of [sheet ? cs.sheetCounts : cs.counts, ec]) {
      c.total++;
      add(c, st);
    }
    let q = perQuestion.get(s.questionId);
    if (!q)
      perQuestion.set(
        s.questionId,
        (q = { courseId, sheet, done: 0, total: 0 }),
      );
    q.total++;
    if (st) q.done++;
  }
  for (const q of perQuestion.values()) {
    const cs = stats.get(q.courseId)!;
    tally(q.sheet ? cs.sheetQuestions : cs.questions, q.done, q.total);
  }
  for (const cs of stats.values())
    for (const [examId, c] of cs.perExam)
      tally(sheetExams.has(examId) ? cs.sheets : cs.exams, solved(c), c.total);
  return stats;
}

function tally(t: DoneLeft, done: number, total: number) {
  t.total++;
  if (done > 0) t.started++;
  if (done === total) t.done++;
}
