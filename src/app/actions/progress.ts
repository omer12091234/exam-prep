"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const STATUSES = ["NOT_SOLVED", "OK", "STRUGGLED"] as const;
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
