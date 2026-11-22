import Link from "next/link";
import { db } from "@/lib/db";

const TABS = [
  { key: "exams", label: "לפי מבחן", path: "" },
  { key: "sheets", label: "דפי תרגול", path: "/sheets" },
  { key: "topics", label: "לפי נושא", path: "/topics" },
  { key: "docs", label: "הרצאות", path: "/topics#docs" },
] as const;

/** Course tabs; "דפי תרגול" and "הרצאות" appear only when the course has them. */
export async function CourseTabs({
  slug,
  active,
}: {
  slug: string;
  active: "exams" | "sheets" | "topics";
}) {
  const counts = await db.course.findUnique({
    where: { slug },
    select: {
      _count: {
        select: {
          docs: true,
          exams: { where: { kind: "SHEET", published: true } },
        },
      },
    },
  });
  const has = {
    docs: (counts?._count.docs ?? 0) > 0,
    sheets: (counts?._count.exams ?? 0) > 0,
  };
  return (
    <div
      className="mb-5 flex gap-1 overflow-x-auto border-b border-neutral-200 dark:border-neutral-800"
      role="tablist"
    >
      {TABS.filter(
        (t) =>
          (t.key !== "docs" || has.docs) && (t.key !== "sheets" || has.sheets),
      ).map((t) => (
        <Link
          key={t.key}
          href={`/courses/${slug}${t.path}`}
          role="tab"
          aria-selected={t.key === active}
          className={`-mb-px shrink-0 border-b-2 px-4 py-2 ${t.key === active ? "border-blue-600 font-semibold" : "border-transparent text-neutral-500 hover:text-inherit"}`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
