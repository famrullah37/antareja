export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { H1 } from "@/app/components/global/Text";
import VoucherClient from "./components/VoucherClient";
import { findKonfigJuaras } from "@/queries/penghargaan.query";
import { findKategoriLombas } from "@/queries/penilaianBaru.query";
import { hitungRankingJuara } from "@/lib/juaraPerJenjang";

export default async function VoucherPage() {
  const [vouchers, tims, nilai, konfigs, kategoriLombas] = await Promise.all([
    prisma.voucher.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { pembayaran: true } },
        pembayaran: { select: { tim: { select: { nama_tim: true, asal_sekolah: true } } }, take: 5 },
      },
    }),
    prisma.tim.findMany({
      orderBy: [{ jenjang: "asc" }, { nama_tim: "asc" }],
      select: { id: true, nama_tim: true, asal_sekolah: true, jenjang: true, confirmed: true },
    }),
    prisma.penilaianBaru.findMany({
      select: {
        tim: { select: { jenjang: true } },
        nilaiJuri: { select: { subKategori: { select: { kategori: true } } } },
      },
    }),
    findKonfigJuaras(),
    findKategoriLombas(),
  ]);

  // Peringkat, Juara Utama 1 & Juara Umum dihitung persis sama dengan
  // /admin/penghargaan (tim gugur tidak ikut) — dasar preset voucher juara.
  const { rankingData } = await hitungRankingJuara(konfigs, kategoriLombas, nilai);
  const peringkat = new Map<string, number>();
  const juara = new Map<string, ("UTAMA" | "UMUM")[]>();
  const seriJuara: string[] = [];
  for (const r of rankingData) {
    r.ranking.forEach((t, i) => peringkat.set(t.timId, i + 1));
    if (r.ranking[0]) juara.set(r.ranking[0].timId, ["UTAMA"]);
    if (r.juaraUmum) juara.set(r.juaraUmum.timId, [...(juara.get(r.juaraUmum.timId) ?? []), "UMUM"]);
    if (r.juaraUtamaSeri) seriJuara.push(`Juara Utama 1 ${r.jenjang}`);
    if (r.juaraUmumSeri) seriJuara.push(`Juara Umum ${r.jenjang}`);
  }

  // sumberTimId sengaja bukan relasi (tim lama boleh dihapus) — cocokkan manual.
  const namaTim = new Map(tims.map((t) => [t.id, t.nama_tim]));
  const voucherTim = new Map(
    vouchers.filter((v) => v.sumberTimId).map((v) => [v.sumberTimId!, { persen: v.persen, nilai: v.nilai, maksPotongan: v.maksPotongan, terpakai: v.jumlahDipakai > 0 }])
  );

  return (
    <div className="py-6 flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <H1>Voucher Pendaftaran</H1>
        <p className="text-sm text-gray-500">
          Potongan biaya pendaftaran tim. Potongan selalu dihitung dari biaya lunas: tim yang memilih DP tetap membayar
          DP normal, dan potongannya mengurangi sisa pelunasan.
        </p>
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
          Data tim &amp; user direset setelah kegiatan; voucher tetap tersimpan. Voucher pribadi terpasang{" "}
          <b>otomatis berdasarkan nama sekolah</b> saat pendaftaran berikutnya, jadi kode tidak wajib sampai ke peserta.
          Email hanya pemberitahuan tambahan. Pastikan ejaan nama sekolah di voucher sudah benar (bisa diubah di tabel).
        </p>
      </div>
      <VoucherClient
        vouchers={vouchers.map((v) => ({
          id: v.id,
          kode: v.kode,
          keterangan: v.keterangan,
          persen: v.persen,
          nilai: v.nilai,
          maksPotongan: v.maksPotongan,
          jenjang: v.jenjang,
          asalSekolah: v.asalSekolah,
          kuota: v.kuota,
          aktif: v.aktif,
          pribadi: !!v.sumberTimId,
          // Snapshot dulu — tim asli hilang setelah data tim direset.
          sumberTim: v.sumberTimId ? v.penerimaNama ?? namaTim.get(v.sumberTimId) ?? "(tim sudah dihapus)" : null,
          penerimaEmail: v.penerimaEmail,
          penerimaTelp: v.penerimaTelp,
          emailTerkirimAt: v.emailTerkirimAt?.toISOString() ?? null,
          terpakai: v.jumlahDipakai,
          dirujukPembayaran: v._count.pembayaran,
          dipakaiOleh: v.pembayaran.map((p) => `${p.tim.nama_tim} — ${p.tim.asal_sekolah}`),
        }))}
        tims={tims.map((t) => ({
          ...t,
          voucher: voucherTim.get(t.id) ?? null,
          peringkat: peringkat.get(t.id) ?? null,
          juara: juara.get(t.id) ?? [],
        }))}
        seriJuara={seriJuara}
      />
    </div>
  );
}
