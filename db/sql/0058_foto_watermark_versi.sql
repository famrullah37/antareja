-- Galeri: versi gaya watermark per foto. Foto lama (versi 1, watermark tipis)
-- ditawarkan untuk diproses ulang di panel "Perbarui watermark".
-- Idempotent: aman dijalankan ulang.
ALTER TABLE "Foto" ADD COLUMN IF NOT EXISTS "watermarkVersi" INTEGER NOT NULL DEFAULT 1;
