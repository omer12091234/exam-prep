import { Suspense } from "react";
import { CourseChooser } from "@/components/CourseChooser";
import { requireUser } from "@/lib/auth";
import { allCourses, enrolledIds } from "@/lib/courses";

export default function OnboardingPage() {
  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <h1 className="mb-1 text-2xl font-bold">ברוכים הבאים</h1>
      <p className="mb-6 text-neutral-500">
        בחרו את הקורסים שאתם לומדים. אפשר לשנות בכל רגע בעמוד ההגדרות.
      </p>
      <Suspense fallback={<p className="text-neutral-500">טוען…</p>}>
        <Chooser />
      </Suspense>
    </main>
  );
}

async function Chooser() {
  const user = await requireUser();
  const [courses, selected] = await Promise.all([
    allCourses(),
    enrolledIds(user.id),
  ]);
  return (
    <CourseChooser
      courses={courses}
      selected={selected}
      displayName={user.displayName}
      next="home"
      submitLabel="שמירה והמשך"
    />
  );
}
