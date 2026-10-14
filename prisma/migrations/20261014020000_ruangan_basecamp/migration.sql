-- Lihat db/sql/0026_ruangan_basecamp.sql — itu yang benar-benar dijalankan lewat
-- scripts/migrate-sql.mjs (idempotent). File ini cuma cerminan.
CREATE TABLE "Ruangan" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kapasitas" INTEGER NOT NULL DEFAULT 1,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Ruangan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Ruangan_nama_key" ON "Ruangan"("nama");
ALTER TABLE "Tim" ADD COLUMN "ruanganId" TEXT;
ALTER TABLE "Tim" ADD CONSTRAINT "Tim_ruanganId_fkey" FOREIGN KEY ("ruanganId") REFERENCES "Ruangan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Tim_ruanganId_idx" ON "Tim"("ruanganId");
