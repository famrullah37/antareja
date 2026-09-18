-- Voting tidak lagi punya QRIS sendiri — ikut pakai QRIS milik KonfigTiket
-- (sudah dipakai bareng Tiket & Galeri Foto Premium).
ALTER TABLE "KonfigVoting" DROP COLUMN "qrisUrl";
ALTER TABLE "KonfigVoting" DROP COLUMN "qrisPayload";
