-- Link Google Drive scan kartu pelajar, diisi tim lewat dashboard (pola sama
-- dengan linkRekomendasi). Idempotent: aman dijalankan ulang.
ALTER TABLE "Tim" ADD COLUMN IF NOT EXISTS "linkKartuPelajar" TEXT;
