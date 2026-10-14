-- Lihat db/sql/0024_pengajuan_menginap.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
CREATE TABLE "PengajuanMenginap" (
    "id" TEXT NOT NULL,
    "timId" TEXT NOT NULL,
    "jumlahPutra" INTEGER NOT NULL DEFAULT 0,
    "jumlahPutri" INTEGER NOT NULL DEFAULT 0,
    "jumlahPendamping" INTEGER NOT NULL DEFAULT 0,
    "tanggalDatang" DATE NOT NULL,
    "tanggalPulang" DATE NOT NULL,
    "namaPj" TEXT NOT NULL,
    "noHpPj" TEXT NOT NULL,
    "catatan" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "catatanAdmin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PengajuanMenginap_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PengajuanMenginap_timId_key" ON "PengajuanMenginap"("timId");
ALTER TABLE "PengajuanMenginap" ADD CONSTRAINT "PengajuanMenginap_timId_fkey" FOREIGN KEY ("timId") REFERENCES "Tim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KonfigUmum" ADD COLUMN "menginapAktif" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "KonfigUmum" ADD COLUMN "menginapInfo" TEXT;
