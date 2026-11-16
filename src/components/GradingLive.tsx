"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** While a check is running, re-fetch the page every few seconds. */
export function GradingPoller() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [router]);
  return null;
}

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
    >
      הדפסה / שמירה כ-PDF
    </button>
  );
}
