-- Lihat db/sql/0007_kas_satuan_qty.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
ALTER TABLE "KasTransaksi" ADD COLUMN "satuan" TEXT;
ALTER TABLE "KasTransaksi" ADD COLUMN "qty" INTEGER;
