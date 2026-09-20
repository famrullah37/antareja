-- Kuota maksimal tim per jenjang (KonfigUmum), null = tanpa batas.
-- Idempotent: aman dijalankan di database yang kolomnya sudah ada.
ALTER TABLE "KonfigUmum" ADD COLUMN IF NOT EXISTS "kuotaSD" INTEGER;
ALTER TABLE "KonfigUmum" ADD COLUMN IF NOT EXISTS "kuotaSMP" INTEGER;
ALTER TABLE "KonfigUmum" ADD COLUMN IF NOT EXISTS "kuotaSMA" INTEGER;
ALTER TABLE "KonfigUmum" ADD COLUMN IF NOT EXISTS "kuotaPurna" INTEGER;
