/**
 * Demo mode: runs without a Supabase project (local Postgres + seeded example exam).
 * Enabled automatically when the Supabase URL is not configured.
 * Everyone is signed in as a single local admin user; there is no real auth.
 */
export const isDemo = !process.env.NEXT_PUBLIC_SUPABASE_URL;

export const DEMO_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "demo@local",
  displayName: "משתמש דמו",
} as const;
