// Status tiket wajib tim (Tiket.khususTim), dihitung PER JENIS tiket wajib:
// tim baru dianggap "SUDAH" kalau semua jenis tiket wajib sudah terverifikasi.
// Dipakai dashboard tim & rekap admin supaya keduanya selalu sama.

export type StatusTiketWajib = "SUDAH" | "MENUNGGU" | "BELUM";

type Transaksi = { tiketId: string; status: string; jumlah: number };

export function statusPerJenis(tiketIds: string[], transaksi: Transaksi[]) {
  return tiketIds.map((tiketId) => {
    const milik = transaksi.filter((t) => t.tiketId === tiketId);
    const lunas = milik.filter((t) => t.status === "VERIFIED").reduce((n, t) => n + t.jumlah, 0);
    const menunggu = milik.filter((t) => t.status === "PENDING").reduce((n, t) => n + t.jumlah, 0);
    const status: StatusTiketWajib = lunas > 0 ? "SUDAH" : menunggu > 0 ? "MENUNGGU" : "BELUM";
    return { tiketId, lunas, menunggu, status };
  });
}

// Gabungan: SUDAH kalau semua jenis SUDAH; BELUM kalau ada jenis yang belum
// dipesan sama sekali; selain itu MENUNGGU (semua sudah dipesan, sebagian
// belum diverifikasi).
export function statusGabungan(perJenis: { status: StatusTiketWajib }[]): StatusTiketWajib {
  if (perJenis.some((j) => j.status === "BELUM")) return "BELUM";
  if (perJenis.every((j) => j.status === "SUDAH")) return "SUDAH";
  return "MENUNGGU";
}
