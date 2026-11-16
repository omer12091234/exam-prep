"use client";

import { useEffect, useState, useTransition } from "react";
import { finishAttempt, startAttempt } from "@/app/actions/progress";
import { formatDuration } from "@/lib/format";

type Attempt = { id: string; startedAt: string; endsAt: string | null };
type Last = { seconds: number; minutesAllowed: number | null };

/**
 * Countdown for a timed run of the whole exam. The start and end times live on the server,
 * so the clock survives a reload and continues on another device.
 */
export function ExamTimer({
  examId,
  defaultMinutes,
  active,
  last,
}: {
  examId: string;
  defaultMinutes: number;
  active: Attempt | null;
  last: Last | null;
}) {
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [now, setNow] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!active) return;
    const update = () => setNow(Date.now());
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [active]);

  const run = (fn: () => Promise<void>) => {
    setError(false);
    startTransition(async () => {
      try {
        await fn();
      } catch {
        setError(true);
      }
    });
  };

  if (active) {
    const end = active.endsAt ? new Date(active.endsAt).getTime() : null;
    const left = end && now ? Math.round((end - now) / 1000) : null;
    const over = left !== null && left <= 0;
    return (
      <div
        className={`no-print sticky top-0 z-10 -mx-2 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${over ? "border-red-600 bg-red-50 dark:bg-red-950" : "border-blue-600 bg-blue-50 dark:bg-blue-950"}`}
      >
        <div className="flex items-baseline gap-3">
          <span className="font-semibold">
            {over ? "הזמן נגמר" : "מבחן בזמן"}
          </span>
          <span
            dir="ltr"
            className="text-2xl font-bold tabular-nums"
            role="timer"
            aria-label="זמן שנותר"
          >
            {left === null
              ? "…"
              : over
                ? `+${formatDuration(-left)}`
                : formatDuration(left)}
          </span>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => finishAttempt(active.id))}
          className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          סיימתי
        </button>
        {error && (
          <span role="alert" className="text-sm text-red-600">
            הפעולה נכשלה, נסו שוב
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="no-print mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 text-sm dark:border-neutral-800">
      <label className="flex items-center gap-2">
        <span>מבחן בזמן:</span>
        <input
          type="number"
          min={1}
          max={600}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="w-20 rounded-lg border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
          aria-label="משך המבחן בדקות"
        />
        <span>דקות</span>
      </label>
      <button
        type="button"
        disabled={pending || !(minutes >= 1 && minutes <= 600)}
        onClick={() => run(() => startAttempt(examId, minutes))}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-white disabled:opacity-50"
      >
        התחל טיימר למבחן
      </button>
      {last && (
        <span className="text-neutral-500">
          בפעם הקודמת: <span dir="ltr">{formatDuration(last.seconds)}</span>
          {last.minutesAllowed ? ` מתוך ${last.minutesAllowed} דקות` : ""}
        </span>
      )}
      {error && (
        <span role="alert" className="text-red-600">
          הפעולה נכשלה, נסו שוב
        </span>
      )}
    </div>
  );
}
