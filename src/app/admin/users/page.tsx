import { Suspense } from "react";
import { EnrollmentToggle, RoleSelect } from "@/components/AdminToggles";
import { requireAdmin } from "@/lib/auth";
import { allCourses } from "@/lib/courses";
import { db } from "@/lib/db";

export default function AdminUsersPage() {
  return (
    <main className="mx-auto w-full max-w-4xl p-6">
      <h1 className="mb-1 text-2xl font-bold">ניהול משתמשים</h1>
      <p className="mb-6 text-neutral-500">
        סימון תיבה מוסיף את הקורס למשתמש, ביטול הסימון מסיר אותו. השינוי נשמר
        מיד.
      </p>
      <Suspense fallback={<p className="text-neutral-500">טוען…</p>}>
        <Users />
      </Suspense>
    </main>
  );
}

async function Users() {
  const admin = await requireAdmin();
  const [courses, users] = await Promise.all([
    allCourses(),
    db.user.findMany({
      orderBy: { createdAt: "asc" },
      include: { enrollments: { select: { courseId: true } } },
    }),
  ]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-300 text-start dark:border-neutral-700">
            <th className="p-2 text-start font-semibold">משתמש</th>
            <th className="p-2 text-start font-semibold">תפקיד</th>
            {courses.map((c) => (
              <th key={c.id} className="p-2 text-center font-semibold">
                {c.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const mine = new Set(u.enrollments.map((e) => e.courseId));
            return (
              <tr
                key={u.id}
                className="border-b border-neutral-200 dark:border-neutral-800"
              >
                <td className="p-2">
                  <div className="font-medium">{u.displayName ?? "—"}</div>
                  <div className="text-neutral-500" dir="ltr">
                    {u.email}
                  </div>
                </td>
                <td className="p-2">
                  <RoleSelect
                    userId={u.id}
                    role={u.role}
                    disabled={u.id === admin.id}
                  />
                </td>
                {courses.map((c) => (
                  <td key={c.id} className="p-2 text-center">
                    <EnrollmentToggle
                      userId={u.id}
                      courseId={c.id}
                      enrolled={mine.has(c.id)}
                      label={`${c.name} – ${u.displayName ?? u.email}`}
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
