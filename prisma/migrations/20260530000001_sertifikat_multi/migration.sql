-- Drop unique constraint to allow multiple sertifikat per tim
ALTER TABLE "Sertifikat" DROP CONSTRAINT IF EXISTS "Sertifikat_timId_key";

-- Add namaAnggota column
ALTER TABLE "Sertifikat" ADD COLUMN IF NOT EXISTS "namaAnggota" TEXT;
