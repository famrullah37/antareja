-- Lihat db/sql/0031_tiket_diambil.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
ALTER TABLE "TransaksiTiket" ADD COLUMN "diambilAt" TIMESTAMP(3);
