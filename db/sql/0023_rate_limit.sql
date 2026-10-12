-- Pembatas laju & percobaan login gagal (persisten, lihat src/lib/rateLimit.ts).
-- Idempotent: aman dijalankan ulang.
CREATE TABLE IF NOT EXISTS "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);
CREATE INDEX IF NOT EXISTS "RateLimit_resetAt_idx" ON "RateLimit"("resetAt");
