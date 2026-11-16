"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isDemo } from "@/lib/demo";

const INPUT =
  "rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900";
const BUTTON =
  "rounded-lg bg-neutral-900 px-3 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<
    "idle" | "busy" | "sent" | "error" | "bad"
  >("idle");

  if (isDemo) {
    return (
      <main className="mx-auto mt-24 w-full max-w-sm p-6">
        <p className="mb-4">מצב דמו: אין צורך בהתחברות.</p>
        <Link href="/" className="underline">
          לדף הבית
        </Link>
      </main>
    );
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    const { error } = await createClient().auth.signInWithPassword({
      email,
      password,
    });
    if (error) return setState("bad");
    // Full navigation so the server sees the new session cookie.
    location.assign("/");
  }

  async function magicLink() {
    if (!email) return setState("bad");
    setState("busy");
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${location.origin}/auth/confirm`,
      },
    });
    setState(error ? "error" : "sent");
  }

  return (
    <main className="mx-auto mt-16 w-full max-w-sm p-6">
      <h1 className="mb-4 text-2xl font-bold">כניסה</h1>
      {state === "sent" ? (
        <p>שלחנו קישור כניסה ל-{email}.</p>
      ) : (
        <form onSubmit={signIn} className="flex flex-col gap-3">
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
            סיסמה
            <input
              type="password"
              dir="ltr"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={INPUT}
            />
          </label>
          <button disabled={state === "busy"} className={BUTTON}>
            כניסה
          </button>
          <button
            type="button"
            onClick={magicLink}
            disabled={state === "busy"}
            className="text-sm underline"
          >
            שכחתי סיסמה – שלחו לי קישור כניסה למייל
          </button>
          {state === "bad" && (
            <p role="alert" className="text-sm text-red-600">
              האימייל או הסיסמה שגויים.
            </p>
          )}
          {state === "error" && (
            <p role="alert" className="text-sm text-red-600">
              השליחה נכשלה, נסו שוב.
            </p>
          )}
        </form>
      )}
      <p className="mt-6 text-sm">
        אין לך חשבון?{" "}
        <Link href="/signup" className="underline">
          הרשמה
        </Link>
      </p>
    </main>
  );
}
