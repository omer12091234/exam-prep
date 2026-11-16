/** 75 → "01:15", 3725 → "1:02:05". Shared by server and client code. */
export function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export const DIFFICULTY = ["", "קל", "בינוני", "קשה"] as const;
export const difficultyLabel = (d: number | null | undefined) =>
  d ? (DIFFICULTY[Math.round(d)] ?? "") : "";

/** True when `date` is more than `ms` in the past (kept out of components: reads the clock). */
export const olderThan = (date: Date, ms: number) => Date.now() - date.getTime() > ms;
