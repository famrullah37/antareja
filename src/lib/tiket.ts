// Nominal yang benar-benar dibayar untuk satu transaksi tiket:
// harga tiket × jumlah + harga bundling (snapshot) × jumlah paket + kode unik.
// Tiket offline tidak punya kodeUnik, jadi otomatis 0.
export function totalBayarTiket(tr: {
  jumlah: number;
  kodeUnik: string | null;
  bundleJumlah: number;
  bundleHarga: number;
  tiket: { harga: number };
}) {
  return (
    tr.tiket.harga * tr.jumlah +
    tr.bundleHarga * tr.bundleJumlah +
    (tr.kodeUnik ? parseInt(tr.kodeUnik) : 0)
  );
}

export function punyaBundling(t: { bundleHarga: number | null; bundleIsi: string | null }) {
  return !!t.bundleHarga && t.bundleHarga > 0 && !!t.bundleIsi?.trim();
}

// Label keterangan kas/log, mis. " + Bundling 2 Air Minum × 3"
export function labelBundling(tr: { bundleJumlah: number; bundleIsi: string | null }) {
  return tr.bundleJumlah > 0 ? ` + Bundling ${tr.bundleIsi ?? ""} × ${tr.bundleJumlah}` : "";
}
