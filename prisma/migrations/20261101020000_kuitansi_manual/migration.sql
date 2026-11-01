-- Lihat db/sql/0040_kuitansi_manual.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
CREATE TABLE "KuitansiManual" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "diterimaDari" TEXT NOT NULL,
    "untukPembayaran" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "metode" TEXT NOT NULL,
    "catatan" TEXT,
    "kasId" TEXT,
    "olehNama" TEXT NOT NULL,
    "batalAt" TIMESTAMP(3),
    "batalAlasan" TEXT,
    "batalOleh" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KuitansiManual_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "KuitansiManual_nomor_key" ON "KuitansiManual"("nomor");
