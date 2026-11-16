import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ProgressBar } from "@/components/ProgressBar";
import { StatsRow } from "@/components/StatsRow";
import { courseStats } from "@/lib/progress";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl p-6">
      <h1 className="mb-4 text-2xl font-bold">הקורסים שלי</h1>
      <Suspense fallback={<p className="text-neutral-500">טוען…</p>}>
        <Courses />
      </Suspense>
    </main>
  );
}

async function Courses() {
  const user = await requireUser();
  if (!user.onboarded) redirect("/onboarding");
  const courses = await db.course.findMany({
    where: { enrollments: { some: { userId: user.id } } },
    orderBy: { name: "asc" },
  });
  const stats = await courseStats(
    user.id,
    courses.map((c) => c.id),
  );

  if (courses.length === 0) {
    return (
      <p className="text-neutral-500">
        עוד לא בחרת קורסים.{" "}
        <Link href="/settings" className="underline">
          בחירת קורסים
        </Link>
      </p>
    );
  }
  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2">
        {courses.map((c) => {
          const s = stats.get(c.id)!;
          return (
            <li key={c.id}>
              <Link
                href={`/courses/${c.slug}`}
                className="flex h-full flex-col gap-3 rounded-xl border border-neutral-200 p-4 hover:border-neutral-400 dark:border-neutral-800"
              >
                <div>
                  <div className="font-semibold">{c.name}</div>
                  {c.number && (
                    <div className="text-sm text-neutral-500">{c.number}</div>
                  )}
                </div>
                <StatsRow stats={s} />
                <ProgressBar counts={s.counts} />
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 text-sm">
        <Link href="/settings" className="underline">
          הוספה או הסרה של קורסים
        </Link>
      </p>
    </>
  );
}
