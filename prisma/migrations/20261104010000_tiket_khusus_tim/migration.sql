-- Lihat db/sql/0044_tiket_khusus_tim.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
ALTER TABLE "Tiket" ADD COLUMN "khususTim" BOOLEAN NOT NULL DEFAULT false;
