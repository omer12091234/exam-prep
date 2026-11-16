import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { examTitle } from "@/lib/courses";
import { db } from "@/lib/db";

const STATUS = { PENDING: "בבדיקה…", DONE: "נבדק", FAILED: "נכשלה" } as const;

export default function GradingsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl p-6">
      <h1 className="mb-1 text-2xl font-bold">בדיקות</h1>
      <p className="mb-6 text-neutral-500">
        פתרונות ששלחת לבדיקה. שולחים פתרון חדש מתוך דף המבחן.
      </p>
      <Suspense fallback={<p className="text-neutral-500">טוען…</p>}>
        <List />
      </Suspense>
    </main>
  );
}

async function List() {
  const user = await requireUser();
  const rows = await db.grading.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      exam: { include: { course: { select: { name: true } } } },
      question: { select: { number: true, label: true } },
    },
  });
  if (rows.length === 0)
    return <p className="text-neutral-500">עוד לא שלחת פתרונות לבדיקה.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((g) => (
        <li key={g.id}>
          <Link
            href={`/gradings/${g.id}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 p-4 hover:border-neutral-400 dark:border-neutral-800"
          >
            <div>
              <div className="font-semibold">
                {examTitle(g.exam)}
                {g.question
                  ? ` · שאלה ${g.question.label ?? g.question.number}`
                  : ""}
              </div>
              <div className="text-sm text-neutral-500">
                {g.exam.course.name} · {g.createdAt.toLocaleDateString("he-IL")}
              </div>
            </div>
            <div className="text-sm">
              {g.status === "DONE" && g.score != null ? (
                <span className="font-semibold">
                  {g.score} / {g.maxScore}
                </span>
              ) : (
                <span
                  className={
                    g.status === "FAILED" ? "text-red-600" : "text-neutral-500"
                  }
                >
                  {STATUS[g.status]}
                </span>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
