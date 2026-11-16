"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { addQuestionTime } from "@/app/actions/progress";
import { formatDuration } from "@/lib/format";

const START_EVENT = "question-timer-start";

/**
 * Stopwatch for one question. The total is kept on the server; the running part is sent when
 * the timer is paused, every 30 seconds, and when the tab is hidden or closed.
 * Starting one timer pauses the others on the page.
 */
export function QuestionTimer({
  questionId,
  initialSeconds,
}: {
  questionId: string;
  initialSeconds: number;
}) {
  const [saved, setSaved] = useState(initialSeconds);
  // Start of the running stretch. The ref is the source of truth (readable in cleanups);
  // the state mirrors it for rendering.
  const startRef = useRef<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [failed, setFailed] = useState(false);
  const running = startedAt !== null;

  /** Sends the running stretch to the server; `restart` keeps the timer going from now. */
  const commit = useCallback(
    (restart: boolean) => {
      const start = startRef.current;
      if (start === null) return;
      const t = Date.now();
      const delta = Math.round((t - start) / 1000);
      startRef.current = restart ? t : null;
      setStartedAt(startRef.current);
      setNow(t);
      if (delta <= 0) return;
      setSaved((s) => s + delta);
      addQuestionTime(questionId, delta).then(
        () => setFailed(false),
        () => setFailed(true),
      );
    },
    [questionId],
  );

  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const save = setInterval(() => commit(true), 30_000);
    const onHide = () => {
      if (document.visibilityState === "hidden") commit(true);
    };
    const onOther = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== questionId) commit(false);
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener(START_EVENT, onOther);
    return () => {
      clearInterval(tick);
      clearInterval(save);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener(START_EVENT, onOther);
    };
  }, [running, questionId, commit]);

  // Leaving the page with the timer running still counts the time.
  useEffect(() => () => commit(false), [commit]);

  function toggle() {
    if (running) return commit(false);
    window.dispatchEvent(new CustomEvent(START_EVENT, { detail: questionId }));
    const t = Date.now();
    startRef.current = t;
    setStartedAt(t);
    setNow(t);
  }

  const live =
    startedAt !== null ? Math.max(0, Math.round((now - startedAt) / 1000)) : 0;
  return (
    <span className="no-print inline-flex items-center gap-2 text-sm">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={running}
        className={`rounded-lg border px-2.5 py-1 ${running ? "border-blue-600 bg-blue-600 text-white" : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"}`}
      >
        {running ? "עצור טיימר" : saved > 0 ? "המשך טיימר" : "טיימר לשאלה"}
      </button>
      {(running || saved > 0) && (
        <span
          dir="ltr"
          className="tabular-nums text-neutral-600 dark:text-neutral-300"
          aria-label="זמן על השאלה"
        >
          {formatDuration(saved + live)}
        </span>
      )}
      {failed && (
        <span role="alert" className="text-red-600">
          הזמן לא נשמר
        </span>
      )}
    </span>
  );
}
