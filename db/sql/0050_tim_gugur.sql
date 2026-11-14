-- Tim gugur: mengundurkan diri (bisa jauh hari, dari menu Tim) atau tidak hadir
-- (di Presensi DP). Tim gugur tidak tampil di daftar penilaian juri, nilainya
-- ditolak, tidak ikut rekap/juara, dan sertifikat tidak diterbitkan.
-- gugurJenis: 'MUNDUR' | 'TIDAK_HADIR'.
-- gugurTanpaVote: mundur SEBELUM voting dibuka & belum punya vote → tim keluar
-- dari daftar voting; tidak hadir di hari H / mundur saat voting berjalan tetap ikut.
-- Nomor 0050 (bukan 0048) supaya tidak bentrok dengan migrasi di branch fitur-voucher.
-- Idempotent: aman dijalankan ulang.
ALTER TABLE "Tim" ADD COLUMN IF NOT EXISTS "gugurAt" TIMESTAMP(3);
ALTER TABLE "Tim" ADD COLUMN IF NOT EXISTS "gugurJenis" TEXT;
ALTER TABLE "Tim" ADD COLUMN IF NOT EXISTS "gugurAlasan" TEXT;
ALTER TABLE "Tim" ADD COLUMN IF NOT EXISTS "gugurOleh" TEXT;
ALTER TABLE "Tim" ADD COLUMN IF NOT EXISTS "gugurTanpaVote" BOOLEAN NOT NULL DEFAULT false;
-- Anggota tidak hadir (beda dengan tim tidak hadir): baris PresensiAnggota dengan
-- tidakHadir = true. Tim tetap ikut lomba; anggota itu tercatat absen di DP.
ALTER TABLE "PresensiAnggota" ADD COLUMN IF NOT EXISTS "tidakHadir" BOOLEAN NOT NULL DEFAULT false;
