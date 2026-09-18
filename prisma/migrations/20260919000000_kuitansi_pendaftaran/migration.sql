-- Kode unik + kuitansi PDF untuk pembayaran pendaftaran tim (sama pola
-- dengan sistem Voting).
ALTER TABLE "Pembayaran" ADD COLUMN "kodeUnik" TEXT;
ALTER TABLE "Pembayaran" ADD COLUMN "totalBayar" INTEGER;
ALTER TABLE "Pembayaran" ADD COLUMN "kuitansiUrl" TEXT;

ALTER TABLE "KonfigUmum" ADD COLUMN "counterUrutPendaftaran" INTEGER NOT NULL DEFAULT 0;
