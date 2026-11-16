"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setSubStatus, type SubStatus } from "@/app/actions/progress";

const OPTIONS: { value: SubStatus; label: string; on: string }[] = [
  {
    value: "NOT_SOLVED",
    label: "לא נפתר",
    on: "bg-neutral-700 text-white dark:bg-neutral-200 dark:text-black",
  },
  { value: "OK", label: "הצלחתי", on: "bg-green-600 text-white" },
  { value: "STRUGGLED", label: "התקשיתי", on: "bg-amber-500 text-black" },
  { value: "FAILED", label: "לא הצלחתי", on: "bg-red-600 text-white" },
];

export function StatusPicker({
  subQuestionId,
  status,
  label,
}: {
  subQuestionId: string;
  status: SubStatus;
  label: string;
}) {
  const [optimistic, setOptimistic] = useOptimistic(status);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  function choose(value: SubStatus) {
    if (value === optimistic) return;
    setError(false);
    startTransition(async () => {
      setOptimistic(value);
      try {
        await setSubStatus(subQuestionId, value);
      } catch {
        // The optimistic value rolls back on its own; say so instead of failing silently.
        setError(true);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="radiogroup"
        aria-label={`סטטוס סעיף ${label}`}
        className="inline-flex flex-wrap overflow-hidden rounded-lg border border-neutral-300 text-sm dark:border-neutral-700"
        aria-busy={pending}
      >
        {OPTIONS.map((o) => {
          const active = o.value === optimistic;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(o.value)}
              className={`px-3 py-1.5 transition-colors ${active ? o.on : "hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {error && (
        <span role="alert" className="text-sm text-red-600">
          השמירה נכשלה, נסו שוב
        </span>
      )}
    </div>
  );
}
