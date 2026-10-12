-- Tanggal lahir anggota (verifikasi kategori umur Club U-15 / U-19).
-- Nullable & additive — anggota lama diisi lewat form edit.
-- Idempotent: aman dijalankan ulang.
ALTER TABLE "Anggota" ADD COLUMN IF NOT EXISTS "tanggal_lahir" DATE;
