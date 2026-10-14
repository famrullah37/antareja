export interface ProtectedRoutes {
  title: string;
  path: string;
  roles: string[];
}

export const protectedRoutes: ProtectedRoutes[] = [
  { title: "Dashboard", path: "/admin", roles: ["ADMIN"] },
  { title: "User", path: "/admin/user", roles: ["ADMIN"] },
  { title: "Tim", path: "/admin/tim", roles: ["ADMIN", "SIE_LOMBA"] },
  { title: "Pembayaran", path: "/admin/pembayaran", roles: ["ADMIN", "BENDAHARA"] },
  { title: "Pengumuman", path: "/admin/pengumuman", roles: ["ADMIN", "SIE_LOMBA", "SIE_ACARA"] },
  { title: "Uji Coba Lapangan", path: "/admin/uji-coba", roles: ["ADMIN", "SIE_ACARA"] },
  { title: "Menginap", path: "/admin/menginap", roles: ["ADMIN", "SIE_ACARA"] },
  { title: "Basecamp", path: "/admin/basecamp", roles: ["ADMIN", "SIE_ACARA"] },
  { title: "Juri", path: "/admin/juri", roles: ["ADMIN", "SIE_LOMBA"] },
  { title: "Penghargaan", path: "/admin/penghargaan", roles: ["ADMIN", "SIE_LOMBA"] },
  { title: "Galeri", path: "/admin/galeri", roles: ["ADMIN"] },
  { title: "Sponsor", path: "/admin/sponsor", roles: ["ADMIN", "SIE_HUMAS"] },
  { title: "Berita", path: "/admin/berita", roles: ["ADMIN", "SIE_HUMAS"] },
  { title: "Konfigurasi Penilaian", path: "/admin/penilaian-baru", roles: ["ADMIN", "SIE_LOMBA"] },
  { title: "Penilaian", path: "/admin/penilaian-baru/input", roles: ["ADMIN", "SIE_LOMBA", "JURI"] },
  { title: "Tiket", path: "/admin/tiket", roles: ["ADMIN", "BENDAHARA"] },
  { title: "POS", path: "/admin/tiket/pos", roles: ["ADMIN", "BENDAHARA", "TIKET"] },
  { title: "Merchandise", path: "/admin/merchandise", roles: ["ADMIN", "BENDAHARA"] },
  { title: "Voting", path: "/admin/voting", roles: ["ADMIN", "BENDAHARA"] },
  // { title: "Scanner QR", path: "/admin/tiket/scanner", roles: ["ADMIN", "TIKET"] },
  { title: "Kas & Laporan", path: "/admin/kas", roles: ["ADMIN", "BENDAHARA"] },
  { title: "Sertifikat", path: "/admin/sertifikat", roles: ["ADMIN", "SIE_LOMBA"] },
  { title: "Log Aktivitas", path: "/admin/log-aktivitas", roles: ["ADMIN"] },
  { title: "Pengaturan", path: "/admin/pengaturan", roles: ["ADMIN"] },
];
