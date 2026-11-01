-- Lihat db/sql/0039_presensi_dp.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
CREATE TABLE "PresensiDP" (
    "id" TEXT NOT NULL,
    "timId" TEXT NOT NULL,
    "hadirAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "olehNama" TEXT NOT NULL,
    CONSTRAINT "PresensiDP_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PresensiDP_timId_fkey" FOREIGN KEY ("timId") REFERENCES "Tim"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PresensiDP_timId_key" ON "PresensiDP"("timId");
CREATE TABLE "PresensiAnggota" (
    "id" TEXT NOT NULL,
    "presensiId" TEXT NOT NULL,
    "anggotaId" TEXT NOT NULL,
    "olehNama" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PresensiAnggota_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PresensiAnggota_presensiId_fkey" FOREIGN KEY ("presensiId") REFERENCES "PresensiDP"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PresensiAnggota_anggotaId_fkey" FOREIGN KEY ("anggotaId") REFERENCES "Anggota"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PresensiAnggota_anggotaId_key" ON "PresensiAnggota"("anggotaId");
CREATE INDEX "PresensiAnggota_presensiId_idx" ON "PresensiAnggota"("presensiId");
