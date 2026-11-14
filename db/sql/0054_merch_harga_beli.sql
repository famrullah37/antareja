-- Merchandise: harga beli/produksi (vendor) per produk untuk menghitung laba.
-- null = belum diisi. Snapshot-nya ikut tersimpan di PesananMerch.items.
-- Idempotent: aman dijalankan ulang.
ALTER TABLE "Merchandise" ADD COLUMN IF NOT EXISTS "hargaBeli" INTEGER;
