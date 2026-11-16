import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { CourseTabs } from "@/components/CourseTabs";
import { ProgressBar } from "@/components/ProgressBar";
import { countStatuses, subStatuses } from "@/lib/progress";

export default function CourseTopicsPage({
  params,
}: PageProps<"/courses/[slug]/topics">) {
  return (
    <main className="mx-auto w-full max-w-4xl p-6">
      <Suspense fallback={<p className="mt-4 text-neutral-500">טוען…</p>}>
        <Topics params={params} />
      </Suspense>
    </main>
  );
}

async function Topics({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser();
  const course = await db.course.findUnique({
    where: { slug },
    include: {
      docs: { orderBy: { order: "asc" }, select: { id: true, title: true } },
      topics: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          name: true,
          _count: { select: { practice: true } },
          subQuestions: {
            where: { subQuestion: { question: { exam: { published: true } } } },
            select: { subQuestionId: true },
          },
        },
      },
    },
  });
  if (!course) notFound();
  const statuses = await subStatuses(user.id, [
    ...new Set(
      course.topics.flatMap((t) => t.subQuestions.map((s) => s.subQuestionId)),
    ),
  ]);

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{course.name}</h1>
      <CourseTabs
        slug={slug}
        active="topics"
        hasDocs={course.docs.length > 0}
      />
      <p className="mb-4 text-sm text-neutral-500">
        בכל נושא: סיכום, נוסחאות, טעויות נפוצות, וכל השאלות ממבחני העבר שעוסקות
        בו, ממוינות לפי קושי.
      </p>
      {course.topics.length === 0 && (
        <p className="text-neutral-500">עוד אין נושאים לקורס הזה.</p>
      )}
      <ol className="flex flex-col gap-3">
        {course.topics.map((t, i) => (
          <li key={t.id}>
            <Link
              href={`/topics/${t.id}`}
              className="block rounded-xl border border-neutral-200 p-4 hover:border-neutral-400 dark:border-neutral-800"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="font-semibold">
                  {i + 1}. {t.name}
                </div>
                <div className="shrink-0 text-sm text-neutral-500">
                  {t.subQuestions.length} סעיפים ממבחנים
                  {t._count.practice > 0
                    ? ` · ${t._count.practice} שאלות תרגול`
                    : ""}
                </div>
              </div>
              <div className="mt-3">
                <ProgressBar
                  counts={countStatuses(
                    t.subQuestions.map((s) => s.subQuestionId),
                    statuses,
                  )}
                />
              </div>
            </Link>
          </li>
        ))}
      </ol>

      {course.docs.length > 0 && (
        <section id="docs" className="mt-10">
          <h2 className="mb-3 text-xl font-semibold">הרצאות מתורגמות</h2>
          <ul className="flex flex-col gap-2">
            {course.docs.map((d) => (
              <li key={d.id}>
                <Link href={`/docs/${d.id}`} className="underline">
                  {d.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
