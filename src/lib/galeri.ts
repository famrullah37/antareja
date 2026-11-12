// Foto gratis = albumnya bertipe GRATIS, atau fotonya ditandai gratis di album
// berbayar. Dipakai di galeri publik, keranjang, beliFoto, & preview beranda —
// semuanya harus memakai aturan yang sama.
export function fotoGratis(f: { gratis?: boolean | null; album: { tipe: string } }) {
  return f.album.tipe === "GRATIS" || !!f.gratis;
}
