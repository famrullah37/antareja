-- Berita (draf, belum terbit): pendaftaran kini atas nama Official & grup
-- WhatsApp peserta untuk tim yang pembayarannya sudah diverifikasi.
-- Cek lalu terbitkan di /admin/berita. Idempotent: slug unik, dilewati kalau sudah ada.
INSERT INTO "Berita" ("id", "judul", "slug", "ringkasan", "konten", "coverUrl", "publish", "publishedAt", "penulis", "createdAt", "updatedAt")
VALUES (
  '3b7e9a12-5c4d-4f6e-8a1b-2c3d4e5f6a7b',
  'Pendaftaran LPKBB Antareja 2026 Kini Atas Nama Official, Tim Terverifikasi Bisa Gabung Grup WhatsApp Peserta',
  'pendaftaran-official-dan-grup-whatsapp-peserta',
  'Form pendaftaran LPKBB Antareja 2026 kini meminta data Official tim, bukan Pelatih. Tim yang pembayarannya sudah diverifikasi dapat bergabung ke grup WhatsApp peserta langsung dari dashboard.',
  'Ada dua pembaruan pada pendaftaran LPKBB Antareja 2026 yang perlu diketahui peserta.

1. Pendaftaran atas nama Official
Form pendaftaran tim kini meminta Nama Official dan Nomor Telepon Official, bukan lagi data Pelatih. Data Pelatih tetap wajib dilengkapi, tetapi diisi belakangan melalui dashboard tim pada bagian anggota, bersama data Danton dan pasukan.

2. Grup WhatsApp Peserta
Tim yang pembayaran pendaftarannya sudah diverifikasi panitia dapat bergabung ke grup WhatsApp peserta. Tombol "Gabung Grup WhatsApp" muncul otomatis di dashboard tim setelah pembayaran terverifikasi. Informasi penting seputar technical meeting, uji coba lapangan, dan pelaksanaan lomba akan dibagikan melalui grup ini, jadi pastikan perwakilan tim segera bergabung.

Belum melihat tombolnya? Artinya pembayaran tim masih dalam proses verifikasi. Silakan cek status pembayaran di dashboard atau hubungi panitia melalui WhatsApp di +62 851-9824-0667.',
  NULL,
  false,
  NULL,
  'Sie Humas',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;
