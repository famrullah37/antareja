-- Jadwal periode voting (opsional) — sebelumnya cuma toggle aktif/nonaktif
-- manual, tanpa batas waktu. Kalau diisi, dipakai untuk countdown di /vote
-- dan validasi server-side supaya vote otomatis tertutup setelah waktunya.
ALTER TABLE "KonfigVoting" ADD COLUMN IF NOT EXISTS "mulaiPada" TIMESTAMP(3);
ALTER TABLE "KonfigVoting" ADD COLUMN IF NOT EXISTS "tutupPada" TIMESTAMP(3);
