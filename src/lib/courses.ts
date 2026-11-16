import { db } from "@/lib/db";

/** All courses with their published exam count, for the course pickers. */
export async function allCourses() {
  const rows = await db.course.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      number: true,
      _count: { select: { exams: { where: { published: true } } } },
    },
  });
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    number: c.number,
    exams: c._count.exams,
  }));
}

export async function enrolledIds(userId: string) {
  const rows = await db.enrollment.findMany({
    where: { userId },
    select: { courseId: true },
  });
  return new Set(rows.map((r) => r.courseId));
}

const SEMESTER = { A: "סמסטר א'", B: "סמסטר ב'", SUMMER: "קיץ" } as const;
const MOED = ["", "מועד א'", "מועד ב'", "מועד ג'", "מועד ד'"];

export function examTitle(e: {
  title: string | null;
  year: number;
  semester: keyof typeof SEMESTER;
  moed: number;
}) {
  return (
    e.title ?? `${e.year} · ${SEMESTER[e.semester]} · ${MOED[e.moed] ?? ""}`
  );
}
