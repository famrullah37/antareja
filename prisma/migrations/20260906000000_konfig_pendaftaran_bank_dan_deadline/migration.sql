-- Pisahkan "Penutupan Pendaftaran" dari gerbang peluncuran situs
-- (countdownTarget), tambah rekening khusus pendaftaran tim di KonfigUmum
-- (tidak lagi bergantung pada KonfigTiket), dan cooldown resend verifikasi
-- email. Semua nullable/additive, aman untuk data yang sudah ada.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verifyTokenSentAt" TIMESTAMP(3);
ALTER TABLE "KonfigUmum" ADD COLUMN IF NOT EXISTS "pendaftaranDeadline" TIMESTAMP(3);
ALTER TABLE "KonfigUmum" ADD COLUMN IF NOT EXISTS "bankNama" TEXT;
ALTER TABLE "KonfigUmum" ADD COLUMN IF NOT EXISTS "bankNoRek" TEXT;
ALTER TABLE "KonfigUmum" ADD COLUMN IF NOT EXISTS "bankAtasNama" TEXT;
