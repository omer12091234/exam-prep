import type { Counts } from "@/lib/progress";

/** Stacked bar: green = went fine, amber = struggled, grey = not solved yet. */
export function ProgressBar({ counts, label = true }: { counts: Counts; label?: boolean }) {
  const { ok, struggled, total } = counts;
  const pct = (n: number) => (total ? (n / total) * 100 : 0);
  const done = ok + struggled;
  return (
    <div>
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label="סעיפים שנפתרו"
      >
        <div className="bg-green-600" style={{ width: `${pct(ok)}%` }} />
        <div className="bg-amber-500" style={{ width: `${pct(struggled)}%` }} />
      </div>
      {label && (
        <div className="mt-1 flex flex-wrap gap-x-3 text-sm text-neutral-500">
          <span>
            נפתרו {done} מתוך {total}
          </span>
          {ok > 0 && <span className="text-green-700 dark:text-green-400">{ok} בסדר</span>}
          {struggled > 0 && <span className="text-amber-700 dark:text-amber-400">{struggled} התקשיתי</span>}
        </div>
      )}
    </div>
  );
}
