-- Link Google Drive surat rekomendasi kepala sekolah, diisi sendiri oleh
-- pelatih/tim lewat dashboard. Idempotent: aman dijalankan ulang.
ALTER TABLE "Tim" ADD COLUMN IF NOT EXISTS "linkRekomendasi" TEXT;
