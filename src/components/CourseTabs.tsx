import Link from "next/link";

const TABS = [
  { key: "exams", label: "לפי מבחן", path: "" },
  { key: "topics", label: "לפי נושא", path: "/topics" },
  { key: "docs", label: "הרצאות", path: "/topics#docs" },
] as const;

export function CourseTabs({
  slug,
  active,
  hasDocs,
}: {
  slug: string;
  active: "exams" | "topics";
  hasDocs: boolean;
}) {
  return (
    <div
      className="mb-5 flex gap-1 border-b border-neutral-200 dark:border-neutral-800"
      role="tablist"
    >
      {TABS.filter((t) => t.key !== "docs" || hasDocs).map((t) => (
        <Link
          key={t.key}
          href={`/courses/${slug}${t.path}`}
          role="tab"
          aria-selected={t.key === active}
          className={`-mb-px border-b-2 px-4 py-2 ${t.key === active ? "border-blue-600 font-semibold" : "border-transparent text-neutral-500 hover:text-inherit"}`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
