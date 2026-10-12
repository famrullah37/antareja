-- Lihat db/sql/0018_anggota_tanggal_lahir.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
ALTER TABLE "Anggota" ADD COLUMN IF NOT EXISTS "tanggal_lahir" DATE;
