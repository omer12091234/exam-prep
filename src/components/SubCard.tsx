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
      <div className="leading-8">
        {sub.label && <span className="me-2 font-semibold">{sub.label}.</span>}
        {sub.points ? (
          <span className="me-2 text-neutral-500">[{sub.points}%]</span>
        ) : null}
        <MathText text={sub.text} />
      </div>
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
