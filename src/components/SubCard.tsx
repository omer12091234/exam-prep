import type { ReactNode } from "react";
import { MathText } from "@/components/MathText";
import { StatusPicker } from "@/components/StatusPicker";
import { difficultyLabel } from "@/lib/format";
import type { ProgressStatus } from "@/generated/prisma/client";

const STRIPE = {
  NOT_SOLVED: "border-s-neutral-300 dark:border-s-neutral-700",
  OK: "border-s-green-600",
  STRUGGLED: "border-s-amber-500",
  FAILED: "border-s-red-600",
} as const;

const DIFF_STYLE = [
  "",
  "text-green-700 dark:text-green-400",
  "text-amber-700 dark:text-amber-400",
  "text-red-700 dark:text-red-400",
];

export function Chip({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`rounded-full border border-neutral-200 px-2 py-0.5 text-xs dark:border-neutral-700 ${className}`}
    >
      {children}
    </span>
  );
}

/** The Hebrew translation under an English question or part. */
export function Translation({ text }: { text: string }) {
  return (
    <div
      dir="rtl"
      className="mt-1 rounded-lg bg-neutral-50 px-3 py-1 leading-8 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
    >
      <span className="me-2 text-xs font-semibold text-neutral-500">תרגום</span>
      <MathText text={text} />
    </div>
  );
}

/** One question part with its status buttons. Used on the exam page and on the topic page. */
export function SubCard({
  sub,
  status,
  heading,
  topics,
  children,
}: {
  sub: {
    id: string;
    label: string;
    text: string;
    /** Hebrew translation of an English part */
    textHe?: string | null;
    /** unclear in the source: shown as a "check manually" box */
    reviewNote?: string | null;
    points: number | null;
    difficulty: number | null;
  };
  status: ProgressStatus;
  /** Shown before the text: the part label on an exam page, the exam + question on a topic page. */
  heading?: ReactNode;
  topics?: { id: string; name: string }[];
  children?: ReactNode;
}) {
  const diff = difficultyLabel(sub.difficulty);
  return (
    <li
      className={`rounded-xl border border-s-4 border-neutral-200 p-4 dark:border-neutral-800 ${STRIPE[status]}`}
    >
      {heading && (
        <div className="mb-1 text-sm text-neutral-500">{heading}</div>
      )}
      {/* dir="auto": English textbook problems read left to right */}
      <div className="leading-8" dir="auto">
        {sub.label && <span className="me-2 font-semibold">{sub.label}.</span>}
        {sub.points ? (
          <span className="me-2 text-neutral-500">[{sub.points}%]</span>
        ) : null}
        <MathText text={sub.text} />
      </div>
      {sub.textHe && <Translation text={sub.textHe} />}
      {sub.reviewNote && (
        <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <span className="font-semibold">⚠ לבדיקה ידנית: </span>
          <MathText text={sub.reviewNote} />
          <span className="text-amber-700 dark:text-amber-400">
            {" "}
            (השוו לתמונה מהמבחן או לקובץ המקורי)
          </span>
        </div>
      )}
      {(diff || (topics && topics.length > 0)) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {diff && (
            <Chip className={DIFF_STYLE[Math.round(sub.difficulty ?? 0)]}>
              {diff}
            </Chip>
          )}
          {topics?.map((t) => (
            <a key={t.id} href={`/topics/${t.id}`} className="hover:underline">
              <Chip className="text-neutral-600 dark:text-neutral-300">
                {t.name}
              </Chip>
            </a>
          ))}
        </div>
      )}
      <div className="no-print mt-3">
        <StatusPicker
          subQuestionId={sub.id}
          status={status}
          label={sub.label || "השאלה"}
        />
      </div>
      {children}
    </li>
  );
}
