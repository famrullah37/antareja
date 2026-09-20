// Konfigurasi situs (SEO & tautan resmi) — sengaja di kode, bukan database: jarang berubah dan
// tidak menambah kolom/query di tiap halaman. Ubah di sini lalu deploy. Video Antareja tetap
// diatur admin lewat Pengaturan karena memang sering diganti.
export const siteConfig = {
  name: "LKBB Antareja",
  title: "LKBB Antareja 2026 | Lomba Baris Berbaris SMK Telkom Malang",
  description:
    "Website resmi LKBB Antareja 2026, lomba keterampilan baris-berbaris tingkat Jawa Timur yang diselenggarakan SMK Telkom Malang. Daftarkan tim, lihat jadwal dan kategori lomba, galeri foto, serta dukung tim favoritmu.",
  keywords: [
    "LKBB Antareja",
    "Antareja",
    "lomba baris berbaris",
    "LKBB Jawa Timur",
    "lomba paskibra",
    "PBB",
    "SMK Telkom Malang",
    "pendaftaran LKBB",
  ],
  // Domain produksi. Sengaja konstanta (bukan NEXTAUTH_URL) supaya canonical/sitemap tidak ikut salah
  // kalau env server keliru.
  url: "https://antareja.smktelkom-mlg.sch.id",
  locale: "id_ID",
  ogImage: "/og-image.jpg",
  logo: "/icon-512.png",
  organizer: "SMK Telkom Malang",
  social: {
    tiktok: "https://www.tiktok.com/@lpkbb.antareja",
    instagram: "https://www.instagram.com/lpkbb.antareja",
    youtube: "https://www.youtube.com/@lpkbb.antareja",
  },
} as const;
