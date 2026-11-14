-- Lihat db/sql/0055_merch_ready_stock.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs. File ini cuma cerminan.
CREATE TABLE "StokMerch" (
    "id" TEXT NOT NULL,
    "merchId" TEXT NOT NULL,
    "ukuran" TEXT NOT NULL DEFAULT '',
    "stok" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "StokMerch_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StokMerch_merchId_fkey" FOREIGN KEY ("merchId") REFERENCES "Merchandise"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "StokMerch_merchId_ukuran_key" ON "StokMerch"("merchId", "ukuran");
ALTER TABLE "KonfigMerch" ADD COLUMN "readyAktif" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PesananMerch" ADD COLUMN "jenis" TEXT NOT NULL DEFAULT 'PO';
ALTER TABLE "PesananMerch" ADD COLUMN "pengiriman" TEXT;
ALTER TABLE "PesananMerch" ADD COLUMN "alamat" TEXT;
ALTER TABLE "PesananMerch" ADD COLUMN "ongkir" INTEGER;
ALTER TABLE "PesananMerch" ADD COLUMN "batasBayar" TIMESTAMP(3);
ALTER TABLE "PesananMerch" ADD COLUMN "kurir" TEXT;
ALTER TABLE "PesananMerch" ADD COLUMN "resi" TEXT;
ALTER TABLE "PesananMerch" ADD COLUMN "dikirimAt" TIMESTAMP(3);
ALTER TABLE "PesananMerch" ADD COLUMN "aksesToken" TEXT;
CREATE UNIQUE INDEX "PesananMerch_aksesToken_key" ON "PesananMerch"("aksesToken");
CREATE INDEX "PesananMerch_status_idx" ON "PesananMerch"("status");
