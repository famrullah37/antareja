-- Tanda tiket online sudah diambil pembeli di loket (ditandai petugas POS).
-- Idempotent: aman dijalankan ulang.
ALTER TABLE "TransaksiTiket" ADD COLUMN IF NOT EXISTS "diambilAt" TIMESTAMP(3);
