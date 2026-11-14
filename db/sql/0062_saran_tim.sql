-- Saran & masukan dari tim (snapshot identitas tim, tanpa FK karena data tim
-- direset tiap kegiatan). Idempotent: aman dijalankan ulang.
CREATE TABLE IF NOT EXISTS "SaranTim" (
    "id" TEXT NOT NULL,
    "timId" TEXT,
    "namaTim" TEXT NOT NULL,
    "asalSekolah" TEXT NOT NULL,
    "jenjang" TEXT NOT NULL,
    "pengirim" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "rating" INTEGER,
    "dibaca" BOOLEAN NOT NULL DEFAULT false,
    "tanggapan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SaranTim_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SaranTim_timId_idx" ON "SaranTim"("timId");
