-- Lihat db/sql/0041_link_kartu_pelajar.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
ALTER TABLE "Tim" ADD COLUMN "linkKartuPelajar" TEXT;
