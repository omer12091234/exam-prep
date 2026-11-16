import Link from "next/link";
import { signOut } from "@/app/actions/account";
import { currentUser } from "@/lib/auth";
import { isDemo } from "@/lib/demo";

/** Top bar. Rendered inside Suspense in the root layout; shows nothing when signed out. */
export async function Nav() {
  const user = await currentUser();
  if (!user) return null;
  return (
    <nav className="no-print border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-x-5 gap-y-1 px-6 py-3 text-sm">
        <Link href="/" className="font-semibold">
          תרגול מבחנים
        </Link>
        <Link href="/" className="hover:underline">
          הקורסים שלי
        </Link>
        <Link href="/gradings" className="hover:underline">
          בדיקות
        </Link>
        <Link href="/settings" className="hover:underline">
          הגדרות
        </Link>
        {user.role === "ADMIN" && (
          <Link href="/admin/users" className="hover:underline">
            ניהול משתמשים
          </Link>
        )}
        <span className="ms-auto text-neutral-500">
          {user.displayName ?? user.email}
        </span>
        {!isDemo && (
          <form action={signOut}>
            <button className="hover:underline">התנתקות</button>
          </form>
        )}
      </div>
    </nav>
  );
}
