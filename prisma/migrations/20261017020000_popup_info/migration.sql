-- Lihat db/sql/0029_popup_info.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
ALTER TABLE "KonfigUmum" ADD COLUMN "popupAktif" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "KonfigUmum" ADD COLUMN "popupJudul" TEXT;
ALTER TABLE "KonfigUmum" ADD COLUMN "popupIsi" TEXT;
ALTER TABLE "KonfigUmum" ADD COLUMN "popupTampilKuota" BOOLEAN NOT NULL DEFAULT true;
