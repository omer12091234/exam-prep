import { saveMyCourses } from "@/app/actions/account";

type Course = {
  id: string;
  name: string;
  number: string | null;
  exams: number;
};

/** Checkbox list of all courses. Plain form → works without JavaScript too. */
export function CourseChooser({
  courses,
  selected,
  displayName,
  next,
  submitLabel,
}: {
  courses: Course[];
  selected: Set<string>;
  displayName?: string | null;
  next?: "home";
  submitLabel: string;
}) {
  return (
    <form action={saveMyCourses} className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      {displayName !== undefined && (
        <label className="flex flex-col gap-1">
          <span className="text-sm text-neutral-500">שם לתצוגה</span>
          <input
            name="displayName"
            defaultValue={displayName ?? ""}
            maxLength={60}
            className="max-w-sm rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
      )}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm text-neutral-500">הקורסים שלי</legend>
        {courses.map((c) => (
          <label
            key={c.id}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 p-3 has-checked:border-blue-600 dark:border-neutral-800"
          >
            <input
              type="checkbox"
              name="course"
              value={c.id}
              defaultChecked={selected.has(c.id)}
              className="size-4"
            />
            <span className="font-medium">{c.name}</span>
            <span className="text-sm text-neutral-500">
              {c.number ? `${c.number} · ` : ""}
              {c.exams} מבחנים
            </span>
          </label>
        ))}
      </fieldset>
      <button className="self-start rounded-lg bg-neutral-900 px-4 py-2 text-white dark:bg-white dark:text-black">
        {submitLabel}
      </button>
    </form>
  );
}
