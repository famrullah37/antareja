-- Prisma creates unique fields as INDEX, not CONSTRAINT
-- So we need DROP INDEX, not DROP CONSTRAINT
DROP INDEX IF EXISTS "Sertifikat_timId_key";

-- Also ensure namaAnggota column exists
ALTER TABLE "Sertifikat" ADD COLUMN IF NOT EXISTS "namaAnggota" TEXT;
