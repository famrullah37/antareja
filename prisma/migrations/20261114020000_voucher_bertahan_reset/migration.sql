-- Lihat db/sql/0049_voucher_bertahan_reset.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
ALTER TABLE "Voucher" ADD COLUMN "jumlahDipakai" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Voucher" ADD COLUMN "penerimaNama" TEXT;
ALTER TABLE "Voucher" ADD COLUMN "penerimaEmail" TEXT;
ALTER TABLE "Voucher" ADD COLUMN "penerimaTelp" TEXT;
ALTER TABLE "Voucher" ADD COLUMN "emailTerkirimAt" TIMESTAMP(3);
