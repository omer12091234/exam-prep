import "dotenv/config";
import { directDbUrl } from "./src/lib/dburl";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  // Supabase: session pooler / direct URL for migrations.
  // Not required for `prisma generate` (runs on install, e.g. on Vercel without DB vars).
  datasource: { url: directDbUrl() },
});
