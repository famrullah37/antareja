-- Pelunasan DP lewat dashboard tim: kode unik & nominal pelunasan, bukti
-- transfer, dan waktu unggah. Idempotent: aman dijalankan ulang.
ALTER TABLE "Pembayaran" ADD COLUMN IF NOT EXISTS "pelunasanKodeUnik" TEXT;
ALTER TABLE "Pembayaran" ADD COLUMN IF NOT EXISTS "pelunasanTotal" INTEGER;
ALTER TABLE "Pembayaran" ADD COLUMN IF NOT EXISTS "pelunasanBukti" TEXT;
ALTER TABLE "Pembayaran" ADD COLUMN IF NOT EXISTS "pelunasanBank" TEXT;
ALTER TABLE "Pembayaran" ADD COLUMN IF NOT EXISTS "pelunasanNamaRek" TEXT;
ALTER TABLE "Pembayaran" ADD COLUMN IF NOT EXISTS "pelunasanAt" TIMESTAMP(3);
