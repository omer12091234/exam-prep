import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { MathText } from "@/components/MathText";
import { examTitle } from "@/lib/courses";

export default function ReviewPage() {
  return (
    <main className="mx-auto w-full max-w-4xl p-6">
      <h1 className="mb-2 text-2xl font-bold">סעיפים לבדיקה ידנית</h1>
      <p className="mb-6 text-sm text-neutral-500">
        סעיפים שבהם המקור לא היה קריא עד הסוף (כתב יד, שחזור, צילום חלקי). כדאי
        להשוות לתמונה מהמבחן או לקובץ המקורי ולוודא מה כתוב.
      </p>
      <Suspense fallback={<p className="text-neutral-500">טוען…</p>}>
        <List />
      </Suspense>
    </main>
  );
}

async function List() {
  await requireUser();
  const subs = await db.subQuestion.findMany({
    where: { reviewNote: { not: null } },
    select: {
      id: true,
      label: true,
      reviewNote: true,
      question: {
        select: {
          number: true,
          label: true,
          exam: {
            select: {
              id: true,
              title: true,
              year: true,
              semester: true,
              moed: true,
              sourceUrl: true,
              course: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: [{ question: { exam: { year: "desc" } } }, { order: "asc" }],
  });
  if (subs.length === 0)
    return <p className="text-neutral-500">אין כרגע סעיפים לבדיקה.</p>;

  const byExam = new Map<string, typeof subs>();
  for (const s of subs) {
    const k = s.question.exam.id;
    byExam.set(k, [...(byExam.get(k) ?? []), s]);
  }
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm">
        {subs.length} סעיפים ב-{byExam.size} מבחנים/דפים.
      </p>
      {[...byExam.values()].map((list) => {
        const e = list[0].question.exam;
        return (
          <section
            key={e.id}
            className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
          >
            <h2 className="font-semibold">
              <Link href={`/exams/${e.id}`} className="hover:underline">
                {examTitle(e)}
              </Link>
            </h2>
            <p className="mb-2 text-sm text-neutral-500">
              {e.course.name}
              {e.sourceUrl && (
                <>
                  {" · "}
                  <a
                    href={e.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    הקובץ המקורי
                  </a>
                </>
              )}
            </p>
            <ul className="flex flex-col gap-2 text-sm">
              {list.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/exams/${e.id}#q${s.question.number}`}
                    className="font-medium underline"
                  >
                    שאלה {s.question.label ?? s.question.number}
                    {s.label ? ` סעיף ${s.label}` : ""}
                  </Link>
                  {": "}
                  <MathText text={s.reviewNote!} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
