-- Ruangan basecamp: panitia membuat ruangan dengan kapasitas (jumlah tim
-- maksimal), lalu menempatkan tiap tim ke satu ruangan (Tim.ruanganId) di
-- /admin/basecamp. Hapus ruangan = tim di dalamnya kembali tanpa ruangan.
-- Tim.basecamp (teks bebas) sempat ada di DB dev, digantikan ruanganId.
-- Idempotent: aman dijalankan ulang.
CREATE TABLE IF NOT EXISTS "Ruangan" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kapasitas" INTEGER NOT NULL DEFAULT 1,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Ruangan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Ruangan_nama_key" ON "Ruangan"("nama");
ALTER TABLE "Tim" ADD COLUMN IF NOT EXISTS "ruanganId" TEXT;
ALTER TABLE "Tim" DROP CONSTRAINT IF EXISTS "Tim_ruanganId_fkey";
ALTER TABLE "Tim" ADD CONSTRAINT "Tim_ruanganId_fkey" FOREIGN KEY ("ruanganId") REFERENCES "Ruangan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "Tim_ruanganId_idx" ON "Tim"("ruanganId");
ALTER TABLE "Tim" DROP COLUMN IF EXISTS "basecamp";
