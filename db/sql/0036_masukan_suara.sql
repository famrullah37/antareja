-- Masukan suara juri: satu rekaman per juri per tim, file audio di folder uploads.
-- Idempotent: aman dijalankan ulang.
CREATE TABLE IF NOT EXISTS "MasukanSuara" (
    "id" TEXT NOT NULL,
    "penilaianId" TEXT NOT NULL,
    "juriId" TEXT NOT NULL,
    "file" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "durasiDetik" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MasukanSuara_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MasukanSuara_penilaianId_fkey" FOREIGN KEY ("penilaianId") REFERENCES "PenilaianBaru"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MasukanSuara_juriId_fkey" FOREIGN KEY ("juriId") REFERENCES "Juri"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "MasukanSuara_penilaianId_juriId_key" ON "MasukanSuara"("penilaianId", "juriId");
