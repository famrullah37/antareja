export interface ProtectedRoutes {
  title: string;
  path: string;
  roles: string[];
}

export const protectedRoutes: ProtectedRoutes[] = [
  { title: "Dashboard", path: "/admin", roles: ["ADMIN"] },
  { title: "User", path: "/admin/user", roles: ["ADMIN"] },
  { title: "Tim", path: "/admin/tim", roles: ["ADMIN"] },
  { title: "Pembayaran", path: "/admin/pembayaran", roles: ["ADMIN", "BENDAHARA"] },
  { title: "Pengumuman", path: "/admin/pengumuman", roles: ["ADMIN"] },
  { title: "Juri", path: "/admin/juri", roles: ["ADMIN"] },
  { title: "Penghargaan", path: "/admin/penghargaan", roles: ["ADMIN"] },
  { title: "Galeri", path: "/admin/galeri", roles: ["ADMIN"] },
  { title: "Sponsor", path: "/admin/sponsor", roles: ["ADMIN"] },
  { title: "Konfigurasi Penilaian", path: "/admin/penilaian-baru", roles: ["ADMIN"] },
  { title: "Penilaian", path: "/admin/penilaian-baru/input", roles: ["ADMIN", "JURI"] },
  { title: "Tiket", path: "/admin/tiket", roles: ["ADMIN"] },
  { title: "POS", path: "/admin/tiket/pos", roles: ["ADMIN", "TIKET"] },
  // { title: "Scanner QR", path: "/admin/tiket/scanner", roles: ["ADMIN", "TIKET"] },
  { title: "Kas & Laporan", path: "/admin/kas", roles: ["ADMIN", "BENDAHARA"] },
  { title: "Sertifikat", path: "/admin/sertifikat", roles: ["ADMIN"] },
  { title: "Pengaturan", path: "/admin/pengaturan", roles: ["ADMIN"] },
];
