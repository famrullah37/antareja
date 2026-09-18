-- Toggle aktif/nonaktif per jenjang (landing page & form pendaftaran).
-- Default sdAktif=false (sudah lama disembunyikan hardcode), purnaAktif=false
-- (dinonaktifkan sesuai permintaan saat ini, admin bisa nyalakan lagi lewat
-- Pengaturan kapan saja).
ALTER TABLE "KonfigUmum" ADD COLUMN "sdAktif" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "KonfigUmum" ADD COLUMN "smpAktif" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "KonfigUmum" ADD COLUMN "smaAktif" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "KonfigUmum" ADD COLUMN "purnaAktif" BOOLEAN NOT NULL DEFAULT false;
