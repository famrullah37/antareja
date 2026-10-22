-- Link grup WhatsApp peserta (diisi admin di Pengaturan), hanya tampil di
-- dashboard tim yang pembayarannya sudah diverifikasi.
-- Idempotent: aman dijalankan ulang.
ALTER TABLE "KonfigUmum" ADD COLUMN IF NOT EXISTS "grupWaUrl" TEXT;
