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

// Kode tiket pendek untuk dibaca/diketik manusia (WA, email, input manual scanner):
// 8 karakter pertama token QR (UUID), mis. "00a8a3f2-…" → "00A8-A3F2". Gambar QR
// tetap berisi token lengkap; scanner menerima keduanya.
export function kodeTiketPendek(token: string) {
  const h = token.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `${h.slice(0, 4)}-${h.slice(4)}`;
}

// "00A8-A3F2" / "00a8a3f2" → "00a8a3f2" (awalan token), null kalau bukan kode pendek.
export function awalanDariKodePendek(input: string) {
  const h = input.trim().replace(/[\s-]/g, "").toLowerCase();
  return /^[0-9a-f]{8}$/.test(h) ? h : null;
}

// Nama tampilan jenis tiket untuk pembeli: "Tiket <jenis>", kecuali jenisnya
// sudah diawali kata "Tiket" (mis. admin menamai "Tiket Wajib") — supaya tidak
// tampil "Tiket Tiket Wajib".
export function namaTiket(jenis: string) {
  const j = jenis.trim();
  return /^tiket\b/i.test(j) ? j : `Tiket ${j}`;
}
