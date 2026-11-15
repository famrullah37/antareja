-- Lihat db/sql/0064_pengumuman_tipe.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs. File ini cuma cerminan.
ALTER TABLE "Pengumuman" ADD COLUMN "tipe" TEXT NOT NULL DEFAULT 'SEBELUM';
