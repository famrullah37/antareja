-- Tiket wajib tim: jenis tiket yang hanya bisa dibeli online oleh akun tim
-- peserta (bukan penonton umum). Default false = tiket penonton biasa.
ALTER TABLE "Tiket" ADD COLUMN IF NOT EXISTS "khususTim" BOOLEAN NOT NULL DEFAULT false;
