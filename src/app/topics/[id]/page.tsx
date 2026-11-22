import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { MathText } from "@/components/MathText";
import { ProgressBar } from "@/components/ProgressBar";
import { QuestionTimer } from "@/components/QuestionTimer";
import { RepeatNote, repeatsInclude } from "@/components/RepeatNote";
import { Chip, SubCard } from "@/components/SubCard";
import { PartExtras, QuestionStem } from "@/components/ExamParts";
import { examTitle } from "@/lib/courses";
import { DIFFICULTY, difficultyLabel } from "@/lib/format";
import { countStatuses, subStatuses } from "@/lib/progress";
import { richHtml } from "@/lib/richtext";

export default function TopicPage({
  params,
  searchParams,
}: PageProps<"/topics/[id]">) {
  return (
    <main className="mx-auto w-full max-w-4xl p-6">
      <Suspense fallback={<p className="text-neutral-500">טוען…</p>}>
        <Topic params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Topic({
  params,
  searchParams,
}: Pick<PageProps<"/topics/[id]">, "params" | "searchParams">) {
  const { id } = await params;
  const sp = await searchParams;
  const level = Number(one(sp.level)) || 0;
  const show = one(sp.show);
  const user = await requireUser();
  const topic = await db.topic.findUnique({
    where: { id },
    include: {
      course: true,
      practice: { orderBy: [{ difficulty: "asc" }, { order: "asc" }] },
      subQuestions: {
        where: { subQuestion: { question: { exam: { published: true } } } },
        select: {
          subQuestion: {
            select: {
              id: true,
              label: true,
              text: true,
              textHe: true,
              reviewNote: true,
              points: true,
              difficulty: true,
              order: true,
              images: true,
              solutions: true,
              comments: true,
              question: {
                select: {
                  id: true,
                  number: true,
                  label: true,
                  stemText: true,
                  stemTextHe: true,
                  images: { orderBy: { order: "asc" } },
                  repeats: repeatsInclude,
                  exam: {
                    select: {
                      id: true,
                      title: true,
                      year: true,
                      semester: true,
                      moed: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!topic) notFound();

  const all = topic.subQuestions.map((s) => s.subQuestion);
  const statuses = await subStatuses(
    user.id,
    all.map((s) => s.id),
  );
  const subs = all.filter((s) => {
    if (level && Math.round(s.difficulty ?? 0) !== level) return false;
    const st = statuses.get(s.id) ?? "NOT_SOLVED";
    if (show === "left") return st === "NOT_SOLVED";
    if (show === "again") return st === "STRUGGLED" || st === "FAILED";
    return true;
  });

  // Parts of the same question stay together (one stopwatch per question);
  // questions are ordered from easy to hard, newest exam first within a level.
  const groups = new Map<
    string,
    { q: (typeof all)[number]["question"]; subs: typeof all }
  >();
  for (const s of subs) {
    const g = groups.get(s.question.id) ?? { q: s.question, subs: [] };
    g.subs.push(s);
    groups.set(s.question.id, g);
  }
  const level0 = (g: { subs: typeof all }) =>
    Math.min(...g.subs.map((s) => s.difficulty ?? 2));
  const ordered = [...groups.values()].sort(
    (a, b) => level0(a) - level0(b) || b.q.exam.year - a.q.exam.year,
  );
  for (const g of ordered) g.subs.sort((a, b) => a.order - b.order);
  const times = new Map(
    (
      await db.questionTime.findMany({
        where: {
          userId: user.id,
          questionId: { in: ordered.map((g) => g.q.id) },
        },
      })
    ).map((t) => [t.questionId, t.seconds]),
  );

  const href = (next: { level?: number; show?: string }) => {
    const q = new URLSearchParams();
    const l = "level" in next ? next.level : level;
    const s = "show" in next ? next.show : show;
    if (l) q.set("level", String(l));
    if (s) q.set("show", s);
    const qs = q.toString();
    return `/topics/${id}${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <Link
        href={`/courses/${topic.course.slug}/topics`}
        className="text-sm text-neutral-500 hover:underline"
      >
        ← {topic.course.name} · נושאים
      </Link>
      <h1 className="mt-2 mb-3 text-2xl font-bold">{topic.name}</h1>
      <div className="mb-6">
        <ProgressBar
          counts={countStatuses(
            all.map((s) => s.id),
            statuses,
          )}
        />
      </div>

      {topic.summaryHtml && (
        <details className="mb-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <summary className="cursor-pointer font-semibold">
            סיכום הנושא
          </summary>
          <div
            className="rich mt-3"
            dangerouslySetInnerHTML={{ __html: richHtml(topic.summaryHtml) }}
          />
        </details>
      )}
      {topic.formulas.length > 0 && (
        <details className="mb-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <summary className="cursor-pointer font-semibold">
            נוסחאות ({topic.formulas.length})
          </summary>
          <ul className="mt-3 flex flex-col gap-1">
            {topic.formulas.map((f, i) => (
              <li key={i}>
                <MathText text={`\\[${f}\\]`} />
              </li>
            ))}
          </ul>
        </details>
      )}
      {topic.pitfalls.length > 0 && (
        <details className="mb-6 rounded-xl border border-amber-300 p-4 dark:border-amber-800">
          <summary className="cursor-pointer font-semibold">
            טעויות נפוצות ({topic.pitfalls.length})
          </summary>
          <ul className="mt-3 flex list-disc flex-col gap-2 ps-5 leading-8">
            {topic.pitfalls.map((p, i) => (
              <li key={i}>
                <MathText text={p} />
              </li>
            ))}
          </ul>
        </details>
      )}

      <h2 className="mt-8 mb-3 text-xl font-semibold">
        שאלות ממבחנים בנושא ({all.length} סעיפים)
      </h2>
      <div className="no-print mb-4 flex flex-col gap-2 text-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="me-1 text-neutral-500">קושי:</span>
          <Pill href={href({ level: 0 })} on={!level}>
            הכול
          </Pill>
          {[1, 2, 3].map((l) => (
            <Pill key={l} href={href({ level: l })} on={level === l}>
              {DIFFICULTY[l]}
            </Pill>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="me-1 text-neutral-500">הצגה:</span>
          <Pill href={href({ show: undefined })} on={!show}>
            הכול
          </Pill>
          <Pill href={href({ show: "left" })} on={show === "left"}>
            עוד לא נפתרו
          </Pill>
          <Pill href={href({ show: "again" })} on={show === "again"}>
            לחזור עליהן
          </Pill>
        </div>
      </div>

      {ordered.length === 0 && (
        <p className="text-neutral-500">אין שאלות שמתאימות לסינון.</p>
      )}
      <div className="flex flex-col gap-6">
        {ordered.map((g) => (
          <section key={g.q.id}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm">
                <Link
                  href={`/exams/${g.q.exam.id}#q${g.q.number}`}
                  className="font-semibold hover:underline"
                >
                  {examTitle(g.q.exam)}
                </Link>
                <span className="text-neutral-500">
                  {" "}
                  · שאלה {g.q.label ?? g.q.number}
                </span>
              </h3>
              <QuestionTimer
                questionId={g.q.id}
                initialSeconds={times.get(g.q.id) ?? 0}
              />
            </div>
            <RepeatNote repeats={g.q.repeats} />
            <QuestionStem
              number={g.q.number}
              stemText={g.q.stemText}
              stemTextHe={g.q.stemTextHe}
              images={g.q.images}
            />
            <ol className="mt-3 flex flex-col gap-3">
              {g.subs.map((s) => (
                <SubCard
                  key={s.id}
                  sub={s}
                  status={statuses.get(s.id) ?? "NOT_SOLVED"}
                >
                  <PartExtras
                    label={s.label}
                    images={s.images}
                    solutions={s.solutions}
                    comments={s.comments}
                  />
                </SubCard>
              ))}
            </ol>
          </section>
        ))}
      </div>

      {topic.practice.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-1 text-xl font-semibold">
            שאלות תרגול נוספות ({topic.practice.length})
          </h2>
          <p className="mb-4 text-sm text-neutral-500">
            שאלות שנכתבו לתרגול הנושא, עם רמז ופתרון. הן לא נספרות בהתקדמות.
          </p>
          <ol className="flex flex-col gap-3">
            {topic.practice.map((p, i) => (
              <li
                key={p.id}
                className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
              >
                <div className="mb-1 flex items-center gap-2 text-sm text-neutral-500">
                  <span>תרגול {i + 1}</span>
                  {difficultyLabel(p.difficulty) && (
                    <Chip>{difficultyLabel(p.difficulty)}</Chip>
                  )}
                </div>
                <div className="leading-8">
                  <MathText text={p.question} />
                </div>
                {p.hint && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-blue-700 dark:text-blue-400">
                      רמז
                    </summary>
                    <div className="mt-1 leading-8">
                      <MathText text={p.hint} />
                    </div>
                  </details>
                )}
                {p.solution && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-blue-700 dark:text-blue-400">
                      פתרון
                    </summary>
                    <div className="mt-1 leading-8">
                      <MathText text={p.solution} />
                    </div>
                  </details>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
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
