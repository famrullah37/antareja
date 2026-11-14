-- Lihat db/sql/0051_pos_produk.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs. File ini cuma cerminan.
CREATE TABLE "ProdukPOS" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "harga" INTEGER NOT NULL,
    "foto" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProdukPOS_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "VarianProdukPOS" (
    "id" TEXT NOT NULL,
    "produkId" TEXT NOT NULL,
    "nama" TEXT NOT NULL DEFAULT '',
    "stok" INTEGER NOT NULL DEFAULT 0,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "VarianProdukPOS_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "VarianProdukPOS_produkId_fkey" FOREIGN KEY ("produkId") REFERENCES "ProdukPOS"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "VarianProdukPOS_produkId_nama_key" ON "VarianProdukPOS"("produkId", "nama");
CREATE TABLE "TransaksiPOS" (
    "id" TEXT NOT NULL,
    "nomor" SERIAL NOT NULL,
    "items" JSONB NOT NULL,
    "total" INTEGER NOT NULL,
    "metodePembayaran" TEXT NOT NULL,
    "uangDiterima" INTEGER,
    "namaPembeli" TEXT,
    "catatan" TEXT,
    "kasirId" TEXT,
    "kasirNama" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SELESAI',
    "batalAt" TIMESTAMP(3),
    "batalAlasan" TEXT,
    "batalOleh" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransaksiPOS_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TransaksiPOS_nomor_key" ON "TransaksiPOS"("nomor");
CREATE INDEX "TransaksiPOS_createdAt_idx" ON "TransaksiPOS"("createdAt");
