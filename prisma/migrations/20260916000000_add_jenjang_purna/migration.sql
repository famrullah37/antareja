-- Tambah "PURNA" sebagai jenjang lomba baru (setara SD/SMP/SMA), plus biaya
-- pendaftarannya sendiri di KonfigUmum.
ALTER TYPE "Jenjang" ADD VALUE 'PURNA';

ALTER TABLE "KonfigUmum" ADD COLUMN "biayaPurna" INTEGER NOT NULL DEFAULT 400000;
ALTER TABLE "KonfigUmum" ADD COLUMN "biayaPurnaDP" INTEGER NOT NULL DEFAULT 200000;
