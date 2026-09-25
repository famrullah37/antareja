-- Satuan & kuantitas barang pada pengeluaran manual. "jumlah" tetap = total Rp.
-- Idempotent: aman dijalankan ulang.
ALTER TABLE "KasTransaksi" ADD COLUMN IF NOT EXISTS "satuan" TEXT;
ALTER TABLE "KasTransaksi" ADD COLUMN IF NOT EXISTS "qty" INTEGER;
