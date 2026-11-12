// Snapshot pemilik foto per transaksi (TransaksiFoto.pemilikFoto).
export type PemilikFoto = {
  fotoId: string;
  albumId: string;
  fotograferId: string | null;
  fotograferNama: string | null;
};

// Link unduhan foto berlaku sekian hari SEJAK DIVERIFIKASI (bukan sejak checkout
// — dulu verifikasi yang lambat ikut memotong masa unduh pembeli). Admin bisa
// memperpanjang dari tabel Transaksi Foto.
export const MASA_UNDUH_HARI = 30;
export function batasUnduhDari(mulai: Date = new Date()) {
  return new Date(mulai.getTime() + MASA_UNDUH_HARI * 24 * 60 * 60 * 1000);
}

// Batas jumlah foto sekali upload (form & server).
export const MAKS_FOTO_PER_UPLOAD = 10;

// Foto gratis = albumnya bertipe GRATIS, atau fotonya ditandai gratis di album
// berbayar. Dipakai di galeri publik, keranjang, beliFoto, & preview beranda —
// semuanya harus memakai aturan yang sama.
export function fotoGratis(f: { gratis?: boolean | null; album: { tipe: string } }) {
  return f.album.tipe === "GRATIS" || !!f.gratis;
}
