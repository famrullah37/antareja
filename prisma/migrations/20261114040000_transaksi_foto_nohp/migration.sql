-- Lihat db/sql/0063_transaksi_foto_nohp.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs. File ini cuma cerminan.
ALTER TABLE "TransaksiFoto" ADD COLUMN "noHp" TEXT;
