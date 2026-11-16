"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const STATUSES = ["NOT_SOLVED", "OK", "STRUGGLED", "FAILED"] as const;
export type SubStatus = (typeof STATUSES)[number];

/** Set the current user's status for one sub-question. */
export async function setSubStatus(subQuestionId: string, status: SubStatus) {
  if (!STATUSES.includes(status)) throw new Error("invalid status");
  const user = await requireUser();

  // Only sub-questions of published exams can be tracked.
  const sub = await db.subQuestion.findFirst({
    where: { id: subQuestionId, question: { exam: { published: true } } },
    select: { id: true },
  });
  if (!sub) throw new Error("sub-question not found");

  await db.userProgress.upsert({
    where: { userId_subQuestionId: { userId: user.id, subQuestionId } },
    update: { status },
    create: { userId: user.id, subQuestionId, status },
  });
  refresh();
}

/** Adds stopwatch time to a question. No refresh: the client already shows the total. */
export async function addQuestionTime(questionId: string, seconds: number) {
  const s = Math.round(seconds);
  if (!Number.isFinite(s) || s <= 0 || s > 6 * 3600) return;
  const user = await requireUser();
  const q = await db.question.findFirst({
    where: { id: questionId, exam: { published: true } },
    select: { id: true },
  });
  if (!q) throw new Error("question not found");
  await db.questionTime.upsert({
    where: { userId_questionId: { userId: user.id, questionId } },
    update: { seconds: { increment: s } },
    create: { userId: user.id, questionId, seconds: s },
  });
}

/** Starts a timed run of an exam; an unfinished earlier run of the same exam is closed. */
export async function startAttempt(examId: string, minutes: number) {
  const m = Math.round(minutes);
  if (!Number.isFinite(m) || m < 1 || m > 600)
    throw new Error("invalid duration");
  const user = await requireUser();
  const exam = await db.exam.findFirst({
    where: { id: examId, published: true },
    select: { id: true },
  });
  if (!exam) throw new Error("exam not found");
  const now = new Date();
  await db.examAttempt.updateMany({
    where: { userId: user.id, examId, submittedAt: null },
    data: { submittedAt: now },
  });
  await db.examAttempt.create({
    data: {
      userId: user.id,
      examId,
      startedAt: now,
      endsAt: new Date(now.getTime() + m * 60_000),
    },
  });
  refresh();
}

export async function finishAttempt(attemptId: string) {
  const user = await requireUser();
  await db.examAttempt.updateMany({
    where: { id: attemptId, userId: user.id, submittedAt: null },
    data: { submittedAt: new Date() },
  });
  refresh();
}
