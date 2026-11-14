-- Lihat db/sql/0053_makanan_harga_beli.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs. File ini cuma cerminan.
ALTER TABLE "MenuMakanan" ADD COLUMN "hargaBeli" INTEGER;
