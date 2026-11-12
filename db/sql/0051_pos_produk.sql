-- POS Produk: katalog barang yang dijual langsung di stand (terpisah dari
-- Merchandise PO), stok per varian/ukuran, dan transaksi kasir.
-- Nomor 0051 (bukan 0048/0049) supaya tidak bentrok dengan branch fitur-voucher.
-- Idempotent: aman dijalankan ulang.
CREATE TABLE IF NOT EXISTS "ProdukPOS" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "harga" INTEGER NOT NULL,
    "foto" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProdukPOS_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "VarianProdukPOS" (
    "id" TEXT NOT NULL,
    "produkId" TEXT NOT NULL,
    "nama" TEXT NOT NULL DEFAULT '',
    "stok" INTEGER NOT NULL DEFAULT 0,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "VarianProdukPOS_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "VarianProdukPOS_produkId_fkey" FOREIGN KEY ("produkId") REFERENCES "ProdukPOS"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "VarianProdukPOS_produkId_nama_key" ON "VarianProdukPOS"("produkId", "nama");
CREATE TABLE IF NOT EXISTS "TransaksiPOS" (
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
CREATE UNIQUE INDEX IF NOT EXISTS "TransaksiPOS_nomor_key" ON "TransaksiPOS"("nomor");
CREATE INDEX IF NOT EXISTS "TransaksiPOS_createdAt_idx" ON "TransaksiPOS"("createdAt");
