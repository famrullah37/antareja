// Snapshot satu baris pesanan merchandise (disimpan di PesananMerch.items).
export type ItemPesanan = {
  merchId: string;
  nama: string;
  ukuran: string | null;
  harga: number; // harga jual
  // Harga beli/produksi saat pesan (snapshot). null/undefined = belum diisi
  // atau pesanan lama. Khusus panitia.
  hargaBeli?: number | null;
  jumlah: number;
};

// Modal (bayar vendor) dari item pesanan. Item tanpa harga beli tidak ikut
// dihitung; jumlah barangnya dicatat di barangTanpaHargaBeli.
export function hitungModalMerch(items: ItemPesanan[]) {
  let modal = 0;
  let barangTanpaHargaBeli = 0;
  for (const i of items) {
    if (i.hargaBeli == null) barangTanpaHargaBeli += i.jumlah;
    else modal += i.hargaBeli * i.jumlah;
  }
  return { modal, barangTanpaHargaBeli };
}

// "S, M ,L" → ["S", "M", "L"]; kosong = produk tanpa pilihan ukuran.
export function daftarUkuran(ukuran: string | null | undefined): string[] {
  return (ukuran ?? "")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);
}

// PO terbuka kalau diaktifkan admin dan belum lewat batas tutup.
export function poTerbuka(
  konfig: { poAktif: boolean; tutupPada: Date | null } | null,
  now = new Date()
) {
  if (!konfig?.poAktif) return false;
  return !konfig.tutupPada || now <= konfig.tutupPada;
}

// Label ringkas untuk kas/log/email, mis. "Kaos Hitam (L) × 2, Topi × 1"
export function labelItems(items: ItemPesanan[]) {
  return items
    .map((i) => `${i.nama}${i.ukuran ? ` (${i.ukuran})` : ""} × ${i.jumlah}`)
    .join(", ");
}

export const STATUS_PESANAN_MERCH = ["PENDING", "VERIFIED", "REJECTED", "DIAMBIL"] as const;
