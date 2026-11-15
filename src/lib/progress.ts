import { db } from "@/lib/db";
import type { ProgressStatus } from "@/generated/prisma/client";

export type Counts = { ok: number; struggled: number; total: number };

export const emptyCounts = (total = 0): Counts => ({ ok: 0, struggled: 0, total });

/** "Solved" = attempted, whether it went fine or was a struggle. */
export const solved = (c: Counts) => c.ok + c.struggled;

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

export function countStatuses(subIds: string[], statuses: Map<string, ProgressStatus>): Counts {
  const c = emptyCounts(subIds.length);
  for (const id of subIds) {
    const s = statuses.get(id);
    if (s === "OK") c.ok++;
    else if (s === "STRUGGLED") c.struggled++;
  }
  return c;
}

/** Per-exam counts for a set of exams (one query for the subs, one for progress). */
export async function examCounts(userId: string, examIds: string[]) {
  const subs = await db.subQuestion.findMany({
    where: { question: { examId: { in: examIds } } },
    select: { id: true, question: { select: { examId: true } } },
  });
  const statuses = await subStatuses(
    userId,
    subs.map((s) => s.id),
  );
  const byExam = new Map<string, Counts>(examIds.map((id) => [id, emptyCounts()]));
  for (const s of subs) {
    const c = byExam.get(s.question.examId)!;
    c.total++;
    const st = statuses.get(s.id);
    if (st === "OK") c.ok++;
    else if (st === "STRUGGLED") c.struggled++;
  }
  return byExam;
}

export function sumCounts(list: Iterable<Counts>): Counts {
  const t = emptyCounts();
  for (const c of list) {
    t.ok += c.ok;
    t.struggled += c.struggled;
    t.total += c.total;
  }
  return t;
}
