"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MAX = 4 * 1024 * 1024;

export function GradeForm({
  examId,
  questionId,
  enabled,
}: {
  examId: string;
  questionId?: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const size = files.reduce((n, f) => n + f.size, 0);
  const tooBig = size > MAX;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.set("examId", examId);
    if (questionId) body.set("questionId", questionId);
    for (const f of files) body.append("files", f);
    try {
      const res = await fetch("/api/grade", { method: "POST", body });
      const data = (await res.json().catch(() => null)) as {
        id?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.id)
        throw new Error(data?.error ?? `השליחה נכשלה (${res.status}).`);
      router.push(`/gradings/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "השליחה נכשלה.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="font-medium">הפתרון שלך (PDF או צילומים)</span>
        <input
          type="file"
          multiple
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(e) => setFiles([...(e.target.files ?? [])])}
          className="rounded-lg border border-neutral-300 p-2 dark:border-neutral-700"
        />
      </label>
      {files.length > 0 && (
        <p
          className={`text-sm ${tooBig ? "text-red-600" : "text-neutral-500"}`}
        >
          {files.length} קבצים · {(size / 1024 / 1024).toFixed(1)}MB מתוך 4MB
          {tooBig &&
            " – גדול מדי. צלמו ברזולוציה נמוכה יותר או שלחו שאלה אחת בכל פעם."}
        </p>
      )}
      <button
        disabled={!enabled || busy || files.length === 0 || tooBig}
        className="self-start rounded-lg bg-neutral-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {busy ? "שולח…" : "שליחה לבדיקה"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
