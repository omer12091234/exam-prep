import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { isDemo } from "@/lib/demo";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function create() {
  // Runtime uses the Supabase transaction pooler (DATABASE_URL).
  // The local demo DB (`prisma dev`, PGlite) serves one connection at a time: with a pool,
  // concurrent renders interleave on it ("bind message supplies N parameters…") or hang.
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    ...(isDemo ? { max: 1 } : {}),
  });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? create();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
