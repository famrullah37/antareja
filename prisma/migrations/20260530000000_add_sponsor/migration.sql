-- CreateTable
CREATE TABLE "Sponsor" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "linkUrl" TEXT,
    "tipe" TEXT NOT NULL DEFAULT 'SPONSOR',
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);
