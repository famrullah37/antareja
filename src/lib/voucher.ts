import { Jenjang, Voucher } from "@prisma/client";
import type prisma from "@/lib/prisma";

// Client Prisma biasa ATAU transaksi (tx) — sama pola dengan getKuotaJenjang
// di registrationForm.ts (client proyek ini di-extend, jadi bukan TransactionClient).
type KlienVoucher = {
  voucher: Pick<typeof prisma.voucher, "findUnique">;
  $queryRaw: (typeof prisma)["$queryRaw"];
};

// Voucher yang dikunci ke sekolah berlaku OTOMATIS tanpa mengetik kode: data
// official/email tim lama belum tentu dipakai lagi tahun berikutnya (dan Tim/User
// direset setelah kegiatan), yang pasti sama hanya nama sekolahnya. Kalau satu
// sekolah punya beberapa voucher (mis. dua tim tahun lalu), dipakai satu per
// pendaftaran, yang paling lama dibuat lebih dulu. Tabel Voucher kecil, jadi
// pencocokan nama sekolah (normalisasiSekolah) cukup di JS.
export async function cariVoucherSekolah(
  client: { voucher: Pick<typeof prisma.voucher, "findMany"> },
  asalSekolah: string,
  jenjang: Jenjang
): Promise<Voucher | null> {
  const kunci = normalisasiSekolah(asalSekolah);
  if (!kunci) return null;
  const kandidat = await client.voucher.findMany({
    where: { aktif: true, asalSekolah: { not: null }, OR: [{ jenjang: null }, { jenjang }] },
    orderBy: { createdAt: "asc" },
  });
  return (
    kandidat.find(
      (v) => normalisasiSekolah(v.asalSekolah!) === kunci && (v.kuota == null || v.jumlahDipakai < v.kuota)
    ) ?? null
  );
}

// Kode voucher tidak peka huruf besar/kecil & spasi — disimpan dan dicocokkan
// dalam bentuk ini.
export function normalisasiKode(kode: string) {
  return kode.trim().toUpperCase().replace(/\s+/g, "");
}

// Asal sekolah diketik bebas di form pendaftaran, jadi "SMP Negeri 1 Malang",
// "SMPN 1 Malang" dan "smp n 1 malang." harus dianggap sekolah yang sama saat
// mencocokkan voucher pribadi yang dikunci ke sekolah.
export function normalisasiSekolah(nama: string) {
  return nama
    .toLowerCase()
    .replace(/\bnegeri\b/g, "n")
    .replace(/\bswasta\b/g, "s")
    .replace(/[^a-z0-9]/g, "");
}

// Potongan dalam rupiah, dihitung dari biaya LUNAS jenjang tim. Tidak pernah
// melebihi biaya lunas itu sendiri.
export function hitungPotongan(v: Pick<Voucher, "persen" | "nilai" | "maksPotongan">, biayaLunas: number) {
  let potongan = v.persen ? Math.floor((biayaLunas * v.nilai) / 100) : v.nilai;
  if (v.persen && v.maksPotongan != null) potongan = Math.min(potongan, v.maksPotongan);
  return Math.max(0, Math.min(potongan, biayaLunas));
}

export function labelNilai(v: Pick<Voucher, "persen" | "nilai" | "maksPotongan">) {
  const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
  if (!v.persen) return rp(v.nilai);
  return v.maksPotongan != null ? `${v.nilai}% (maks ${rp(v.maksPotongan)})` : `${v.nilai}%`;
}

type HasilCek = { ok: true; voucher: Voucher } | { ok: false; message: string };

// Validasi voucher untuk satu pendaftaran. Dipakai saat pratinjau nominal
// (reserveKodePendaftaran) dan sekali lagi di dalam transaksi submit dengan
// kunci=true: baris voucher dikunci FOR UPDATE supaya dua tim yang submit
// bersamaan tidak sama-sama lolos dari batas kuota.
export async function cekVoucher(
  client: KlienVoucher,
  kodeMentah: string,
  data: { jenjang: Jenjang; asalSekolah: string },
  kunci = false
): Promise<HasilCek> {
  const kode = normalisasiKode(kodeMentah);
  if (!kode) return { ok: false, message: "Kode voucher kosong" };

  if (kunci) await client.$queryRaw`SELECT id FROM "Voucher" WHERE kode = ${kode} FOR UPDATE`;
  const voucher = await client.voucher.findUnique({ where: { kode } });

  if (!voucher || !voucher.aktif) return { ok: false, message: "Kode voucher tidak ditemukan atau tidak berlaku" };
  if (voucher.jenjang && voucher.jenjang !== data.jenjang)
    return { ok: false, message: `Voucher ini hanya berlaku untuk jenjang ${voucher.jenjang}` };
  if (voucher.asalSekolah) {
    if (!data.asalSekolah.trim()) return { ok: false, message: "Isi asal sekolah dulu sebelum memakai voucher ini" };
    if (normalisasiSekolah(voucher.asalSekolah) !== normalisasiSekolah(data.asalSekolah))
      return { ok: false, message: `Voucher ini khusus untuk ${voucher.asalSekolah}` };
  }
  // jumlahDipakai, bukan hitungan Pembayaran: Pembayaran ikut terhapus saat
  // data tim direset setelah kegiatan, voucher sekali-pakai tidak boleh pulih.
  if (voucher.kuota != null && voucher.jumlahDipakai >= voucher.kuota)
    return { ok: false, message: "Kuota voucher ini sudah habis" };
  return { ok: true, voucher };
}
