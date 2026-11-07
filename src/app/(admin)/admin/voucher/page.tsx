export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { H1 } from "@/app/components/global/Text";
import VoucherClient from "./components/VoucherClient";
import { bandingkanRanking, nilaiPenentuSeri } from "@/lib/rankingNilai";

export default async function VoucherPage() {
  const [vouchers, tims, nilai] = await Promise.all([
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
    // Urutan sama dengan "Ranking Otomatis" di /admin/penghargaan (nilaiAkhir desc per jenjang).
    prisma.penilaianBaru.findMany({
      select: {
        timId: true,
        nilaiAkhir: true,
        tim: { select: { jenjang: true } },
        nilaiJuri: { select: { nilaiDipilih: true, subKategori: { select: { kategori: true } } } },
      },
    }),
  ]);

  // Nilai sama → PBB lebih tinggi di atas, sama dengan ranking di Penghargaan.
  const urut = nilai
    .map((p) => ({ ...p, nilaiPBB: nilaiPenentuSeri(p.nilaiJuri) }))
    .sort(bandingkanRanking);
  const peringkat = new Map<string, number>();
  const hitung: Record<string, number> = {};
  for (const p of urut) {
    hitung[p.tim.jenjang] = (hitung[p.tim.jenjang] ?? 0) + 1;
    peringkat.set(p.timId, hitung[p.tim.jenjang]);
  }

  // sumberTimId sengaja bukan relasi (tim lama boleh dihapus) — cocokkan manual.
  const namaTim = new Map(tims.map((t) => [t.id, t.nama_tim]));
  const timPunyaVoucher = new Set(vouchers.map((v) => v.sumberTimId).filter(Boolean));

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
          punyaVoucher: timPunyaVoucher.has(t.id),
          peringkat: peringkat.get(t.id) ?? null,
        }))}
      />
    </div>
  );
}
