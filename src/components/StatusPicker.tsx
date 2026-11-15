"use client";

import { useOptimistic, useTransition } from "react";
import { setSubStatus, type SubStatus } from "@/app/actions/progress";

const OPTIONS: { value: SubStatus; label: string; on: string }[] = [
  { value: "NOT_SOLVED", label: "לא נפתר", on: "bg-neutral-700 text-white dark:bg-neutral-200 dark:text-black" },
  { value: "OK", label: "עבר בסדר", on: "bg-green-600 text-white" },
  { value: "STRUGGLED", label: "התקשיתי", on: "bg-amber-500 text-black" },
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

  function choose(value: SubStatus) {
    if (value === optimistic) return;
    startTransition(async () => {
      setOptimistic(value);
      await setSubStatus(subQuestionId, value);
    });
  }

  return (
    <div
      role="radiogroup"
      aria-label={`סטטוס סעיף ${label}`}
      className="inline-flex overflow-hidden rounded-lg border border-neutral-300 text-sm dark:border-neutral-700"
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
  );
}
