-- Lihat db/sql/0004_kode_unik_tiket_foto_dan_bukti_opsional.sql — itu yang
-- benar-benar dijalankan lewat scripts/migrate-sql.mjs (idempotent). File ini
-- cuma cerminan supaya riwayat prisma/migrations tetap sinkron.
ALTER TABLE "KonfigTiket" ADD COLUMN     "counterUrutFoto" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "counterUrutTiket" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "TransaksiFoto" ALTER COLUMN "bukti" DROP NOT NULL;

ALTER TABLE "TransaksiVoting" ALTER COLUMN "bukti" DROP NOT NULL;
