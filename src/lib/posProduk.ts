// Snapshot satu baris transaksi POS produk (disimpan di TransaksiPOS.items).
export type ItemPOS = {
  produkId: string;
  varianId: string;
  nama: string;
  varian: string; // "" = tanpa ukuran
  harga: number; // harga jual
  // Harga beli/modal saat transaksi (snapshot). null/undefined = belum diisi
  // atau transaksi lama sebelum kolom ini ada. Jangan dikirim ke halaman kasir.
  hargaBeli?: number | null;
  jumlah: number;
};

// Buang harga beli sebelum data dikirim ke kasir (petugas TIKET).
export function tanpaHargaBeli(items: ItemPOS[]): ItemPOS[] {
  return items.map(({ hargaBeli: _hb, ...i }) => i);
}

// Modal & laba dari transaksi yang tidak dibatalkan. Barang tanpa harga beli
// tidak ikut dihitung labanya (dicatat di nominalTanpaModal).
export function hitungLaba(items: ItemPOS[]) {
  let modal = 0;
  let laba = 0;
  let nominalTanpaModal = 0;
  for (const i of items) {
    if (i.hargaBeli == null) {
      nominalTanpaModal += i.harga * i.jumlah;
      continue;
    }
    modal += i.hargaBeli * i.jumlah;
    laba += (i.harga - i.hargaBeli) * i.jumlah;
  }
  return { modal, laba, nominalTanpaModal };
}

export const MAKS_JUMLAH_PER_ITEM_POS = 100;

// Cetak struk (printer thermal) dinonaktifkan dulu — ubah ke true untuk
// memunculkan lagi tombol "Cetak Struk" / "Struk" di kasir & riwayat.
export const CETAK_STRUK_AKTIF = false;

// Label ringkas untuk kas/log/struk, mis. "Kaos (L) × 2, Air Mineral × 3"
export function labelItemsPOS(items: ItemPOS[]) {
  return items.map((i) => `${i.nama}${i.varian ? ` (${i.varian})` : ""} × ${i.jumlah}`).join(", ");
}

// Nomor struk yang ditampilkan, mis. 7 → "POS-0007"
export function nomorStrukPOS(nomor: number) {
  return `POS-${String(nomor).padStart(4, "0")}`;
}

export function labelMetodePOS(metode: string) {
  return metode === "QRIS" ? "QRIS" : "Tunai";
}
