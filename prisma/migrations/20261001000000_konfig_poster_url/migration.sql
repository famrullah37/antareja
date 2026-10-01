-- Lihat db/sql/0011_konfig_poster_url.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
ALTER TABLE "KonfigUmum" ADD COLUMN "posterUrl" TEXT;
