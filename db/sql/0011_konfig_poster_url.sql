-- Link pengumpulan poster (mis. Google Form/Drive) di KonfigUmum, diisi admin
-- lewat Pengaturan, muncul sebagai tombol di dashboard peserta.
-- Idempotent: aman dijalankan ulang.
ALTER TABLE "KonfigUmum" ADD COLUMN IF NOT EXISTS "posterUrl" TEXT;
