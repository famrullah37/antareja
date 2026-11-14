import "server-only";
import prisma from "@/lib/prisma";
import { getKonfigUmum } from "@/queries/konfigUmum.query";
import { hargaJualFoto } from "@/lib/kuitansiPenjualan";
import type { PemilikFoto } from "@/lib/galeri";

// Bagi hasil penjualan foto premium (hanya transaksi VERIFIED):
// - Kas mencatat nominal yang dibayar = harga jual + kode unik.
// - Fotografer mendapat persenFotografer % dari HARGA JUAL (tanpa kode unik)
//   setiap foto miliknya yang terjual; sisanya + kode unik = panitia.
// - Pemilik foto = Foto.fotograferId (yang upload / dipilih admin); kosong =
//   fotografer album. Satu album/tim bisa berisi foto banyak fotografer.
// Pemilik diambil dari data SEKARANG, supaya admin bisa menetapkan/membetulkan
// fotografer setelah penjualan terjadi. Kalau foto/album/akun sudah terhapus,
// dipakai snapshot TransaksiFoto.pemilikFoto saat beli — riwayat pendapatan
// fotografer tidak hilang karena penghapusan.

export type BarisAlbum = { albumId: string; nama: string; harga: number };

type RingkasAlbum = {
  albumId: string;
  nama: string;
  fotograferId: string | null;
  transaksi: number;
  jumlahFoto: number;
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

// Bagi `total` rata ke `n` bagian bulat (sisa pembulatan ke bagian terakhir).
function bagiRata(total: number, n: number) {
  const dasar = Math.floor(total / n);
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? total - dasar * (n - 1) : dasar));
}

export async function hitungBagiHasilFoto() {
  const [transaksis, albums, konfig] = await Promise.all([
    prisma.transaksiFoto.findMany({
      where: { status: "VERIFIED" },
      select: { id: true, harga: true, kodeUnik: true, fotoList: true, rincianAlbum: true, persenFotografer: true, pemilikFoto: true },
    }),
    prisma.album.findMany({ select: { id: true, nama: true, harga: true, fotograferId: true } }),
    getKonfigUmum(),
  ]);
  const albumMap = new Map(albums.map((a) => [a.id, a]));
  const daftarFoto = (t: { fotoList: unknown }) => (Array.isArray(t.fotoList) ? (t.fotoList as string[]) : []);

  const semuaFotoId = Array.from(new Set(transaksis.flatMap(daftarFoto)));
  const fotos = semuaFotoId.length
    ? await prisma.foto.findMany({ where: { id: { in: semuaFotoId } }, select: { id: true, albumId: true, fotograferId: true } })
    : [];
  const fotoMap = new Map(fotos.map((f) => [f.id, f]));
  // Nama fotografer dari snapshot — cadangan bila akunnya sudah dihapus.
  const namaSnapshot = new Map<string, string>();
  const snapshotDari = (t: { pemilikFoto: unknown }) => (Array.isArray(t.pemilikFoto) ? (t.pemilikFoto as PemilikFoto[]) : []);
  for (const t of transaksis)
    for (const p of snapshotDari(t)) if (p.fotograferId && p.fotograferNama) namaSnapshot.set(p.fotograferId, p.fotograferNama);

  // key = fotograferId|albumId
  const perGrup = new Map<string, RingkasAlbum>();
  let totalKas = 0;
  let totalPenjualan = 0;

  for (const t of transaksis) {
    const hargaJual = hargaJualFoto(t);
    totalKas += t.harga;
    totalPenjualan += hargaJual;
    const persen = t.persenFotografer ?? konfig.persenFotografer;
    // Foto yang masih ada → data sekarang; foto terhapus → snapshot saat beli.
    const snapshot = new Map(snapshotDari(t).map((p) => [p.fotoId, p]));
    const fotoAda = daftarFoto(t)
      .map((id) => {
        const live = fotoMap.get(id);
        const p = snapshot.get(id);
        // Foto masih ada tapi pemiliknya kosong (mis. akun fotografer dihapus →
        // fotograferId di-SetNull) → pakai pemilik dari snapshot.
        if (live && !(live.fotograferId ?? albumMap.get(live.albumId)?.fotograferId) && p?.fotograferId)
          return { ...live, fotograferId: p.fotograferId };
        if (live) return live;
        return p ? { id: p.fotoId, albumId: p.albumId, fotograferId: p.fotograferId } : undefined;
      })
      .filter(Boolean) as (typeof fotos)[number][];

    // Rincian per album: snapshot saat beli; transaksi lama dibentuk dari harga album sekarang.
    let rincian: BarisAlbum[];
    if (Array.isArray(t.rincianAlbum)) {
      rincian = t.rincianAlbum as BarisAlbum[];
    } else {
      const ids = Array.from(new Set(fotoAda.map((f) => f.albumId)));
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

    // Harga tiap album dibagi rata ke foto-fotonya yang dibeli, lalu dikelompokkan
    // per pemilik foto. Foto yang sudah dihapus memakai snapshot pemiliknya.
    const grupTransaksi = new Map<string, { fotograferId: string | null; albumId: string; nama: string; jumlahFoto: number; harga: number }>();
    for (const r of rincian) {
      const fotoAlbum = fotoAda.filter((f) => f.albumId === r.albumId);
      const album = albumMap.get(r.albumId);
      const pecahan = bagiRata(r.harga, Math.max(1, fotoAlbum.length));
      const item = fotoAlbum.length
        ? fotoAlbum.map((f, i) => ({ fotograferId: f.fotograferId ?? album?.fotograferId ?? null, harga: pecahan[i], foto: 1 }))
        : [{ fotograferId: album?.fotograferId ?? null, harga: r.harga, foto: 0 }];
      for (const it of item) {
        const key = `${it.fotograferId ?? ""}|${r.albumId}`;
        const g = grupTransaksi.get(key) ?? { fotograferId: it.fotograferId, albumId: r.albumId, nama: album?.nama ?? r.nama, jumlahFoto: 0, harga: 0 };
        g.jumlahFoto += it.foto;
        g.harga += it.harga;
        grupTransaksi.set(key, g);
      }
    }

    for (const [key, g] of Array.from(grupTransaksi.entries())) {
      const baris = perGrup.get(key) ?? {
        albumId: g.albumId,
        nama: g.nama,
        fotograferId: g.fotograferId,
        transaksi: 0,
        jumlahFoto: 0,
        penjualan: 0,
        bagianFotografer: 0,
      };
      baris.transaksi += 1;
      baris.jumlahFoto += g.jumlahFoto;
      baris.penjualan += g.harga;
      baris.bagianFotografer += Math.round((g.harga * persen) / 100);
      perGrup.set(key, baris);
    }
  }

  const idFotografer = Array.from(new Set(Array.from(perGrup.values()).map((g) => g.fotograferId).filter(Boolean) as string[]));
  const namaFotografer = new Map(
    (idFotografer.length ? await prisma.user.findMany({ where: { id: { in: idFotografer } }, select: { id: true, nama: true } }) : []).map(
      (u) => [u.id, u.nama]
    )
  );

  const perFotografer = new Map<string, RingkasFotografer>();
  for (const a of Array.from(perGrup.values())) {
    const key = a.fotograferId ?? "";
    const f = perFotografer.get(key) ?? {
      fotograferId: a.fotograferId,
      nama: a.fotograferId
        ? namaFotografer.get(a.fotograferId) ?? (namaSnapshot.has(a.fotograferId) ? `${namaSnapshot.get(a.fotograferId)} (akun terhapus)` : "Akun terhapus")
        : "Belum ditentukan",
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
