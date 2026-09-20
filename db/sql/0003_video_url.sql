-- Tautan video Antareja (halaman utama), diatur admin lewat Pengaturan.
-- Idempotent: aman dijalankan ulang.
ALTER TABLE "KonfigUmum" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;
