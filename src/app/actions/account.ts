"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { isDemo } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";

async function setCourses(userId: string, courseIds: string[]) {
  const valid = await db.course.findMany({
    where: { id: { in: courseIds } },
    select: { id: true },
  });
  const ids = valid.map((c) => c.id);
  await db.enrollment.deleteMany({
    where: { userId, courseId: { notIn: ids } },
  });
  await db.enrollment.createMany({
    data: ids.map((courseId) => ({ userId, courseId })),
    skipDuplicates: true,
  });
}

/** The user's own course list (onboarding and settings). Leaving a course keeps its progress. */
export async function saveMyCourses(formData: FormData) {
  const user = await requireUser();
  await setCourses(user.id, formData.getAll("course").map(String));
  const name = formData.get("displayName");
  await db.user.update({
    where: { id: user.id },
    data: {
      onboarded: true,
      ...(typeof name === "string" && name.trim()
        ? { displayName: name.trim().slice(0, 60) }
        : {}),
    },
  });
  if (formData.get("next") === "home") redirect("/");
  refresh();
}

/** Admin: one user's course on/off. */
export async function adminSetEnrollment(
  userId: string,
  courseId: string,
  enrolled: boolean,
) {
  await requireAdmin();
  if (enrolled) {
    await db.enrollment.createMany({
      data: [{ userId, courseId }],
      skipDuplicates: true,
    });
  } else {
    await db.enrollment.deleteMany({ where: { userId, courseId } });
  }
  refresh();
}

/** Admin: promote / demote. An admin cannot demote themself (the site must keep one). */
export async function adminSetRole(userId: string, role: "ADMIN" | "USER") {
  const admin = await requireAdmin();
  if (role !== "ADMIN" && role !== "USER") throw new Error("invalid role");
  if (userId === admin.id) throw new Error("cannot change your own role");
  await db.user.update({ where: { id: userId }, data: { role } });
  refresh();
}

export async function signOut() {
  if (!isDemo) await (await createClient()).auth.signOut();
  redirect("/login");
}
