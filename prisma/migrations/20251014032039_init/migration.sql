/*
  Warnings:

  - You are about to drop the column `ig` on the `Anggota` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Anggota" DROP COLUMN "ig",
ADD COLUMN     "link_ig" TEXT;
