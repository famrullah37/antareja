/*
  Warnings:

  - The values [CERDAS_CERMAT1,CERDAS_CERMAT2] on the enum `Posisi` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Kelas" ADD VALUE 'I';
ALTER TYPE "Kelas" ADD VALUE 'II';
ALTER TYPE "Kelas" ADD VALUE 'III';
ALTER TYPE "Kelas" ADD VALUE 'IV';
ALTER TYPE "Kelas" ADD VALUE 'V';
ALTER TYPE "Kelas" ADD VALUE 'VI';

-- AlterEnum
BEGIN;
CREATE TYPE "Posisi_new" AS ENUM ('OFFICIAL', 'DANTON', 'B1S1', 'B1S2', 'B1S3', 'B2S1', 'B2S2', 'B2S3', 'B3S1', 'B3S2', 'B3S3', 'B4S1', 'B4S2', 'B4S3', 'B5S1', 'B5S2', 'B5S3');
ALTER TABLE "Anggota" ALTER COLUMN "posisi" TYPE "Posisi_new" USING ("posisi"::text::"Posisi_new");
ALTER TYPE "Posisi" RENAME TO "Posisi_old";
ALTER TYPE "Posisi_new" RENAME TO "Posisi";
DROP TYPE "Posisi_old";
COMMIT;
