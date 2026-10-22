-- Pendaftaran tim kini meminta data Official, bukan Pelatih. Nama & no. telp
-- Pelatih diisi belakangan lewat dashboard, jadi kolomnya boleh kosong.
-- Idempotent: aman dijalankan ulang.
ALTER TABLE "Tim" ADD COLUMN IF NOT EXISTS "official" TEXT;
ALTER TABLE "Tim" ADD COLUMN IF NOT EXISTS "no_official" TEXT;
ALTER TABLE "Tim" ALTER COLUMN "pelatih" DROP NOT NULL;
ALTER TABLE "Tim" ALTER COLUMN "no_pelatih" DROP NOT NULL;
