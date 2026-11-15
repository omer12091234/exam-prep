-- Supabase exposes the "public" schema through its Data API (PostgREST) using the
-- publishable key that ships to every browser. Without RLS, anyone could read and
-- write these tables directly. The app talks to Postgres through Prisma as the
-- table owner / "postgres" role, which bypasses RLS, so enabling it with no
-- policies blocks the Data API without affecting the site.
--
-- New tables are NOT covered automatically: add
--   ALTER TABLE "X" ENABLE ROW LEVEL SECURITY;
-- to the migration that creates them.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;
