-- Role Sie Acara: di bawah admin, mengurus pelaksanaan acara — uji coba
-- lapangan, pengajuan menginap, basecamp/ruangan, dan pengumuman (bersama
-- Sie Lomba). Tidak bisa membuka tim/juri/penilaian.
-- Idempotent: aman dijalankan ulang.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SIE_ACARA';
