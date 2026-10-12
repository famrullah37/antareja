-- Lihat db/sql/0023_rate_limit.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
CREATE TABLE IF NOT EXISTS "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);
CREATE INDEX IF NOT EXISTS "RateLimit_resetAt_idx" ON "RateLimit"("resetAt");
