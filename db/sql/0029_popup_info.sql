-- Popup informasi beranda (judul, isi bebas, opsi tampilkan sisa kuota).
-- Idempotent: aman dijalankan ulang.
ALTER TABLE "KonfigUmum" ADD COLUMN IF NOT EXISTS "popupAktif" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "KonfigUmum" ADD COLUMN IF NOT EXISTS "popupJudul" TEXT;
ALTER TABLE "KonfigUmum" ADD COLUMN IF NOT EXISTS "popupIsi" TEXT;
ALTER TABLE "KonfigUmum" ADD COLUMN IF NOT EXISTS "popupTampilKuota" BOOLEAN NOT NULL DEFAULT true;
