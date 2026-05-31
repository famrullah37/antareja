-- CreateEnum
CREATE TYPE "Jenjang" AS ENUM ('SMP', 'SMA');

-- CreateEnum
CREATE TYPE "Kelas" AS ENUM ('VII', 'VIII', 'IX', 'X', 'XI', 'XII');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Tipe" AS ENUM ('SMALL', 'NORMAL');

-- CreateEnum
CREATE TYPE "Posisi" AS ENUM ('OFFICIAL', 'DANTON', 'B1S1', 'B1S2', 'B1S3', 'B2S1', 'B2S2', 'B2S3', 'B3S1', 'B3S2', 'B3S3', 'B4S1', 'B4S2', 'B4S3', 'B5S1', 'B5S2', 'B5S3', 'CERDAS_CERMAT1', 'CERDAS_CERMAT2');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "token" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anggota" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telp" TEXT NOT NULL,
    "foto" TEXT NOT NULL,
    "posisi" "Posisi" NOT NULL,
    "nisn" TEXT,
    "kelas" "Kelas" NOT NULL,
    "timId" TEXT NOT NULL,

    CONSTRAINT "Anggota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Penilaian" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "tim_id" TEXT NOT NULL,
    "danpas" INTEGER NOT NULL,
    "detail_url" TEXT NOT NULL,
    "formasi" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "pasukan" INTEGER NOT NULL,
    "pbb" INTEGER NOT NULL,
    "pbb_tambahan" INTEGER NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "variasi" INTEGER NOT NULL,
    "cerdas_cermat" INTEGER,
    "mascot" INTEGER,

    CONSTRAINT "Penilaian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tim" (
    "id" TEXT NOT NULL,
    "nama_tim" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "pelatih" TEXT NOT NULL,
    "jenjang" "Jenjang" NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "asal_sekolah" TEXT NOT NULL,
    "tipe_tim" "Tipe" NOT NULL,
    "foto_mascot" TEXT,
    "no_pelatih" TEXT NOT NULL,
    "link_berkas" TEXT,
    "link_video" TEXT,

    CONSTRAINT "Tim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pembayaran" (
    "id" TEXT NOT NULL,
    "tim_id" TEXT NOT NULL,
    "bukti_tf" TEXT NOT NULL,
    "bank" TEXT NOT NULL,
    "nama_rek" TEXT NOT NULL,
    "isDP" BOOLEAN NOT NULL,

    CONSTRAINT "Pembayaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pengumuman" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL,

    CONSTRAINT "Pengumuman_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_token_key" ON "User"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Anggota_email_key" ON "Anggota"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Anggota_posisi_timId_key" ON "Anggota"("posisi", "timId");

-- CreateIndex
CREATE UNIQUE INDEX "Penilaian_tim_id_key" ON "Penilaian"("tim_id");

-- CreateIndex
CREATE UNIQUE INDEX "Tim_userId_key" ON "Tim"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Pembayaran_tim_id_key" ON "Pembayaran"("tim_id");

-- AddForeignKey
ALTER TABLE "Anggota" ADD CONSTRAINT "Anggota_timId_fkey" FOREIGN KEY ("timId") REFERENCES "Tim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Penilaian" ADD CONSTRAINT "Penilaian_tim_id_fkey" FOREIGN KEY ("tim_id") REFERENCES "Tim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Penilaian" ADD CONSTRAINT "Penilaian_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tim" ADD CONSTRAINT "Tim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pembayaran" ADD CONSTRAINT "Pembayaran_tim_id_fkey" FOREIGN KEY ("tim_id") REFERENCES "Tim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
