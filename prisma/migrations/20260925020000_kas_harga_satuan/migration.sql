-- Lihat db/sql/0008_kas_harga_satuan.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
ALTER TABLE "KasTransaksi" ADD COLUMN "hargaSatuan" INTEGER;
