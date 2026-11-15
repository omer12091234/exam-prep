/**
 * Demo mode: runs without a Supabase project (local Postgres + seeded example exam).
 * Enabled automatically when the Supabase URL is not configured – but never on Vercel.
 * Everyone is signed in as a single local admin user; there is no real auth.
 */
const supabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

/** Vercel sets VERCEL=1 on the server. A deployment must never fall back to "everyone is admin". */
export const deployedWithoutAuth = !supabaseConfigured && !!process.env.VERCEL;

export const isDemo = !supabaseConfigured && !deployedWithoutAuth;

export const DEMO_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "demo@local",
  displayName: "משתמש דמו",
} as const;
