-- Kolom "ruangan" sempat ada di PengajuanMenginap (hanya di DB dev, sebelum
-- 0024 di-deploy), digantikan model Ruangan (0026). Di database lain statement
-- ini tidak mengubah apa-apa. Idempotent: aman dijalankan ulang.
ALTER TABLE "PengajuanMenginap" DROP COLUMN IF EXISTS "ruangan";
