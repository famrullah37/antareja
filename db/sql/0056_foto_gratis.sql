-- Galeri: foto gratis per foto di album berbayar.
-- Idempotent: aman dijalankan ulang.
ALTER TABLE "Foto" ADD COLUMN IF NOT EXISTS "gratis" BOOLEAN NOT NULL DEFAULT false;
