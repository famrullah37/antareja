-- Berita perdana (draf, belum terbit): pengenalan LPKBB Antareja 2026.
-- Tanggal diambil dari timeline default — cek lalu terbitkan di /admin/berita.
-- Idempotent: slug unik, dilewati kalau sudah ada (mis. sudah dihapus/diubah admin
-- tidak terpengaruh karena file ini hanya dijalankan sekali).
INSERT INTO "Berita" ("id", "judul", "slug", "ringkasan", "konten", "coverUrl", "publish", "publishedAt", "penulis", "createdAt", "updatedAt")
VALUES (
  '6f1c2d4e-8a3b-4c5d-9e7f-0a1b2c3d4e5f',
  'LPKBB Antareja 2026: Lomba Paskibra Tingkat Jawa Timur di SMK Telkom Malang',
  'lpkbb-antareja-2026-lomba-paskibra-jawa-timur',
  'LPKBB Antareja 2026, lomba paskibra dan baris-berbaris tingkat Jawa Timur, digelar 14 November 2026 di SMK Telkom Malang. Pendaftaran tim dibuka lewat website.',
  'LPKBB Antareja kembali hadir tahun ini. Lomba paskibra dan keterampilan baris-berbaris (PBB) tingkat Jawa Timur yang diselenggarakan SMK Telkom Malang ini menjadi ajang bagi tim-tim paskibra sekolah untuk menunjukkan kekompakan, kedisiplinan, dan kreativitas terbaiknya. Sebelumnya, ajang ini dikenal dengan nama LKBB Antareja.

Rangkaian LPKBB Antareja 2026:
• Pendaftaran peserta: sampai 8 November 2026, melalui website antareja.smktelkom-mlg.sch.id
• Technical meeting: 11 Oktober 2026 di SMK Telkom Malang
• Uji coba lapangan: 13 November 2026
• Pelaksanaan lomba: 14 November 2026, mulai pukul 06.00 WIB di SMK Telkom Malang

Pendaftaran sepenuhnya dilakukan secara online. Pelatih atau perwakilan tim cukup membuat akun di website, mendaftarkan tim beserta anggotanya, lalu menyelesaikan pembayaran. Setelah pembayaran diverifikasi panitia, tim dapat memilih jadwal uji coba lapangan langsung dari dashboard. Kategori jenjang yang dibuka beserta biaya pendaftarannya dapat dilihat di halaman utama website.

Bukan hanya untuk peserta, LPKBB Antareja juga terbuka untuk penonton. Tiket penonton dapat dibeli melalui halaman Tiket, foto-foto dokumentasi akan tersedia di halaman Galeri, dan pendukung bisa memberikan dukungan untuk tim paskibra favoritnya melalui halaman Vote.

Untuk informasi lebih lanjut, hubungi panitia melalui WhatsApp di +62 851-9824-0667 atau ikuti Instagram @lpkbb.antareja untuk kabar terbaru. Sampai jumpa di lapangan SMK Telkom Malang!',
  NULL,
  false,
  NULL,
  'Sie Humas',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;
