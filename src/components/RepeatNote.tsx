import Link from "next/link";
import { examTitle } from "@/lib/courses";

export type Repeat = {
  sameParts: number;
  totalParts: number;
  other: {
    number: number;
    label: string | null;
    exam: {
      id: string;
      title: string | null;
      year: number;
      semester: "A" | "B" | "SUMMER";
      moed: number;
    };
  };
};

/** Prisma include for a question's repeats, newest exam first. */
export const repeatsInclude = {
  orderBy: { other: { exam: { year: "desc" } } },
  select: {
    sameParts: true,
    totalParts: true,
    other: {
      select: {
        number: true,
        label: true,
        exam: {
          select: {
            id: true,
            title: true,
            year: true,
            semester: true,
            moed: true,
          },
        },
      },
    },
  },
} as const;

/** "השאלה חוזרת גם ב: <exam> שאלה 2 (כל הסעיפים) · …" */
export function RepeatNote({ repeats }: { repeats: Repeat[] }) {
  if (repeats.length === 0) return null;
  return (
    <div className="mb-3 rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-sm dark:border-violet-800 dark:bg-violet-950">
      <span className="font-medium">השאלה חוזרת גם ב:</span>
      <ul className="mt-1 flex flex-col gap-0.5">
        {repeats.map((r) => (
          <li key={`${r.other.exam.id}-${r.other.number}`}>
            <Link
              href={`/exams/${r.other.exam.id}#q${r.other.number}`}
              className="underline"
            >
              {examTitle(r.other.exam)} · שאלה {r.other.label ?? r.other.number}
            </Link>
            <span className="text-neutral-600 dark:text-neutral-400">
              {" "}
              (
              {r.sameParts === r.totalParts
                ? "כל הסעיפים"
                : `${r.sameParts} מתוך ${r.totalParts} סעיפים`}
              )
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
