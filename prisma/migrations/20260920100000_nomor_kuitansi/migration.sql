-- Nomor kuitansi unik per kuitansi yang diterbitkan + penghitungnya.
-- Idempotent: aman dijalankan ulang.
ALTER TABLE "Pembayaran" ADD COLUMN IF NOT EXISTS "nomorKuitansi" TEXT;
ALTER TABLE "Pembayaran" ADD COLUMN IF NOT EXISTS "kuitansiTanggal" TIMESTAMP(3);
ALTER TABLE "Pembayaran" ADD COLUMN IF NOT EXISTS "kuitansiIsDP" BOOLEAN;
CREATE UNIQUE INDEX IF NOT EXISTS "Pembayaran_nomorKuitansi_key" ON "Pembayaran"("nomorKuitansi");
ALTER TABLE "KonfigUmum" ADD COLUMN IF NOT EXISTS "counterKuitansi" INTEGER NOT NULL DEFAULT 0;
