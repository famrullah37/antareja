// Konfigurasi situs (SEO & tautan resmi) — sengaja di kode, bukan database: jarang berubah dan
// tidak menambah kolom/query di tiap halaman. Ubah di sini lalu deploy. Video Antareja tetap
// diatur admin lewat Pengaturan karena memang sering diganti.
export const siteConfig = {
  name: "LPKBB Antareja",
  title: "LPKBB Antareja 2026 | Lomba Baris Berbaris SMK Telkom Malang",
  description:
    "Website resmi LPKBB Antareja 2026, lomba keterampilan baris-berbaris tingkat Jawa Timur yang diselenggarakan SMK Telkom Malang. Daftarkan tim, lihat jadwal dan kategori lomba, galeri foto, serta dukung tim favoritmu.",
  keywords: [
    "LPKBB Antareja",
    "Antareja",
    "lomba baris berbaris",
    "LPKBB Jawa Timur",
    "lomba paskibra",
    "PBB",
    "SMK Telkom Malang",
    "pendaftaran LPKBB",
    "PASKI",
    "PASKIBRA",
    "LPKBB",
    // Nama lama (sebelum jadi LPKBB) — masih banyak dicari orang.
    "LKBB Antareja",
    "LKBB",
    "pasukan pengibar bendera",
    "ekstrakurikuler paskibra",
    "kompetisi paskibra",
    "lomba PBB",
    "lomba paskibra 2026",
    "lomba paskibra Malang",
    "lomba paskibra Jawa Timur",
    "LPKBB SMK Telkom Malang",
    "juara paskibra",
    "tim paskibra sekolah",
  ],
  // Domain produksi. Sengaja konstanta (bukan NEXTAUTH_URL) supaya canonical/sitemap tidak ikut salah
  // kalau env server keliru.
  url: "https://antareja.smktelkom-mlg.sch.id",
  locale: "id_ID",
  ogImage: "/og-image.jpg",
  logo: "/icon-512.png",
  organizer: "SMK Telkom Malang",
  // Lokasi acara untuk schema.org Event (lihat EventJsonLd). Tanggal & jamnya
  // TIDAK di sini — diambil dari tahap terakhir timeline di Pengaturan admin.
  event: {
    venue: "SMK Telkom Malang",
    address: {
      streetAddress: "Jl. Danau Ranau, Sawojajar",
      addressLocality: "Kota Malang",
      addressRegion: "Jawa Timur",
      postalCode: "65139",
      addressCountry: "ID",
    },
  },
  social: {
    tiktok: "https://www.tiktok.com/@lpkbb.antareja",
    instagram: "https://www.instagram.com/lpkbb.antareja",
    youtube: "https://www.youtube.com/@lpkbb.antareja",
  },
  // Nomor WhatsApp resmi panitia untuk pertanyaan peserta/pengunjung. `number` format internasional
  // tanpa "+" / spasi (dipakai wa.me), `display` untuk ditampilkan.
  whatsapp: {
    number: "6285198240667",
    display: "+62 851-9824-0667",
    message: "Halo Panitia LPKBB Antareja, saya ingin bertanya.",
  },
} as const;
