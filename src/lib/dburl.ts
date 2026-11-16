/**
 * Database URLs. Our own names win; otherwise the ones the Supabase ↔ Vercel integration
 * sets (POSTGRES_PRISMA_URL = transaction pooler, POSTGRES_URL_NON_POOLING = for migrations).
 */

/** node-postgres reads sslmode=require as "verify the CA", which fails on Supabase's own CA. */
function pgCompat(url: string) {
  if (
    !url ||
    !/[?&]sslmode=(require|prefer|verify-ca)/.test(url) ||
    url.includes("uselibpqcompat=")
  )
    return url;
  return `${url}&uselibpqcompat=true`;
}

/** For the app and the seed/import scripts (node-postgres). */
export const runtimeDbUrl = () =>
  pgCompat(process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || "");

/** For `prisma migrate` (Prisma's own engine, standard sslmode handling). */
export const directDbUrl = () =>
  process.env.DIRECT_URL || process.env.POSTGRES_URL_NON_POOLING || "";
