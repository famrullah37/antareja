-- Fotografer per foto: satu album/tim bisa berisi foto dari banyak fotografer.
-- Diisi otomatis saat fotografer upload (atau dipilih admin); kosong = ikut
-- fotografer album. Tanpa FK supaya idempotent (lihat 0041).
ALTER TABLE "Foto" ADD COLUMN IF NOT EXISTS "fotograferId" TEXT;
CREATE INDEX IF NOT EXISTS "Foto_fotograferId_idx" ON "Foto"("fotograferId");
