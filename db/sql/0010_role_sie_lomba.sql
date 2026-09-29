-- Role Sie Lomba: di bawah admin, mengurus tim, juri & penilaian,
-- penghargaan & sertifikat, dan pengumuman.
-- Idempotent: aman dijalankan ulang.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SIE_LOMBA';
