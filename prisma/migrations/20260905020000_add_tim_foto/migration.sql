-- Foto tim untuk ditampilkan di kartu vote (/vote) — sebelumnya tidak ada
-- foto di level tim, cuma di level anggota. Nullable & additive, tim yang
-- belum upload foto pakai avatar inisial di UI.
ALTER TABLE "Tim" ADD COLUMN IF NOT EXISTS "foto" TEXT;
