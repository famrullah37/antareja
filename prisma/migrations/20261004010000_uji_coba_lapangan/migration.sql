-- Lihat db/sql/0014_uji_coba_lapangan.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
CREATE TABLE "SesiUjiCoba" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "mulai" TIMESTAMP(3) NOT NULL,
    "selesai" TIMESTAMP(3) NOT NULL,
    "durasiMenit" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SesiUjiCoba_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "UjiCobaTim" (
    "id" TEXT NOT NULL,
    "timId" TEXT NOT NULL,
    "sesiId" TEXT NOT NULL,
    "mulai" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UjiCobaTim_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UjiCobaTim_timId_key" ON "UjiCobaTim"("timId");
CREATE UNIQUE INDEX "UjiCobaTim_sesiId_mulai_key" ON "UjiCobaTim"("sesiId", "mulai");
ALTER TABLE "UjiCobaTim" ADD CONSTRAINT "UjiCobaTim_timId_fkey" FOREIGN KEY ("timId") REFERENCES "Tim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UjiCobaTim" ADD CONSTRAINT "UjiCobaTim_sesiId_fkey" FOREIGN KEY ("sesiId") REFERENCES "SesiUjiCoba"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KonfigUmum" ADD COLUMN "ujiCobaBatas" TIMESTAMP(3);
