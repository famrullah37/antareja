-- Pemesanan makanan: harga beli (dari katering) per menu untuk menghitung laba.
-- null = belum diisi. Snapshot-nya ikut tersimpan di PesananMakanan.items.
-- Idempotent: aman dijalankan ulang.
ALTER TABLE "MenuMakanan" ADD COLUMN IF NOT EXISTS "hargaBeli" INTEGER;
