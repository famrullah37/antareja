-- Lihat db/sql/0009_tiket_bundling.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
ALTER TABLE "Tiket" ADD COLUMN "bundleHarga" INTEGER;
ALTER TABLE "Tiket" ADD COLUMN "bundleIsi" TEXT;
ALTER TABLE "TransaksiTiket" ADD COLUMN "bundleJumlah" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TransaksiTiket" ADD COLUMN "bundleHarga" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TransaksiTiket" ADD COLUMN "bundleIsi" TEXT;
ALTER TABLE "QRTiket" ADD COLUMN "bundle" BOOLEAN NOT NULL DEFAULT false;
