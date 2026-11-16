import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GradingPoller, PrintButton } from "@/components/GradingLive";
import { requireUser } from "@/lib/auth";
import { examTitle } from "@/lib/courses";
import { db } from "@/lib/db";
import { olderThan } from "@/lib/format";
import { markdownHtml } from "@/lib/richtext";

export default function GradingPage({ params }: PageProps<"/gradings/[id]">) {
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <Suspense fallback={<p className="text-neutral-500">טוען…</p>}>
        <Grading params={params} />
      </Suspense>
    </main>
  );
}

/** A check that never reported back (the function was killed) is shown as failed after this. */
const STALE_MS = 6 * 60 * 1000;

async function Grading({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const g = await db.grading.findFirst({
    where: { id, userId: user.id },
    include: {
      exam: { include: { course: true } },
      question: { select: { number: true, label: true } },
    },
  });
  if (!g) notFound();
  const stale =
    g.status === "PENDING" && olderThan(g.createdAt, STALE_MS);
  const subject = g.question
    ? `שאלה ${g.question.label ?? g.question.number}`
    : "כל המבחן";

  return (
    <>
      <Link
        href={`/exams/${g.examId}`}
        className="no-print text-sm text-neutral-500 hover:underline"
      >
        ← {examTitle(g.exam)}
      </Link>
      <p className="mt-2 text-sm text-neutral-500">
        {g.exam.course.name} · {examTitle(g.exam)} · {subject} ·{" "}
        {g.createdAt.toLocaleDateString("he-IL")}
      </p>

      {g.status === "PENDING" && !stale && (
        <div
          className="mt-6 rounded-xl border border-blue-600 p-6"
          role="status"
        >
          <GradingPoller />
          <p className="font-semibold">הפתרון בבדיקה…</p>
          <p className="mt-1 text-sm text-neutral-500">
            זה לוקח בדרך כלל דקה עד כמה דקות. העמוד מתעדכן לבד, ואפשר גם לסגור
            אותו ולחזור אחר כך דרך &quot;בדיקות&quot;.
          </p>
        </div>
      )}
      {(g.status === "FAILED" || stale) && (
        <div className="mt-6 rounded-xl border border-red-600 p-6" role="alert">
          <p className="font-semibold">הבדיקה נכשלה</p>
          <p className="mt-1 text-sm">{g.error ?? "הבדיקה לא הסתיימה בזמן."}</p>
          <Link
            href={`/exams/${g.examId}/grade${g.questionId ? `?question=${g.questionId}` : ""}`}
            className="mt-3 inline-block underline"
          >
            שליחה מחדש
          </Link>
        </div>
      )}
      {g.status === "DONE" && g.reportMd && (
        <>
          <div className="no-print mt-4 mb-6 flex flex-wrap items-center gap-3 text-sm">
            {g.score != null && (
              <span className="rounded-lg bg-neutral-100 px-3 py-1.5 font-semibold dark:bg-neutral-900">
                ציון מוערך: {g.score} / {g.maxScore}
              </span>
            )}
            <PrintButton />
            <a
              href={`/gradings/${g.id}/download`}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              הורדת הדוח (Markdown)
            </a>
          </div>
          <article
            className="rich"
            dangerouslySetInnerHTML={{ __html: markdownHtml(g.reportMd) }}
          />
          <p className="mt-8 text-xs text-neutral-500">
            נבדק אוטומטית לפי סקיל הבדיקה של הקורס. הציון הוא הערכה לצורך תרגול
            בלבד. קבצים שנבדקו: {g.fileNames.join(", ")}
          </p>
        </>
      )}
    </>
  );
}
