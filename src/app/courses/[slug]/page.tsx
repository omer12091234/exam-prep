import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { CourseTabs } from "@/components/CourseTabs";
import { ProgressBar } from "@/components/ProgressBar";
import { StatsRow } from "@/components/StatsRow";
import { MOED, SEMESTER, examTitle } from "@/lib/courses";
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
  const q = (one(sp.q) ?? "").trim();
  const user = await requireUser();
  const course = await db.course.findUnique({
    where: { slug },
    include: {
      _count: { select: { docs: true } },
      exams: {
        where: { published: true, kind: "EXAM" },
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
  const textHits = q ? await examsMentioning(course.id, q) : null;
  const words = norm(q).split(/\s+/).filter(Boolean);
  const exams = course.exams.filter((e) => {
    if (lecturer && e.lecturerId !== lecturer) return false;
    if (q) {
      const hay = norm(
        `${examTitle(e)} ${e.year} ${SEMESTER[e.semester]} ${MOED[e.moed] ?? ""} ${e.lecturer?.name ?? ""} ${ORIGIN[e.origin] ?? ""}`,
      );
      if (!words.every((w) => hay.includes(w)) && !textHits?.has(e.id))
        return false;
    }
    const c = stats.perExam.get(e.id) ?? emptyCounts();
    if (show === "left") return solved(c) < c.total;
    if (show === "done") return c.total > 0 && solved(c) === c.total;
    return true;
  });
  const href = (next: { lecturer?: string; show?: string }) => {
    const p = new URLSearchParams();
    const l = "lecturer" in next ? next.lecturer : lecturer;
    const s = "show" in next ? next.show : show;
    if (l) p.set("lecturer", l);
    if (s) p.set("show", s);
    if (q) p.set("q", q);
    const qs = p.toString();
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
      <CourseTabs slug={slug} active="exams" />

      <form
        action={`/courses/${slug}`}
        role="search"
        className="mb-3 flex gap-2"
      >
        {lecturer && <input type="hidden" name="lecturer" value={lecturer} />}
        {show && <input type="hidden" name="show" value={show} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="חיפוש מבחן: שנה, סמסטר, מועד, מרצה או מילה מהשאלות"
          aria-label="חיפוש מבחן"
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
        />
        <button className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white dark:bg-white dark:text-black">
          חיפוש
        </button>
        {q && (
          <Link
            href={`/courses/${slug}${lecturer || show ? "?" + new URLSearchParams({ ...(lecturer ? { lecturer } : {}), ...(show ? { show } : {}) }) : ""}`}
            className="self-center text-sm text-neutral-500 underline"
          >
            ניקוי
          </Link>
        )}
      </form>

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
      {q && exams.length > 0 && (
        <p className="mb-3 text-sm text-neutral-500">
          נמצאו {exams.length} מבחנים עבור „{q}”.
        </p>
      )}
      <div className="flex flex-col gap-6">
        {groupExams(exams).map(([year, semesters]) => (
          <section key={year}>
            <h2 className="mb-2 border-b border-neutral-200 pb-1 text-xl font-bold dark:border-neutral-800">
              {year || "ללא שנה"}
            </h2>
            <div className="flex flex-col gap-4 ps-2">
              {semesters.map(([sem, list]) => (
                <div key={sem}>
                  <h3 className="mb-2 font-semibold text-neutral-600 dark:text-neutral-400">
                    {SEMESTER[sem]}
                  </h3>
                  <ul className="flex flex-col gap-2 border-s-2 border-neutral-200 ps-3 dark:border-neutral-800">
                    {list.map((e) => (
                      <li key={e.id}>
                        <Link
                          href={`/exams/${e.id}`}
                          className="block rounded-xl border border-neutral-200 p-3 hover:border-neutral-400 dark:border-neutral-800"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="font-semibold">
                                {e.origin === "PRACTICE"
                                  ? "מבחן ניסיון"
                                  : (MOED[e.moed] ?? "")}
                                {e.origin === "RESTORED" && (
                                  <span className="ms-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-normal text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                                    שחזור
                                  </span>
                                )}
                                {e.lecturer && (
                                  <span className="ms-2 text-sm font-normal text-neutral-500">
                                    {e.lecturer.name}
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 text-xs text-neutral-500">
                                {examTitle(e)}
                              </div>
                            </div>
                            <div className="shrink-0 text-sm text-neutral-500">
                              {e._count.questions} שאלות
                              {e.hasSolution ? " · יש פתרון" : ""}
                            </div>
                          </div>
                          <div className="mt-2">
                            <ProgressBar
                              counts={stats.perExam.get(e.id) ?? emptyCounts()}
                            />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
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

const ORIGIN: Record<string, string> = {
  RESTORED: "שחזור",
  PRACTICE: "מבחן ניסיון",
  EXTERNAL: "",
  OFFICIAL: "",
};
const SEM_ORDER = { A: 0, B: 1, SUMMER: 2 } as const;

/** Hebrew-friendly comparison: no geresh/quotes, lower case. */
function norm(s: string) {
  return s.replace(/['"׳״`]/g, "").toLowerCase();
}

/** year (newest first) → semester (א, ב, קיץ) → exams by moed. */
function groupExams<
  E extends { year: number; semester: keyof typeof SEM_ORDER; moed: number },
>(exams: E[]) {
  const years = new Map<number, Map<keyof typeof SEM_ORDER, E[]>>();
  for (const e of exams) {
    const y = years.get(e.year) ?? new Map();
    years.set(e.year, y);
    y.set(e.semester, [...(y.get(e.semester) ?? []), e]);
  }
  return [...years.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(
      ([year, sems]) =>
        [
          year,
          [...sems.entries()]
            .sort((a, b) => SEM_ORDER[a[0]] - SEM_ORDER[b[0]])
            .map(([sem, list]) => [
              sem,
              list.sort((a, b) => a.moed - b.moed),
            ] as const),
        ] as const,
    );
}

/** Exams of the course whose question text mentions the phrase. */
async function examsMentioning(courseId: string, phrase: string) {
  const contains = { contains: phrase, mode: "insensitive" as const };
  const rows = await db.question.findMany({
    where: {
      exam: { courseId, kind: "EXAM" },
      OR: [
        { stemText: contains },
        { subQuestions: { some: { text: contains } } },
      ],
    },
    select: { examId: true },
    distinct: ["examId"],
  });
  return new Set(rows.map((r) => r.examId));
}
