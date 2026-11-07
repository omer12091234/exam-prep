import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Supabase: session pooler / direct URL for migrations.
  // Not required for `prisma generate` (runs on install, e.g. on Vercel without DB vars).
  datasource: { url: process.env.DIRECT_URL ?? "" },
});
