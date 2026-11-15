import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ProgressBar } from "@/components/ProgressBar";
import { emptyCounts, examCounts, sumCounts } from "@/lib/progress";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl p-6">
      <h1 className="mb-1 text-2xl font-bold">הקורסים שלי</h1>
      <Suspense fallback={<p className="text-neutral-500">טוען…</p>}>
        <Courses />
      </Suspense>
    </main>
  );
}

async function Courses() {
  const user = await requireUser();
  const courses = await db.course.findMany({
    orderBy: { name: "asc" },
    include: { exams: { where: { published: true }, select: { id: true } } },
  });
  const perExam = await examCounts(
    user.id,
    courses.flatMap((c) => c.exams.map((e) => e.id)),
  );
  const courseCounts = new Map(
    courses.map((c) => [c.id, sumCounts(c.exams.map((e) => perExam.get(e.id) ?? emptyCounts()))]),
  );

  return (
    <>
      <p className="mb-6 text-sm text-neutral-500">שלום {user.displayName ?? user.email}</p>
      {courses.length === 0 ? (
        <p className="text-neutral-500">עוד אין קורסים. האדמין צריך להריץ קליטת תוכן.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {courses.map((c) => (
            <li key={c.id}>
              <Link
                href={`/courses/${c.slug}`}
                className="block rounded-xl border border-neutral-200 p-4 hover:border-neutral-400 dark:border-neutral-800"
              >
                <div className="font-semibold">{c.name}</div>
                <div className="text-sm text-neutral-500">
                  {c.type === "LAB" ? "מעבדה" : `${c.exams.length} מבחנים`}
                </div>
                {c.type !== "LAB" && (
                  <div className="mt-3">
                    <ProgressBar counts={courseCounts.get(c.id) ?? emptyCounts()} />
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
