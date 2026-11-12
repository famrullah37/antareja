-- Lihat db/sql/0056_foto_gratis.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs. File ini cuma cerminan.
ALTER TABLE "Foto" ADD COLUMN "gratis" BOOLEAN NOT NULL DEFAULT false;
