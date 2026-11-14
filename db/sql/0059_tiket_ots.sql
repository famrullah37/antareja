-- Tiket: penanda tiket OTS (on the spot) — hanya dijual di loket lewat POS
-- Tiket, tampil di web tanpa tombol beli, ditolak saat dibeli online.
-- Idempotent: aman dijalankan ulang.
ALTER TABLE "Tiket" ADD COLUMN IF NOT EXISTS "khususOts" BOOLEAN NOT NULL DEFAULT false;
