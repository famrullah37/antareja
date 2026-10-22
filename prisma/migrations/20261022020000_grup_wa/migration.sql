-- Lihat db/sql/0034_grup_wa.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
ALTER TABLE "KonfigUmum" ADD COLUMN "grupWaUrl" TEXT;
