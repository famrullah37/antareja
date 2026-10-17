-- Lihat db/sql/0030_pemesanan_makanan.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
CREATE TABLE "SesiMakan" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "waktu" TIMESTAMP(3) NOT NULL,
    "batasPesan" TIMESTAMP(3),
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SesiMakan_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MenuMakanan" (
    "id" TEXT NOT NULL,
    "sesiId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "harga" INTEGER NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MenuMakanan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MenuMakanan_sesiId_fkey" FOREIGN KEY ("sesiId") REFERENCES "SesiMakan"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "MenuMakanan_sesiId_idx" ON "MenuMakanan"("sesiId");
CREATE TABLE "PesananMakanan" (
    "id" TEXT NOT NULL,
    "timId" TEXT NOT NULL,
    "sesiId" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "kodeUnik" TEXT NOT NULL,
    "totalBayar" INTEGER NOT NULL,
    "bukti" TEXT,
    "catatan" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "catatanAdmin" TEXT,
    "diambilAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PesananMakanan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PesananMakanan_timId_fkey" FOREIGN KEY ("timId") REFERENCES "Tim"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PesananMakanan_sesiId_fkey" FOREIGN KEY ("sesiId") REFERENCES "SesiMakan"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "PesananMakanan_timId_idx" ON "PesananMakanan"("timId");
CREATE INDEX "PesananMakanan_sesiId_idx" ON "PesananMakanan"("sesiId");
ALTER TABLE "KonfigUmum" ADD COLUMN "makananAktif" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "KonfigUmum" ADD COLUMN "makananInfo" TEXT;
ALTER TABLE "KonfigUmum" ADD COLUMN "counterUrutMakanan" INTEGER NOT NULL DEFAULT 0;
