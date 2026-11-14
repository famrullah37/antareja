-- POS Produk: harga beli (modal) per produk untuk menghitung laba.
-- null = belum diisi. Snapshot-nya ikut tersimpan di TransaksiPOS.items.
-- Idempotent: aman dijalankan ulang.
ALTER TABLE "ProdukPOS" ADD COLUMN IF NOT EXISTS "hargaBeli" INTEGER;
