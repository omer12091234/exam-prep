import type { CourseStats } from "@/lib/progress";

/** "מבחנים: בוצעו 3 · נשארו 35" + the same for questions. */
export function StatsRow({ stats }: { stats: CourseStats }) {
  const { exams, questions } = stats;
  return (
    <dl className="grid grid-cols-2 gap-3 text-sm">
      <Stat
        title="מבחנים"
        done={exams.done}
        left={exams.total - exams.done}
        partial={exams.started - exams.done}
      />
      <Stat
        title="שאלות"
        done={questions.done}
        left={questions.total - questions.done}
        partial={questions.started - questions.done}
      />
    </dl>
  );
}

function Stat({
  title,
  done,
  left,
  partial,
}: {
  title: string;
  done: number;
  left: number;
  partial: number;
}) {
  return (
    <div className="rounded-lg bg-neutral-100 px-3 py-2 dark:bg-neutral-900">
      <dt className="text-neutral-500">{title}</dt>
      <dd>
        <span className="font-semibold text-green-700 dark:text-green-400">
          {done}
        </span>{" "}
        בוצעו · <span className="font-semibold">{left}</span> נשארו
        {partial > 0 && (
          <span className="text-neutral-500"> ({partial} בתהליך)</span>
        )}
      </dd>
    </div>
  );
}
