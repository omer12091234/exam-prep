import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GradeForm } from "@/components/GradeForm";
import { requireUser } from "@/lib/auth";
import { examTitle } from "@/lib/courses";
import { db } from "@/lib/db";
import { gradingConfigured } from "@/lib/grading";

export default function GradePage({
  params,
  searchParams,
}: PageProps<"/exams/[id]/grade">) {
  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <Suspense fallback={<p className="text-neutral-500">טוען…</p>}>
        <Grade params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Grade({
  params,
  searchParams,
}: Pick<PageProps<"/exams/[id]/grade">, "params" | "searchParams">) {
  const { id } = await params;
  const q = (await searchParams).question;
  const questionId = Array.isArray(q) ? q[0] : q;
  await requireUser();
  const exam = await db.exam.findFirst({
    where: { id, published: true },
    include: {
      course: true,
      questions: {
        where: { id: questionId ?? "" },
        select: { id: true, number: true, label: true },
      },
    },
  });
  if (!exam || (questionId && exam.questions.length === 0)) notFound();
  const question = exam.questions.at(0);
  const enabled = gradingConfigured();

  return (
    <>
      <Link
        href={`/exams/${exam.id}`}
        className="text-sm text-neutral-500 hover:underline"
      >
        ← {examTitle(exam)}
      </Link>
      <h1 className="mt-2 mb-2 text-2xl font-bold">
        שליחה לבדיקה
        {question
          ? ` – שאלה ${question.label ?? question.number}`
          : " – כל המבחן"}
      </h1>
      <p className="mb-6 leading-7 text-neutral-600 dark:text-neutral-300">
        מעלים את הפתרון, והוא נבדק לפי סקיל הבדיקה של הקורס {exam.course.name}.
        בסוף מתקבל דוח בדיקה: ניקוד לכל סעיף, הערות, מה לתקן ולשפר, וטיפים
        שהתפספסו. הבדיקה לוקחת בדרך כלל דקה עד כמה דקות. הציון הוא הערכה לתרגול
        ולא ציון רשמי.
        {exam.sourceUrl &&
          " אם אפשר, צרפו גם את השאלון – במערכת יש לרוב רק תיאור מקוצר של השאלות."}
      </p>
      {!enabled && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-amber-400 p-3 text-sm"
        >
          הבדיקה האוטומטית עוד לא הופעלה: מנהל האתר צריך להגדיר את המשתנה
          ANTHROPIC_API_KEY.
        </p>
      )}
      <GradeForm examId={exam.id} questionId={question?.id} enabled={enabled} />
    </>
  );
}
