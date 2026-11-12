-- Lihat db/sql/0058_foto_watermark_versi.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs. File ini cuma cerminan.
ALTER TABLE "Foto" ADD COLUMN "watermarkVersi" INTEGER NOT NULL DEFAULT 1;
