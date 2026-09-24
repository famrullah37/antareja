-- Kode unik 3 digit untuk Tiket & Foto Premium (counter atomik di
-- KonfigTiket, sama pola dengan KonfigVoting.counterUrut) + bukti
-- pembayaran opsional untuk QRIS (TransaksiFoto, TransaksiVoting --
-- TransaksiTiket.bukti sudah nullable sejak awal).
-- Idempotent: aman dijalankan ulang.
ALTER TABLE "KonfigTiket" ADD COLUMN IF NOT EXISTS "counterUrutTiket" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "KonfigTiket" ADD COLUMN IF NOT EXISTS "counterUrutFoto" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TransaksiFoto" ALTER COLUMN "bukti" DROP NOT NULL;
ALTER TABLE "TransaksiVoting" ALTER COLUMN "bukti" DROP NOT NULL;
