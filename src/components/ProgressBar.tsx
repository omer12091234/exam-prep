import { solved, type Counts } from "@/lib/progress";

/** Stacked bar: green = went fine, amber = struggled, red = did not manage, grey = not solved yet. */
export function ProgressBar({
  counts,
  label = true,
}: {
  counts: Counts;
  label?: boolean;
}) {
  const { ok, struggled, failed, total } = counts;
  const pct = (n: number) => (total ? (n / total) * 100 : 0);
  const done = solved(counts);
  return (
    <div>
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label="סעיפים שבוצעו"
      >
        <div className="bg-green-600" style={{ width: `${pct(ok)}%` }} />
        <div className="bg-amber-500" style={{ width: `${pct(struggled)}%` }} />
        <div className="bg-red-600" style={{ width: `${pct(failed)}%` }} />
      </div>
      {label && (
        <div className="mt-1 flex flex-wrap gap-x-3 text-sm text-neutral-500">
          <span>
            בוצעו {done} מתוך {total} סעיפים
          </span>
          {ok > 0 && (
            <span className="text-green-700 dark:text-green-400">
              {ok} הצלחתי
            </span>
          )}
          {struggled > 0 && (
            <span className="text-amber-700 dark:text-amber-400">
              {struggled} התקשיתי
            </span>
          )}
          {failed > 0 && (
            <span className="text-red-700 dark:text-red-400">
              {failed} לא הצלחתי
            </span>
          )}
        </div>
      )}
    </div>
  );
}
