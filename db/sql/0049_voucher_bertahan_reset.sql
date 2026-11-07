-- Data Tim & User direset setelah tiap kegiatan: penghitung pemakaian, snapshot
-- penerima, dan status email disimpan di Voucher. Idempotent: aman dijalankan ulang.
ALTER TABLE "Voucher" ADD COLUMN IF NOT EXISTS "jumlahDipakai" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Voucher" ADD COLUMN IF NOT EXISTS "penerimaNama" TEXT;
ALTER TABLE "Voucher" ADD COLUMN IF NOT EXISTS "penerimaEmail" TEXT;
ALTER TABLE "Voucher" ADD COLUMN IF NOT EXISTS "penerimaTelp" TEXT;
ALTER TABLE "Voucher" ADD COLUMN IF NOT EXISTS "emailTerkirimAt" TIMESTAMP(3);
