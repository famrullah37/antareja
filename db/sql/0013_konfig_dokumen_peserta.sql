-- Daftar dokumen untuk peserta (surat undangan & surat rekomendasi Diknas
-- per jenjang SMP/SMA) yang diupload admin di Pengaturan. File-nya sendiri
-- disimpan di folder uploads server. Idempotent: aman dijalankan ulang.
ALTER TABLE "KonfigUmum" ADD COLUMN IF NOT EXISTS "dokumenPeserta" JSONB;
