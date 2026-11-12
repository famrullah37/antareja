-- Lihat db/sql/0052_pos_harga_beli.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs. File ini cuma cerminan.
ALTER TABLE "ProdukPOS" ADD COLUMN "hargaBeli" INTEGER;
