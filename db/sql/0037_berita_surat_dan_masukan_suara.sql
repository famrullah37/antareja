-- Berita (draf, belum terbit): surat undangan & rekomendasi kini bisa diunduh
-- di halaman utama, dan masukan suara juri di hasil penilaian.
-- Cek lalu terbitkan di /admin/berita. Idempotent: slug unik, dilewati kalau sudah ada.
INSERT INTO "Berita" ("id", "judul", "slug", "ringkasan", "konten", "coverUrl", "publish", "publishedAt", "penulis", "createdAt", "updatedAt")
VALUES (
  '1e4af9b1-f3bd-47d0-b039-756a9d045de7',
  'Surat Undangan & Rekomendasi LPKBB (LKBB) Antareja 2026 Kini Bisa Diunduh Sebelum Mendaftar',
  'surat-undangan-dan-rekomendasi-bisa-diunduh-sebelum-mendaftar',
  'Sekolah yang ingin mengikuti LPKBB Antareja 2026 kini dapat mengunduh surat undangan panitia dan surat rekomendasi Diknas langsung dari halaman utama website, tanpa harus mendaftar dan membayar terlebih dahulu.',
  'Kabar baik untuk sekolah yang sedang menyiapkan tim untuk LPKBB Antareja 2026 (LKBB Antareja), lomba keterampilan baris-berbaris tingkat Jawa Timur di SMK Telkom Malang.

Surat undangan dari panitia dan surat rekomendasi dari Diknas kini bisa diunduh langsung di halaman utama website, pada bagian "Dokumen" (buka menu Dokumen di navbar), bersama Juklak. Sebelumnya, surat ini baru tersedia di dashboard tim setelah pendaftaran dan pembayaran.

Kenapa diubah?
Banyak sekolah membutuhkan surat ini lebih dulu untuk mengurus izin kepala sekolah maupun pengajuan dana keikutsertaan. Dengan surat yang bisa diunduh sejak awal, pembina dan pelatih dapat menyiapkan administrasi sebelum mendaftarkan tim.

Siapa yang bisa mengunduh?
Surat tersedia untuk jenjang SMP dan SMA. Pilih tombol unduh sesuai jenjang tim Anda. Surat yang sama juga tetap tersedia di dashboard tim setelah mendaftar.

Langkah selanjutnya
Setelah administrasi sekolah siap, daftarkan tim melalui menu Daftar di website ini. Ada pertanyaan? Hubungi panitia melalui WhatsApp di +62 851-9824-0667.',
  NULL,
  false,
  NULL,
  'Sie Humas',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "Berita" ("id", "judul", "slug", "ringkasan", "konten", "coverUrl", "publish", "publishedAt", "penulis", "createdAt", "updatedAt")
VALUES (
  '5a0ea2db-dc59-43d8-b831-8a10dcafe0cb',
  'Hasil Penilaian LPKBB (LKBB) Antareja 2026 Dilengkapi Masukan Suara dari Juri',
  'hasil-penilaian-dilengkapi-masukan-suara-juri',
  'Selain nilai dan catatan tertulis, tim peserta LPKBB Antareja 2026 akan menerima masukan lisan dari juri yang bisa didengarkan langsung di dashboard setelah hasil penilaian diumumkan.',
  'Pada LPKBB Antareja 2026 (LKBB Antareja), juri tidak hanya memberikan nilai dan catatan tertulis, tetapi juga dapat merekam masukan suara untuk setiap tim selama penilaian berlangsung.

Apa manfaatnya bagi tim?
Masukan lisan memuat penjelasan yang lebih lengkap daripada catatan singkat: bagian mana yang sudah baik, apa yang perlu diperbaiki, dan saran latihan ke depan. Pelatih dan pasukan dapat mendengarkannya berulang kali sebagai bahan evaluasi.

Kapan dan di mana bisa didengar?
Masukan suara muncul di dashboard tim, pada bagian Hasil Penilaian, setelah nilai resmi diumumkan panitia. Setiap juri yang memberikan masukan ditampilkan bersama durasi rekamannya, dan bisa diputar langsung dari HP maupun laptop.

Siapa yang bisa mendengarkan?
Rekaman hanya dapat diputar oleh akun tim yang bersangkutan dan panitia. Tim lain tidak dapat mengaksesnya.

Pastikan perwakilan tim masuk ke dashboard setelah pengumuman hasil untuk mendengarkan masukan dari para juri. Ada pertanyaan? Hubungi panitia melalui WhatsApp di +62 851-9824-0667.',
  NULL,
  false,
  NULL,
  'Sie Humas',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;
