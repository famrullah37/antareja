import "server-only";
import prisma from "@/lib/prisma";
import { getKonfigUmum } from "@/queries/konfigUmum.query";
import { hargaJualFoto } from "@/lib/kuitansiPenjualan";

// Bagi hasil penjualan foto premium (hanya transaksi VERIFIED):
// - Kas mencatat nominal yang dibayar = harga jual + kode unik.
// - Fotografer mendapat persenFotografer % dari HARGA JUAL (tanpa kode unik),
//   dihitung per album (harga per foto × jumlah foto); sisanya + kode unik = panitia.
// Fotografer album diambil dari data album SEKARANG, supaya admin bisa
// menetapkan/membetulkan pemilik album setelah penjualan terjadi.

export type BarisAlbum = { albumId: string; nama: string; harga: number };

type RingkasAlbum = {
  albumId: string;
  nama: string;
  fotograferId: string | null;
  transaksi: number;
  penjualan: number;
  bagianFotografer: number;
};

export type RingkasFotografer = {
  fotograferId: string | null;
  nama: string;
  transaksi: number;
  penjualan: number;
  bagianFotografer: number;
  bagianPanitia: number;
  albums: RingkasAlbum[];
};

export async function hitungBagiHasilFoto() {
  const [transaksis, albums, konfig] = await Promise.all([
    prisma.transaksiFoto.findMany({
      where: { status: "VERIFIED" },
      select: { harga: true, kodeUnik: true, fotoList: true, rincianAlbum: true, persenFotografer: true },
    }),
    prisma.album.findMany({ select: { id: true, nama: true, harga: true, fotograferId: true, fotografer: { select: { nama: true } } } }),
    getKonfigUmum(),
  ]);
  const albumMap = new Map(albums.map((a) => [a.id, a]));

  // Transaksi lama (sebelum ada snapshot rincianAlbum): rincian dibentuk dari
  // album foto-foto yang dibeli dengan harga album sekarang.
  const fotoIdsLama = transaksis
    .filter((t) => !Array.isArray(t.rincianAlbum))
    .flatMap((t) => (Array.isArray(t.fotoList) ? (t.fotoList as string[]) : []));
  const fotos = fotoIdsLama.length
    ? await prisma.foto.findMany({ where: { id: { in: fotoIdsLama } }, select: { id: true, albumId: true } })
    : [];
  const albumFoto = new Map(fotos.map((f) => [f.id, f.albumId]));

  const perAlbum = new Map<string, RingkasAlbum>();
  let totalKas = 0;
  let totalPenjualan = 0;

  for (const t of transaksis) {
    const hargaJual = hargaJualFoto(t);
    totalKas += t.harga;
    totalPenjualan += hargaJual;
    const persen = t.persenFotografer ?? konfig.persenFotografer;

    let rincian: BarisAlbum[];
    if (Array.isArray(t.rincianAlbum)) {
      rincian = t.rincianAlbum as BarisAlbum[];
    } else {
      const ids = Array.from(
        new Set((Array.isArray(t.fotoList) ? (t.fotoList as string[]) : []).map((id) => albumFoto.get(id)).filter(Boolean) as string[])
      );
      rincian = ids.map((id) => ({ albumId: id, nama: albumMap.get(id)?.nama ?? "Album terhapus", harga: albumMap.get(id)?.harga ?? 0 }));
    }
    // Pastikan jumlah rincian = harga jual sebenarnya (harga album bisa berubah
    // setelah transaksi lama terjadi) — sisihkan selisihnya secara proporsional.
    const jumlahRincian = rincian.reduce((s, r) => s + r.harga, 0);
    if (rincian.length === 0) rincian = [{ albumId: "-", nama: "Album tidak diketahui", harga: hargaJual }];
    else if (jumlahRincian !== hargaJual) {
      let sisa = hargaJual;
      rincian = rincian.map((r, i) => {
        const h =
          i === rincian.length - 1
            ? sisa
            : jumlahRincian > 0
              ? Math.round((r.harga / jumlahRincian) * hargaJual)
              : Math.floor(hargaJual / rincian.length);
        sisa -= h;
        return { ...r, harga: h };
      });
    }

    for (const r of rincian) {
      const a = albumMap.get(r.albumId);
      const baris = perAlbum.get(r.albumId) ?? {
        albumId: r.albumId,
        nama: a?.nama ?? r.nama,
        fotograferId: a?.fotograferId ?? null,
        transaksi: 0,
        penjualan: 0,
        bagianFotografer: 0,
      };
      baris.transaksi += 1;
      baris.penjualan += r.harga;
      baris.bagianFotografer += Math.round((r.harga * persen) / 100);
      perAlbum.set(r.albumId, baris);
    }
  }

  const namaFotografer = new Map(albums.filter((a) => a.fotograferId).map((a) => [a.fotograferId!, a.fotografer?.nama ?? "-"]));
  const perFotografer = new Map<string, RingkasFotografer>();
  for (const a of Array.from(perAlbum.values())) {
    const key = a.fotograferId ?? "";
    const f = perFotografer.get(key) ?? {
      fotograferId: a.fotograferId,
      nama: a.fotograferId ? namaFotografer.get(a.fotograferId) ?? "-" : "Belum ditentukan",
      transaksi: 0,
      penjualan: 0,
      bagianFotografer: 0,
      bagianPanitia: 0,
      albums: [],
    };
    f.transaksi += a.transaksi;
    f.penjualan += a.penjualan;
    f.bagianFotografer += a.bagianFotografer;
    f.bagianPanitia += a.penjualan - a.bagianFotografer;
    f.albums.push(a);
    perFotografer.set(key, f);
  }

  const fotografer = Array.from(perFotografer.values()).sort((x, y) => y.penjualan - x.penjualan);
  return {
    persenFotografer: konfig.persenFotografer,
    biayaAdminPenarikan: konfig.biayaAdminPenarikan,
    jumlahTransaksi: transaksis.length,
    totalKas,
    totalPenjualan,
    // Selisih kas & harga jual (kode unik) — seluruhnya bagian panitia.
    totalKodeUnik: totalKas - totalPenjualan,
    totalFotografer: fotografer.reduce((s, f) => s + f.bagianFotografer, 0),
    fotografer,
  };
}

// Penarikan per fotografer: DIBAYAR = sudah ditransfer, PENDING = sedang diajukan
// (ikut mengurangi saldo supaya tidak bisa diajukan dua kali).
export async function ringkasPenarikan(fotograferId?: string) {
  const rows = await prisma.penarikanFotografer.groupBy({
    by: ["fotograferId", "status"],
    where: { status: { in: ["PENDING", "DIBAYAR"] }, ...(fotograferId ? { fotograferId } : {}) },
    _sum: { jumlah: true },
  });
  const map = new Map<string, { dibayar: number; diajukan: number }>();
  for (const r of rows) {
    const m = map.get(r.fotograferId) ?? { dibayar: 0, diajukan: 0 };
    if (r.status === "DIBAYAR") m.dibayar += r._sum.jumlah ?? 0;
    else m.diajukan += r._sum.jumlah ?? 0;
    map.set(r.fotograferId, m);
  }
  return map;
}

export async function saldoFotografer(fotograferId: string) {
  const [hasil, penarikan] = await Promise.all([hitungBagiHasilFoto(), ringkasPenarikan(fotograferId)]);
  const f = hasil.fotografer.find((x) => x.fotograferId === fotograferId);
  const p = penarikan.get(fotograferId) ?? { dibayar: 0, diajukan: 0 };
  const pendapatan = f?.bagianFotografer ?? 0;
  return {
    persenFotografer: hasil.persenFotografer,
    biayaAdminPenarikan: hasil.biayaAdminPenarikan,
    penjualan: f?.penjualan ?? 0,
    pendapatan,
    dibayar: p.dibayar,
    diajukan: p.diajukan,
    saldo: pendapatan - p.dibayar - p.diajukan,
    albums: f?.albums ?? [],
  };
}
