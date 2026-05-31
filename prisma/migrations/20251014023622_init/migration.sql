/*
  Warnings:

  - You are about to drop the column `cerdas_cermat` on the `Penilaian` table. All the data in the column will be lost.
  - You are about to drop the column `mascot` on the `Penilaian` table. All the data in the column will be lost.
  - You are about to drop the column `foto_mascot` on the `Tim` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Penilaian" DROP COLUMN "cerdas_cermat",
DROP COLUMN "mascot";

-- AlterTable
ALTER TABLE "Tim" DROP COLUMN "foto_mascot";
