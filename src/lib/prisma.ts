import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function buildUrl() {
  const base = process.env.DATABASE_URL ?? "";
  // Batasi connection pool agar tidak exhausted di Neon free tier
  if (base.includes("connection_limit")) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}connection_limit=5&pool_timeout=20`;
}

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ datasources: { db: { url: buildUrl() } } });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
