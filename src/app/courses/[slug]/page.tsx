import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const SEMESTER = { A: "סמסטר א'", B: "סמסטר ב'", SUMMER: "קיץ" } as const;
const MOED = ["", "מועד א'", "מועד ב'", "מועד ג'"];

export default function CoursePage({ params }: PageProps<"/courses/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-4xl p-6">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">← כל הקורסים</Link>
      <Suspense fallback={<p className="mt-4 text-neutral-500">טוען…</p>}>
        <Course params={params} />
      </Suspense>
    </main>
  );
}

async function Course({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireUser();
  const course = await db.course.findUnique({
    where: { slug },
    include: {
      exams: {
        where: { published: true },
        orderBy: [{ year: "desc" }, { semester: "asc" }, { moed: "asc" }],
        include: { lecturer: true, _count: { select: { questions: true } } },
      },
    },
  });
  if (!course) notFound();

  return (
    <>
      <h1 className="mt-2 mb-6 text-2xl font-bold">{course.name}</h1>
      <ul className="flex flex-col gap-3">
        {course.exams.map((e) => (
          <li key={e.id}>
            <Link
              href={`/exams/${e.id}`}
              className="flex items-center justify-between rounded-xl border border-neutral-200 p-4 hover:border-neutral-400 dark:border-neutral-800"
            >
              <div>
                <div className="font-semibold">
                  {e.year} · {SEMESTER[e.semester]} · {MOED[e.moed]}
                </div>
                <div className="text-sm text-neutral-500">{e.lecturer?.name ?? "מרצה לא ידוע"}</div>
              </div>
              <div className="text-sm text-neutral-500">
                {e._count.questions} שאלות{e.durationMinutes ? ` · ${e.durationMinutes / 60} שעות` : ""}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
