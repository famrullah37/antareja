-- Lihat db/sql/0054_merch_harga_beli.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs. File ini cuma cerminan.
ALTER TABLE "Merchandise" ADD COLUMN "hargaBeli" INTEGER;
