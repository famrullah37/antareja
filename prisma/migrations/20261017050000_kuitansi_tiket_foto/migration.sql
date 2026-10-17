-- Lihat db/sql/0032_kuitansi_tiket_foto.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
ALTER TABLE "TransaksiTiket" ADD COLUMN "nomorKuitansi" TEXT;
ALTER TABLE "TransaksiTiket" ADD COLUMN "kuitansiTanggal" TIMESTAMP(3);
CREATE UNIQUE INDEX "TransaksiTiket_nomorKuitansi_key" ON "TransaksiTiket"("nomorKuitansi");
ALTER TABLE "TransaksiFoto" ADD COLUMN "nomorKuitansi" TEXT;
ALTER TABLE "TransaksiFoto" ADD COLUMN "kuitansiTanggal" TIMESTAMP(3);
CREATE UNIQUE INDEX "TransaksiFoto_nomorKuitansi_key" ON "TransaksiFoto"("nomorKuitansi");
