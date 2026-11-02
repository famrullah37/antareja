-- Lihat db/sql/0041_bagi_hasil_foto.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
ALTER TABLE "Album" ADD COLUMN "fotograferId" TEXT;
CREATE INDEX "Album_fotograferId_idx" ON "Album"("fotograferId");
ALTER TABLE "KonfigUmum" ADD COLUMN "persenFotografer" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TransaksiFoto" ADD COLUMN "rincianAlbum" JSONB;
ALTER TABLE "TransaksiFoto" ADD COLUMN "persenFotografer" INTEGER;
CREATE TABLE "PenarikanFotografer" (
    "id" TEXT NOT NULL,
    "fotograferId" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "bankNama" TEXT NOT NULL,
    "bankNoRek" TEXT NOT NULL,
    "bankAtasNama" TEXT NOT NULL,
    "catatan" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "catatanAdmin" TEXT,
    "buktiTransfer" TEXT,
    "kasId" TEXT,
    "diprosesOleh" TEXT,
    "diprosesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PenarikanFotografer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PenarikanFotografer_fotograferId_idx" ON "PenarikanFotografer"("fotograferId");
ALTER TABLE "KonfigUmum" ADD COLUMN "biayaAdminPenarikan" INTEGER NOT NULL DEFAULT 2500;
ALTER TABLE "PenarikanFotografer" ADD COLUMN "biayaAdmin" INTEGER NOT NULL DEFAULT 0;
