"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/confirm` },
    });
    setState(error ? "error" : "sent");
  }

  return (
    <main className="mx-auto mt-24 w-full max-w-sm p-6">
      <h1 className="mb-4 text-2xl font-bold">כניסה</h1>
      {state === "sent" ? (
        <p>שלחנו קישור כניסה ל-{email}.</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="email"
            dir="ltr"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button className="rounded-lg bg-neutral-900 px-3 py-2 text-white dark:bg-white dark:text-black">
            שלחו לי קישור
          </button>
          {state === "error" && <p className="text-sm text-red-600">השליחה נכשלה, נסו שוב.</p>}
        </form>
      )}
    </main>
  );
}
