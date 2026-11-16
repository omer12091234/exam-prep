import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { CourseTabs } from "@/components/CourseTabs";
import { ProgressBar } from "@/components/ProgressBar";
import { StatsRow } from "@/components/StatsRow";
import { examTitle } from "@/lib/courses";
import { courseStats, emptyCounts, solved } from "@/lib/progress";

export default function CoursePage({
  params,
  searchParams,
}: PageProps<"/courses/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-4xl p-6">
      <Suspense fallback={<p className="mt-4 text-neutral-500">טוען…</p>}>
        <Course params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Course({
  params,
  searchParams,
}: Pick<PageProps<"/courses/[slug]">, "params" | "searchParams">) {
  const { slug } = await params;
  const sp = await searchParams;
  const lecturer = one(sp.lecturer);
  const show = one(sp.show);
  const user = await requireUser();
  const course = await db.course.findUnique({
    where: { slug },
    include: {
      _count: { select: { docs: true } },
      exams: {
        where: { published: true },
        orderBy: [{ year: "desc" }, { semester: "asc" }, { moed: "asc" }],
        include: { lecturer: true, _count: { select: { questions: true } } },
      },
    },
  });
  if (!course) notFound();
  const stats = (await courseStats(user.id, [course.id])).get(course.id)!;

  const lecturers = [
    ...new Map(
      course.exams.flatMap((e) =>
        e.lecturer ? [[e.lecturer.id, e.lecturer.name] as const] : [],
      ),
    ).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1], "he"));
  const exams = course.exams.filter((e) => {
    if (lecturer && e.lecturerId !== lecturer) return false;
    const c = stats.perExam.get(e.id) ?? emptyCounts();
    if (show === "left") return solved(c) < c.total;
    if (show === "done") return c.total > 0 && solved(c) === c.total;
    return true;
  });
  const href = (next: { lecturer?: string; show?: string }) => {
    const q = new URLSearchParams();
    const l = "lecturer" in next ? next.lecturer : lecturer;
    const s = "show" in next ? next.show : show;
    if (l) q.set("lecturer", l);
    if (s) q.set("show", s);
    const qs = q.toString();
    return `/courses/${slug}${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <h1 className="mb-3 text-2xl font-bold">{course.name}</h1>
      <div className="mb-3">
        <StatsRow stats={stats} />
      </div>
      <div className="mb-6">
        <ProgressBar counts={stats.counts} />
      </div>
      <CourseTabs slug={slug} active="exams" hasDocs={course._count.docs > 0} />

      <div className="mb-4 flex flex-col gap-2 text-sm">
        <Filter label="הצגה">
          <Pill href={href({ show: undefined })} on={!show}>
            הכול
          </Pill>
          <Pill href={href({ show: "left" })} on={show === "left"}>
            נשארו
          </Pill>
          <Pill href={href({ show: "done" })} on={show === "done"}>
            בוצעו
          </Pill>
        </Filter>
        {lecturers.length > 1 && (
          <Filter label="מרצה">
            <Pill href={href({ lecturer: undefined })} on={!lecturer}>
              כולם
            </Pill>
            {lecturers.map(([id, name]) => (
              <Pill key={id} href={href({ lecturer: id })} on={lecturer === id}>
                {name}
              </Pill>
            ))}
          </Filter>
        )}
      </div>

      {exams.length === 0 && (
        <p className="text-neutral-500">אין מבחנים שמתאימים לסינון.</p>
      )}
      <ul className="flex flex-col gap-3">
        {exams.map((e) => (
          <li key={e.id}>
            <Link
              href={`/exams/${e.id}`}
              className="block rounded-xl border border-neutral-200 p-4 hover:border-neutral-400 dark:border-neutral-800"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="font-semibold">{examTitle(e)}</div>
                <div className="shrink-0 text-sm text-neutral-500">
                  {e._count.questions} שאלות{e.hasSolution ? " · יש פתרון" : ""}
                </div>
              </div>
              <div className="mt-3">
                <ProgressBar
                  counts={stats.perExam.get(e.id) ?? emptyCounts()}
                />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function Filter({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="me-1 text-neutral-500">{label}:</span>
      {children}
    </div>
  );
}

function Pill({
  href,
  on,
  children,
}: {
  href: string;
  on: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={on ? "true" : undefined}
      className={`rounded-full border px-3 py-1 ${on ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black" : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"}`}
    >
      {children}
    </Link>
  );
}
