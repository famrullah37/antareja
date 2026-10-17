// Helper pemesanan makanan (lihat actions/Makanan.ts).

// Snapshot satu baris pesanan (disimpan di PesananMakanan.items).
export type ItemMakanan = {
  menuId: string;
  nama: string;
  harga: number;
  jumlah: number;
};

export const MAKS_PORSI_PER_MENU = 200;

export const STATUS_MAKANAN = {
  PENDING: { label: "Menunggu verifikasi", badge: "bg-yellow-100 text-yellow-700" },
  VERIFIED: { label: "Lunas", badge: "bg-green-100 text-green-700" },
  REJECTED: { label: "Ditolak", badge: "bg-red-100 text-red-700" },
  DIAMBIL: { label: "Sudah diambil", badge: "bg-blue-100 text-blue-700" },
} as const;

export type StatusMakanan = keyof typeof STATUS_MAKANAN;

// Sesi terbuka untuk dipesan: aktif dan belum lewat batas pesan (kalau kosong,
// sampai waktu makan).
export function sesiTerbuka(sesi: { aktif: boolean; waktu: Date; batasPesan: Date | null }, now = new Date()) {
  if (!sesi.aktif) return false;
  return now < new Date(sesi.batasPesan ?? sesi.waktu);
}

// Label ringkas untuk kas/log, mis. "Nasi Ayam × 20, Air Mineral × 20"
export function labelItemsMakanan(items: ItemMakanan[]) {
  return items.map((i) => `${i.nama} × ${i.jumlah}`).join(", ");
}

export function totalPorsi(items: ItemMakanan[]) {
  return items.reduce((s, i) => s + i.jumlah, 0);
}
