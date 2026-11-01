-- Presensi Daerah Persiapan (DP) oleh Sie Lomba: tim hadir + centang "sesuai" per anggota.
-- Idempotent: aman dijalankan ulang.
CREATE TABLE IF NOT EXISTS "PresensiDP" (
    "id" TEXT NOT NULL,
    "timId" TEXT NOT NULL,
    "hadirAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "olehNama" TEXT NOT NULL,
    CONSTRAINT "PresensiDP_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PresensiDP_timId_fkey" FOREIGN KEY ("timId") REFERENCES "Tim"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "PresensiDP_timId_key" ON "PresensiDP"("timId");
CREATE TABLE IF NOT EXISTS "PresensiAnggota" (
    "id" TEXT NOT NULL,
    "presensiId" TEXT NOT NULL,
    "anggotaId" TEXT NOT NULL,
    "olehNama" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PresensiAnggota_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PresensiAnggota_presensiId_fkey" FOREIGN KEY ("presensiId") REFERENCES "PresensiDP"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PresensiAnggota_anggotaId_fkey" FOREIGN KEY ("anggotaId") REFERENCES "Anggota"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "PresensiAnggota_anggotaId_key" ON "PresensiAnggota"("anggotaId");
CREATE INDEX IF NOT EXISTS "PresensiAnggota_presensiId_idx" ON "PresensiAnggota"("presensiId");
