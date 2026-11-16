"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isDemo } from "@/lib/demo";

const INPUT =
  "rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  if (isDemo) {
    return (
      <main className="mx-auto mt-24 w-full max-w-sm p-6">
        <p className="mb-4">מצב דמו: אין הרשמה, יש משתמש מקומי אחד.</p>
        <Link href="/onboarding" className="underline">
          לבחירת קורסים
        </Link>
      </main>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    setError(null);
    const { data, error } = await createClient().auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name.trim() },
        emailRedirectTo: `${location.origin}/auth/confirm?next=/onboarding`,
      },
    });
    if (error) {
      setState("idle");
      setError(
        error.code === "weak_password"
          ? "הסיסמה חלשה מדי (לפחות 8 תווים)."
          : error.code === "over_email_send_rate_limit"
            ? "נשלחו יותר מדי מיילים. נסו שוב בעוד כמה דקות."
            : "ההרשמה נכשלה. בדקו את הפרטים ונסו שוב.",
      );
      return;
    }
    // With email confirmation off Supabase signs the user in right away.
    if (data.session) return location.assign("/onboarding");
    setState("sent");
  }

  return (
    <main className="mx-auto mt-16 w-full max-w-sm p-6">
      <h1 className="mb-4 text-2xl font-bold">הרשמה</h1>
      {state === "sent" ? (
        <p className="leading-7">
          שלחנו מייל אישור ל-<span dir="ltr">{email}</span>. לוחצים על הקישור
          שבו, ואז בוחרים קורסים. אם כבר יש חשבון עם האימייל הזה, לא יישלח מייל
          –{" "}
          <Link href="/login" className="underline">
            כניסה
          </Link>
          .
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            שם
            <input
              required
              maxLength={60}
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={INPUT}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            אימייל
            <input
              type="email"
              dir="ltr"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            סיסמה (לפחות 8 תווים)
            <input
              type="password"
              dir="ltr"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={INPUT}
            />
          </label>
          <button
            disabled={state === "busy"}
            className="rounded-lg bg-neutral-900 px-3 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            הרשמה
          </button>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </form>
      )}
      <p className="mt-6 text-sm">
        כבר יש לך חשבון?{" "}
        <Link href="/login" className="underline">
          כניסה
        </Link>
      </p>
    </main>
  );
}
