-- Berita (draf, belum terbit): kategori U-15 & U-19 terbuka untuk sekolah dan club.
-- Batas umur & tanggal acuan belum ditetapkan di sini — cek/lengkapi lalu terbitkan
-- di /admin/berita. Idempotent: slug unik, dilewati kalau sudah ada.
INSERT INTO "Berita" ("id", "judul", "slug", "ringkasan", "konten", "coverUrl", "publish", "publishedAt", "penulis", "createdAt", "updatedAt")
VALUES (
  '8b2e4f6a-1c3d-4e5f-a7b9-c0d1e2f3a4b5',
  'Kategori U-15 dan U-19 LPKBB Antareja 2026 Kini Terbuka untuk Club Paskibra',
  'kategori-u15-u19-lpkbb-antareja-2026-terbuka-untuk-club',
  'LPKBB Antareja 2026 membuka kategori U-15 untuk tim SMP maupun club, dan kategori U-19 untuk tim SMA maupun club. Peserta dikelompokkan berdasarkan umur, dicek dari tanggal lahir anggota.',
  'Ada kabar baik untuk tim paskibra di luar sekolah. Mulai tahun ini, LPKBB Antareja 2026 tidak hanya terbuka untuk tim paskibra sekolah, tetapi juga untuk club, sanggar, dan komunitas paskibra. Supaya persaingan tetap adil, peserta dikelompokkan berdasarkan kategori umur.

Kategori yang dibuka:
• Paskibra Jenjang SMP / Club U-15: untuk tim paskibra SMP/sederajat, serta tim club yang seluruh anggotanya berusia maksimal 15 tahun.
• Paskibra Jenjang SMA / Club U-19: untuk tim paskibra SMA/SMK/sederajat, serta tim club yang seluruh anggotanya berusia maksimal 19 tahun.

Tim sekolah tetap mendaftar seperti biasa sesuai jenjangnya. Tim club memilih kategori yang sesuai dengan umur anggotanya. Biaya pendaftaran untuk tim club sama dengan jenjang sekolah pada kategori yang sama, dan rinciannya bisa dilihat di halaman utama website.

Bagaimana umur peserta diperiksa? Saat mendaftarkan anggota di dashboard, setiap anggota siswa wajib mengisi tanggal lahir. Data inilah yang dipakai panitia untuk memverifikasi kesesuaian umur dengan kategori yang dipilih. Pastikan tanggal lahir diisi dengan benar dan sesuai dokumen resmi. Tim yang sudah terlanjur mendaftar sebelum kolom ini tersedia cukup membuka data tiap anggota di dashboard lalu melengkapi tanggal lahirnya.

Cara mendaftar:
1. Buat akun di website antareja.smktelkom-mlg.sch.id.
2. Daftarkan tim dan pilih kategori (SMP / Club U-15 atau SMA / Club U-19).
3. Lengkapi data anggota, termasuk tanggal lahir.
4. Selesaikan pembayaran, lalu tunggu verifikasi dari panitia.

Pendaftaran dibuka sampai 8 November 2026, dan lomba dilaksanakan pada 14 November 2026 di SMK Telkom Malang. Jika ada pertanyaan seputar kategori atau syarat umur, hubungi panitia melalui WhatsApp di +62 851-9824-0667 atau Instagram @lpkbb.antareja. Ajak club paskibra di sekitarmu untuk ikut ambil bagian!',
  NULL,
  false,
  NULL,
  'Sie Humas',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;
