-- Lihat db/sql/0033_official_pendaftaran.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
ALTER TABLE "Tim" ADD COLUMN "official" TEXT;
ALTER TABLE "Tim" ADD COLUMN "no_official" TEXT;
ALTER TABLE "Tim" ALTER COLUMN "pelatih" DROP NOT NULL;
ALTER TABLE "Tim" ALTER COLUMN "no_pelatih" DROP NOT NULL;
