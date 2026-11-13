-- Lihat db/sql/0059_tiket_ots.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs. File ini cuma cerminan.
ALTER TABLE "Tiket" ADD COLUMN "khususOts" BOOLEAN NOT NULL DEFAULT false;
