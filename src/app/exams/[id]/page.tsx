import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { MathText } from "@/components/MathText";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusPicker } from "@/components/StatusPicker";
import { countStatuses, solved, subStatuses } from "@/lib/progress";
import type { ProgressStatus } from "@/generated/prisma/client";

const MOED = ["", "מועד א'", "מועד ב'", "מועד ג'"];

const STRIPE = {
  NOT_SOLVED: "border-s-neutral-300 dark:border-s-neutral-700",
  OK: "border-s-green-600",
  STRUGGLED: "border-s-amber-500",
} as const;

export default function ExamPage({ params }: PageProps<"/exams/[id]">) {
  return (
    <main className="mx-auto w-full max-w-4xl p-6">
      <Suspense fallback={<p className="text-neutral-500">טוען…</p>}>
        <Exam params={params} />
      </Suspense>
    </main>
  );
}

async function Exam({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const exam = await db.exam.findUnique({
    where: { id },
    include: {
      course: true,
      lecturer: true,
      questions: {
        orderBy: { number: "asc" },
        include: {
          images: { orderBy: { order: "asc" } },
          subQuestions: {
            orderBy: { order: "asc" },
            include: { images: true, comments: true },
          },
        },
      },
    },
  });
  if (!exam || !exam.published) notFound();

  const allSubIds = exam.questions.flatMap((q) => q.subQuestions.map((s) => s.id));
  const statuses = await subStatuses(user.id, allSubIds);
  const examCounts = countStatuses(allSubIds, statuses);

  return (
    <>
      <Link href={`/courses/${exam.course.slug}`} className="text-sm text-neutral-500 hover:underline">
        ← {exam.course.name}
      </Link>
      <h1 className="mt-2 text-2xl font-bold">
        {exam.year} · {MOED[exam.moed]}
      </h1>
      <p className="mb-4 text-sm text-neutral-500">
        {exam.lecturer?.name}
        {exam.durationMinutes ? ` · ${exam.durationMinutes / 60} שעות` : ""}
        {exam.aidsNote ? ` · ${exam.aidsNote}` : ""}
      </p>
      <div className="mb-8">
        <ProgressBar counts={examCounts} />
      </div>

      <div className="flex flex-col gap-10">
        {exam.questions.map((q) => (
          <section key={q.id} id={`q${q.number}`}>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-semibold">
                שאלה {q.number}
                {q.points ? (
                  <span className="ms-2 text-base font-normal text-neutral-500">({q.points} נקודות)</span>
                ) : null}
              </h2>
              <QuestionSummary subIds={q.subQuestions.map((s) => s.id)} statuses={statuses} />
            </div>
            <p className="mb-3 leading-8">
              <MathText text={q.stemText} />
            </p>
            {q.images.map((img) => (
              <Crop
                key={img.id}
                src={img.path}
                alt={`שאלה ${q.number} – ${img.role === "FIGURE" ? "שרטוט" : "גוף השאלה"}`}
              />
            ))}

            <ol className="mt-4 flex flex-col gap-4">
              {q.subQuestions.map((s) => {
                const st = statuses.get(s.id) ?? "NOT_SOLVED";
                return (
                  <li
                    key={s.id}
                    className={`rounded-xl border border-s-4 border-neutral-200 p-4 dark:border-neutral-800 ${STRIPE[st]}`}
                  >
                    <div className="leading-8">
                      <span className="me-2 font-semibold">{s.label}.</span>
                      {s.points ? <span className="me-2 text-neutral-500">[{s.points}%]</span> : null}
                      <MathText text={s.text} />
                    </div>
                    <div className="mt-3">
                      <StatusPicker subQuestionId={s.id} status={st} label={s.label} />
                    </div>
                    {s.images.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-neutral-500">תמונה מהמבחן</summary>
                        {s.images.map((img) => (
                          <Crop key={img.id} src={img.path} alt={`סעיף ${s.label} – תמונה מהמבחן`} />
                        ))}
                      </details>
                    )}
                    {s.comments.length > 0 && (
                      <ul className="mt-3 flex flex-col gap-1 text-sm">
                        {s.comments.map((c) => (
                          <li
                            key={c.id}
                            className={
                              c.kind === "PRAISE"
                                ? "text-green-700 dark:text-green-400"
                                : "text-amber-700 dark:text-amber-400"
                            }
                          >
                            הערת בודק: {c.text}
                            {c.pointsLost ? ` (−${c.pointsLost} מתוך ${c.maxPoints})` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </>
  );
}

function Crop({ src, alt }: { src: string; alt: string }) {
  return (
    // Crops have arbitrary sizes and come from storage; plain img keeps it simple.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="my-2 w-full rounded-lg border border-neutral-200 bg-white dark:border-neutral-800"
    />
  );
}

/** "3/8 · 1 התקשיתי" next to each question title. */
function QuestionSummary({ subIds, statuses }: { subIds: string[]; statuses: Map<string, ProgressStatus> }) {
  const c = countStatuses(subIds, statuses);
  return (
    <span className="text-sm text-neutral-500">
      {solved(c)}/{c.total} סעיפים
      {c.struggled > 0 && <span className="ms-2 text-amber-700 dark:text-amber-400">{c.struggled} התקשיתי</span>}
    </span>
  );
}
