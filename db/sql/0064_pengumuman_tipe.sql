-- Tipe pengumuman: SEBELUM (sebelum lomba — semua tim terdaftar, termasuk yang
-- mundur) atau SESUDAH (setelah lomba — hanya tim yang ikut lomba: terkonfirmasi
-- & tidak mundur/tidak hadir). Pengumuman lama dianggap SEBELUM. Idempotent.
ALTER TABLE "Pengumuman" ADD COLUMN IF NOT EXISTS "tipe" TEXT NOT NULL DEFAULT 'SEBELUM';
