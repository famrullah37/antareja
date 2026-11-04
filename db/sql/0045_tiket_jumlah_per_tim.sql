-- Jumlah tiket wajib per tim (diatur admin, berlaku untuk tiket khususTim).
ALTER TABLE "Tiket" ADD COLUMN IF NOT EXISTS "jumlahPerTim" INTEGER NOT NULL DEFAULT 1;
