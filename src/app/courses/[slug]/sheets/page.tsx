import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { CourseTabs } from "@/components/CourseTabs";
import { ProgressBar } from "@/components/ProgressBar";
import { courseStats, emptyCounts, solved } from "@/lib/progress";

export default function CourseSheetsPage({
  params,
}: PageProps<"/courses/[slug]/sheets">) {
  return (
    <main className="mx-auto w-full max-w-4xl p-6">
      <Suspense fallback={<p className="mt-4 text-neutral-500">טוען…</p>}>
        <Sheets params={params} />
      </Suspense>
    </main>
  );
}

async function Sheets({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser();
  const course = await db.course.findUnique({
    where: { slug },
    include: {
      exams: {
        where: { published: true, kind: "SHEET" },
        orderBy: [{ sheetNumber: "asc" }, { title: "asc" }],
        include: {
          _count: { select: { questions: true } },
          questions: { select: { _count: { select: { subQuestions: true } } } },
        },
      },
    },
  });
  if (!course) notFound();
  const stats = (await courseStats(user.id, [course.id])).get(course.id)!;
  const { sheets, sheetQuestions, sheetCounts } = stats;

  return (
    <>
      <h1 className="mb-3 text-2xl font-bold">{course.name}</h1>
      <dl className="mb-3 grid grid-cols-2 gap-3 text-sm">
        <Stat title="דפי תרגול" done={sheets.done} total={sheets.total} />
        <Stat
          title="שאלות"
          done={sheetQuestions.done}
          total={sheetQuestions.total}
        />
      </dl>
      <div className="mb-6">
        <ProgressBar counts={sheetCounts} />
      </div>
      <CourseTabs slug={slug} active="sheets" />

      <p className="mb-4 text-sm text-neutral-500">
        דפי התרגול של הקורס, מחולקים לשאלות וסעיפים כמו המבחנים. לכל סעיף יש
        פתרון מלא, ואפשר לסמן אם הצלחת. ההתקדמות כאן נספרת בנפרד מהמבחנים.
      </p>
      {course.exams.length === 0 && (
        <p className="text-neutral-500">עוד אין דפי תרגול לקורס הזה.</p>
      )}
      <ul className="flex flex-col gap-3">
        {course.exams.map((e) => {
          const c = stats.perExam.get(e.id) ?? emptyCounts();
          const parts = e.questions.reduce(
            (n, q) => n + q._count.subQuestions,
            0,
          );
          return (
            <li key={e.id}>
              <Link
                href={`/exams/${e.id}`}
                className="block rounded-xl border border-neutral-200 p-4 hover:border-neutral-400 dark:border-neutral-800"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="font-semibold">{e.title}</div>
                  <div className="shrink-0 text-sm text-neutral-500">
                    {e._count.questions} שאלות · {parts} סעיפים
                    {c.total > 0 && solved(c) === c.total ? " · הושלם" : ""}
                  </div>
                </div>
                <div className="mt-3">
                  <ProgressBar counts={c} />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Stat({
  title,
  done,
  total,
}: {
  title: string;
  done: number;
  total: number;
}) {
  return (
    <div className="rounded-lg bg-neutral-100 px-3 py-2 dark:bg-neutral-900">
      <dt className="text-neutral-500">{title}</dt>
      <dd>
        <span className="font-semibold text-green-700 dark:text-green-400">
          {done}
        </span>{" "}
        בוצעו · <span className="font-semibold">{total - done}</span> נשארו
      </dd>
    </div>
  );
}
