-- Bundling tiket (mis. tambah Rp5.000 dapat 2 air minum).
-- Idempotent: aman dijalankan ulang.
ALTER TABLE "Tiket" ADD COLUMN IF NOT EXISTS "bundleHarga" INTEGER;
ALTER TABLE "Tiket" ADD COLUMN IF NOT EXISTS "bundleIsi" TEXT;
ALTER TABLE "TransaksiTiket" ADD COLUMN IF NOT EXISTS "bundleJumlah" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TransaksiTiket" ADD COLUMN IF NOT EXISTS "bundleHarga" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TransaksiTiket" ADD COLUMN IF NOT EXISTS "bundleIsi" TEXT;
ALTER TABLE "QRTiket" ADD COLUMN IF NOT EXISTS "bundle" BOOLEAN NOT NULL DEFAULT false;
