export interface ProtectedRoutes {
  title: string;
  path: string;
  roles: string[];
  // Judul kelompok di sidebar/menu mobile. Urutan kelompok = urutan
  // kemunculan pertamanya di daftar ini.
  group: string;
}

// Hak akses sebenarnya ditegakkan di src/middleware.ts — roles di sini hanya
// menentukan menu yang tampil; keduanya harus diubah bersamaan.
export const protectedRoutes: ProtectedRoutes[] = [
  // Utama
  { group: "Utama", title: "Dashboard", path: "/admin", roles: ["ADMIN"] },
  { group: "Utama", title: "Pengumuman", path: "/admin/pengumuman", roles: ["ADMIN", "SIE_LOMBA", "SIE_ACARA"] },
  { group: "Utama", title: "Saran & Masukan", path: "/admin/saran", roles: ["ADMIN", "SIE_LOMBA", "SIE_ACARA"] },

  // Peserta
  { group: "Peserta", title: "Tim", path: "/admin/tim", roles: ["ADMIN", "SIE_LOMBA"] },
  { group: "Peserta", title: "Presensi DP", path: "/admin/presensi-dp", roles: ["ADMIN", "SIE_LOMBA"] },
  { group: "Peserta", title: "Pembayaran", path: "/admin/pembayaran", roles: ["ADMIN", "BENDAHARA"] },
  { group: "Peserta", title: "Voucher", path: "/admin/voucher", roles: ["ADMIN", "BENDAHARA"] },

  // Acara
  { group: "Acara", title: "Uji Coba Lapangan", path: "/admin/uji-coba", roles: ["ADMIN", "SIE_ACARA"] },
  { group: "Acara", title: "Menginap", path: "/admin/menginap", roles: ["ADMIN", "SIE_ACARA"] },
  { group: "Acara", title: "Basecamp", path: "/admin/basecamp", roles: ["ADMIN", "SIE_ACARA"] },
  { group: "Acara", title: "Pemesanan Makanan", path: "/admin/makanan", roles: ["ADMIN", "BENDAHARA", "SIE_ACARA"] },

  // Lomba & Penilaian
  { group: "Lomba & Penilaian", title: "Juri", path: "/admin/juri", roles: ["ADMIN", "SIE_LOMBA"] },
  { group: "Lomba & Penilaian", title: "Konfigurasi Penilaian", path: "/admin/penilaian-baru", roles: ["ADMIN", "SIE_LOMBA"] },
  { group: "Lomba & Penilaian", title: "Penilaian", path: "/admin/penilaian-baru/input", roles: ["ADMIN", "SIE_LOMBA", "JURI"] },
  { group: "Lomba & Penilaian", title: "Penghargaan", path: "/admin/penghargaan", roles: ["ADMIN", "SIE_LOMBA"] },
  { group: "Lomba & Penilaian", title: "Sertifikat", path: "/admin/sertifikat", roles: ["ADMIN", "SIE_LOMBA"] },
  { group: "Lomba & Penilaian", title: "Voting", path: "/admin/voting", roles: ["ADMIN", "BENDAHARA"] },

  // Tiket & Penjualan
  { group: "Tiket & Penjualan", title: "Tiket", path: "/admin/tiket", roles: ["ADMIN", "BENDAHARA"] },
  { group: "Tiket & Penjualan", title: "POS Tiket", path: "/admin/tiket/pos", roles: ["ADMIN", "BENDAHARA", "TIKET"] },
  { group: "Tiket & Penjualan", title: "Scanner Tiket", path: "/admin/tiket/scanner", roles: ["ADMIN", "BENDAHARA"] },
  { group: "Tiket & Penjualan", title: "Kasir Produk", path: "/admin/pos-produk/kasir", roles: ["ADMIN", "BENDAHARA", "TIKET"] },
  { group: "Tiket & Penjualan", title: "Produk POS", path: "/admin/pos-produk", roles: ["ADMIN", "BENDAHARA"] },
  { group: "Tiket & Penjualan", title: "Merchandise", path: "/admin/merchandise", roles: ["ADMIN", "BENDAHARA"] },

  // Keuangan
  { group: "Keuangan", title: "Kas & Laporan", path: "/admin/kas", roles: ["ADMIN", "BENDAHARA"] },
  { group: "Keuangan", title: "Kuitansi", path: "/admin/kuitansi", roles: ["ADMIN", "BENDAHARA"] },

  // Galeri
  { group: "Galeri", title: "Galeri", path: "/admin/galeri", roles: ["ADMIN", "FOTOGRAFER"] },
  { group: "Galeri", title: "Foto Ter-upload", path: "/admin/galeri/foto", roles: ["ADMIN", "FOTOGRAFER"] },
  { group: "Galeri", title: "Transaksi Foto", path: "/admin/galeri/transaksi", roles: ["ADMIN", "BENDAHARA"] },
  { group: "Galeri", title: "Bagi Hasil Foto", path: "/admin/galeri/bagi-hasil", roles: ["ADMIN", "BENDAHARA"] },
  { group: "Galeri", title: "Pendapatan Saya", path: "/admin/galeri/pendapatan", roles: ["FOTOGRAFER"] },

  // Humas
  { group: "Humas", title: "Sponsor", path: "/admin/sponsor", roles: ["ADMIN", "SIE_HUMAS"] },
  { group: "Humas", title: "Berita", path: "/admin/berita", roles: ["ADMIN", "SIE_HUMAS"] },

  // Sistem
  { group: "Sistem", title: "User", path: "/admin/user", roles: ["ADMIN"] },
  { group: "Sistem", title: "Log Aktivitas", path: "/admin/log-aktivitas", roles: ["ADMIN"] },
  { group: "Sistem", title: "Pengaturan", path: "/admin/pengaturan", roles: ["ADMIN"] },
];

// Menu yang boleh dilihat role ini, dikelompokkan sesuai urutan di atas.
export function menuPerKelompok(role?: string) {
  const kelompok: { group: string; items: ProtectedRoutes[] }[] = [];
  for (const item of protectedRoutes) {
    if (!role || !item.roles.includes(role)) continue;
    let g = kelompok.find((k) => k.group === item.group);
    if (!g) kelompok.push((g = { group: item.group, items: [] }));
    g.items.push(item);
  }
  return kelompok;
}
