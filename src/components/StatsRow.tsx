import type { CourseStats } from "@/lib/progress";

/** "מבחנים: בוצעו 3 · נשארו 35" + the same for questions, and for practice sheets if any. */
export function StatsRow({ stats }: { stats: CourseStats }) {
  const { exams, questions, sheets, sheetQuestions } = stats;
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
      {sheets.total > 0 && (
        <>
          <Stat
            title="דפי תרגול"
            done={sheets.done}
            left={sheets.total - sheets.done}
            partial={sheets.started - sheets.done}
          />
          <Stat
            title="שאלות בדפי התרגול"
            done={sheetQuestions.done}
            left={sheetQuestions.total - sheetQuestions.done}
            partial={sheetQuestions.started - sheetQuestions.done}
          />
        </>
      )}
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
