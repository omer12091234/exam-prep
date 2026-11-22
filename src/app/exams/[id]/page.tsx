import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ExamTimer } from "@/components/ExamTimer";
import { MathText } from "@/components/MathText";
import { ProgressBar } from "@/components/ProgressBar";
import { QuestionTimer } from "@/components/QuestionTimer";
import { RepeatNote, repeatsInclude } from "@/components/RepeatNote";
import { SubCard } from "@/components/SubCard";
import { examTitle } from "@/lib/courses";
import { countStatuses, solved, subStatuses } from "@/lib/progress";
import { markdownHtml } from "@/lib/richtext";
import type { ProgressStatus } from "@/generated/prisma/client";

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
          repeats: repeatsInclude,
          subQuestions: {
            orderBy: { order: "asc" },
            include: {
              images: true,
              comments: true,
              solutions: true,
              topics: {
                select: { topic: { select: { id: true, name: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!exam || !exam.published) notFound();

  const allSubIds = exam.questions.flatMap((q) =>
    q.subQuestions.map((s) => s.id),
  );
  const statuses = await subStatuses(user.id, allSubIds);
  const examCounts = countStatuses(allSubIds, statuses);
  const times = new Map(
    (
      await db.questionTime.findMany({
        where: {
          userId: user.id,
          questionId: { in: exam.questions.map((q) => q.id) },
        },
      })
    ).map((t) => [t.questionId, t.seconds]),
  );
  const attempts = await db.examAttempt.findMany({
    where: { userId: user.id, examId: id },
    orderBy: { startedAt: "desc" },
    take: 2,
  });
  const active = attempts.find((a) => !a.submittedAt) ?? null;
  const finished = attempts.find((a) => a.submittedAt) ?? null;
  const gradings = await db.grading.findMany({
    where: { userId: user.id, examId: id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      status: true,
      score: true,
      maxScore: true,
      createdAt: true,
      question: { select: { number: true, label: true } },
    },
  });

  return (
    <>
      <Link
        href={`/courses/${exam.course.slug}`}
        className="no-print text-sm text-neutral-500 hover:underline"
      >
        ← {exam.course.name}
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{examTitle(exam)}</h1>
      <p className="mb-4 flex flex-wrap gap-x-3 text-sm text-neutral-500">
        {exam.lecturer && <span>{exam.lecturer.name}</span>}
        {exam.durationMinutes ? (
          <span>{exam.durationMinutes / 60} שעות</span>
        ) : null}
        {exam.aidsNote && <span>{exam.aidsNote}</span>}
        {exam.sourceUrl && (
          <a
            href={exam.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            השאלון המקורי בדרייב{exam.hasSolution ? " (כולל פתרון)" : ""}
          </a>
        )}
      </p>
      <div className="mb-4">
        <ProgressBar counts={examCounts} />
      </div>

      <ExamTimer
        examId={exam.id}
        defaultMinutes={exam.durationMinutes ?? 180}
        active={
          active && {
            id: active.id,
            startedAt: active.startedAt.toISOString(),
            endsAt: active.endsAt?.toISOString() ?? null,
          }
        }
        last={
          finished && {
            seconds:
              (finished.submittedAt!.getTime() - finished.startedAt.getTime()) /
              1000,
            minutesAllowed: finished.endsAt
              ? Math.round(
                  (finished.endsAt.getTime() - finished.startedAt.getTime()) /
                    60_000,
                )
              : null,
          }
        }
      />

      <div className="no-print mb-8 flex flex-wrap items-center gap-3 text-sm">
        <Link
          href={`/exams/${exam.id}/grade`}
          className="rounded-lg bg-neutral-900 px-3 py-1.5 text-white dark:bg-white dark:text-black"
        >
          שליחת המבחן לבדיקה
        </Link>
        {gradings.map((g) => (
          <Link key={g.id} href={`/gradings/${g.id}`} className="underline">
            {g.question
              ? `בדיקת שאלה ${g.question.label ?? g.question.number}`
              : "בדיקת המבחן"}
            {g.status === "DONE" && g.score != null
              ? ` (${g.score}/${g.maxScore})`
              : g.status === "PENDING"
                ? " (בבדיקה…)"
                : g.status === "FAILED"
                  ? " (נכשלה)"
                  : ""}
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-10">
        {exam.questions.map((q) => (
          <section key={q.id} id={`q${q.number}`} className="scroll-mt-24">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">
                שאלה {q.label ?? q.number}
                {q.points ? (
                  <span className="ms-2 text-base font-normal text-neutral-500">
                    ({q.points} נקודות)
                  </span>
                ) : null}
              </h2>
              <QuestionSummary
                subIds={q.subQuestions.map((s) => s.id)}
                statuses={statuses}
              />
            </div>
            <RepeatNote repeats={q.repeats} />
            <div className="no-print mb-3 flex flex-wrap items-center gap-3">
              <QuestionTimer
                questionId={q.id}
                initialSeconds={times.get(q.id) ?? 0}
              />
              <Link
                href={`/exams/${exam.id}/grade?question=${q.id}`}
                className="text-sm underline"
              >
                שליחת השאלה לבדיקה
              </Link>
            </div>
            {q.stemText && (
              <p className="mb-3 leading-8">
                <MathText text={q.stemText} />
              </p>
            )}
            {q.images.map((img) => (
              <Crop
                key={img.id}
                src={img.path}
                alt={`שאלה ${q.number} – ${img.role === "FIGURE" ? "שרטוט" : "גוף השאלה"}`}
              />
            ))}

            <ol className="mt-4 flex flex-col gap-4">
              {q.subQuestions.map((s) => (
                <SubCard
                  key={s.id}
                  sub={s}
                  status={statuses.get(s.id) ?? "NOT_SOLVED"}
                  topics={s.topics.map((t) => t.topic)}
                >
                  {s.images.length > 0 && (
                    <details className="mt-2" open>
                      <summary className="cursor-pointer text-sm text-neutral-500">
                        תמונה מהמבחן
                      </summary>
                      {s.images.map((img) => (
                        <Crop
                          key={img.id}
                          src={img.path}
                          alt={`סעיף ${s.label} – תמונה מהמבחן`}
                        />
                      ))}
                    </details>
                  )}
                  {s.solutions.map((sol) => (
                    <details
                      key={sol.id}
                      className="mt-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                    >
                      <summary className="cursor-pointer text-sm font-medium text-blue-700 dark:text-blue-400">
                        {sol.author === "AI"
                          ? "פתרון מלא עם הסברים (נכתב על ידי Claude, לא פתרון רשמי)"
                          : "פתרון"}
                      </summary>
                      <div
                        className="rich mt-2"
                        dangerouslySetInnerHTML={{
                          __html: markdownHtml(sol.contentMd),
                        }}
                      />
                    </details>
                  ))}
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
                          {c.pointsLost
                            ? ` (−${c.pointsLost} מתוך ${c.maxPoints})`
                            : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </SubCard>
              ))}
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
function QuestionSummary({
  subIds,
  statuses,
}: {
  subIds: string[];
  statuses: Map<string, ProgressStatus>;
}) {
  const c = countStatuses(subIds, statuses);
  return (
    <span className="text-sm text-neutral-500">
      {solved(c)}/{c.total} סעיפים
      {c.struggled > 0 && (
        <span className="ms-2 text-amber-700 dark:text-amber-400">
          {c.struggled} התקשיתי
        </span>
      )}
      {c.failed > 0 && (
        <span className="ms-2 text-red-700 dark:text-red-400">
          {c.failed} לא הצלחתי
        </span>
      )}
    </span>
  );
}
