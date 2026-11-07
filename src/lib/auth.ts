import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

/** Current user row (created on first visit). Redirects to /login when signed out. */
export async function requireUser() {
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
