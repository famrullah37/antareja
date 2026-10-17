-- Kuitansi PDF untuk tiket penonton & foto premium: nomor (counter bersama
-- kuitansi pendaftaran) dan tanggal terbit, diisi saat transaksi diverifikasi.
-- Idempotent: aman dijalankan ulang.
ALTER TABLE "TransaksiTiket" ADD COLUMN IF NOT EXISTS "nomorKuitansi" TEXT;
ALTER TABLE "TransaksiTiket" ADD COLUMN IF NOT EXISTS "kuitansiTanggal" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "TransaksiTiket_nomorKuitansi_key" ON "TransaksiTiket"("nomorKuitansi");
ALTER TABLE "TransaksiFoto" ADD COLUMN IF NOT EXISTS "nomorKuitansi" TEXT;
ALTER TABLE "TransaksiFoto" ADD COLUMN IF NOT EXISTS "kuitansiTanggal" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "TransaksiFoto_nomorKuitansi_key" ON "TransaksiFoto"("nomorKuitansi");
