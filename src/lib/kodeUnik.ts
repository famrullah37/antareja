// Masa berlaku kode unik untuk pembayaran QRIS — dihitung sejak kode dicadangkan.
// Lewat dari ini QRIS (nominal + kode unik) tidak ditampilkan lagi dan pesanan
// QRIS dengan kode itu ditolak; pembeli diminta membuat kode baru.
export const BERLAKU_KODE_MENIT = 60;
export const BERLAKU_KODE_MS = BERLAKU_KODE_MENIT * 60 * 1000;
