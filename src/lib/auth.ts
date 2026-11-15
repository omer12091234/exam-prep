import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { DEMO_USER, deployedWithoutAuth, isDemo } from "@/lib/demo";

/** Current user row (created on first visit). Redirects to /login when signed out. */
export async function requireUser() {
  // Per-user data is request-time only. In demo mode nothing reads cookies, so without
  // this Next tries to prerender the DB query (Prisma uses crypto.randomUUID → error).
  await connection();
  if (deployedWithoutAuth) throw new Error("Supabase is not configured on this deployment");
  if (isDemo) {
    return db.user.upsert({
      where: { id: DEMO_USER.id },
      update: {},
      create: { ...DEMO_USER, role: "ADMIN" },
    });
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const { id, email } = data.user;
  return db.user.upsert({
    where: { id },
    update: {},
    create: { id, email: email ?? `${id}@unknown` },
  });
}

/** Only admins upload and edit content. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
