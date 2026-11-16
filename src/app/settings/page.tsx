import { Suspense } from "react";
import { CourseChooser } from "@/components/CourseChooser";
import { requireUser } from "@/lib/auth";
import { allCourses, enrolledIds } from "@/lib/courses";

export default function SettingsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <h1 className="mb-1 text-2xl font-bold">הגדרות</h1>
      <p className="mb-6 text-neutral-500">
        מסמנים קורס כדי להוסיף אותו ומבטלים סימון כדי להסיר. ההתקדמות בקורס
        שהוסר נשמרת וחוזרת אם מוסיפים אותו שוב.
      </p>
      <Suspense fallback={<p className="text-neutral-500">טוען…</p>}>
        <Settings />
      </Suspense>
    </main>
  );
}

async function Settings() {
  const user = await requireUser();
  const [courses, selected] = await Promise.all([
    allCourses(),
    enrolledIds(user.id),
  ]);
  return (
    <>
      <p className="mb-4 text-sm text-neutral-500" dir="ltr">
        {user.email}
      </p>
      <CourseChooser
        courses={courses}
        selected={selected}
        displayName={user.displayName}
        submitLabel="שמירה"
      />
    </>
  );
}
