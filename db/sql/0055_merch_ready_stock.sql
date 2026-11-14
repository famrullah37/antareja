-- Merchandise ready stock: dijual setelah PO ditutup, stok per ukuran,
-- ongkir dikonfirmasi admin, batas bayar 2x24 jam, resi pengiriman.
-- Idempotent: aman dijalankan ulang.
CREATE TABLE IF NOT EXISTS "StokMerch" (
    "id" TEXT NOT NULL,
    "merchId" TEXT NOT NULL,
    "ukuran" TEXT NOT NULL DEFAULT '',
    "stok" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "StokMerch_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StokMerch_merchId_fkey" FOREIGN KEY ("merchId") REFERENCES "Merchandise"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "StokMerch_merchId_ukuran_key" ON "StokMerch"("merchId", "ukuran");
ALTER TABLE "KonfigMerch" ADD COLUMN IF NOT EXISTS "readyAktif" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PesananMerch" ADD COLUMN IF NOT EXISTS "jenis" TEXT NOT NULL DEFAULT 'PO';
ALTER TABLE "PesananMerch" ADD COLUMN IF NOT EXISTS "pengiriman" TEXT;
ALTER TABLE "PesananMerch" ADD COLUMN IF NOT EXISTS "alamat" TEXT;
ALTER TABLE "PesananMerch" ADD COLUMN IF NOT EXISTS "ongkir" INTEGER;
ALTER TABLE "PesananMerch" ADD COLUMN IF NOT EXISTS "batasBayar" TIMESTAMP(3);
ALTER TABLE "PesananMerch" ADD COLUMN IF NOT EXISTS "kurir" TEXT;
ALTER TABLE "PesananMerch" ADD COLUMN IF NOT EXISTS "resi" TEXT;
ALTER TABLE "PesananMerch" ADD COLUMN IF NOT EXISTS "dikirimAt" TIMESTAMP(3);
ALTER TABLE "PesananMerch" ADD COLUMN IF NOT EXISTS "aksesToken" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "PesananMerch_aksesToken_key" ON "PesananMerch"("aksesToken");
CREATE INDEX IF NOT EXISTS "PesananMerch_status_idx" ON "PesananMerch"("status");
