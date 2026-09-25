-- Harga satuan pengeluaran manual. Sub total (= "jumlah" Rp) = hargaSatuan x qty.
-- Idempotent: aman dijalankan ulang.
ALTER TABLE "KasTransaksi" ADD COLUMN IF NOT EXISTS "hargaSatuan" INTEGER;
