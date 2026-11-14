export const dynamic = "force-dynamic";
import {
  findNilaiDiskritMasters,
  findPelanggarans,
  findSubKategoriMasters,
  findJuriKategoris,
  findKategoriLombas,
  findPenilaianBarus,
} from "@/queries/penilaianBaru.query";
import { findJuris } from "@/queries/juri.query";
import { H1 } from "@/app/components/global/Text";
import MasterNilaiDiskritSection from "./components/MasterNilaiDiskritSection";
import SubKategoriSection from "./components/SubKategoriSection";
import PelanggaranSection from "./components/PelanggaranSection";
import JuriKategoriSection from "./components/JuriKategoriSection";
import KategoriLombaSection from "./components/KategoriLombaSection";
import RankingSection from "./components/RankingSection";
import { hitungKelengkapanNilai, ringkasKosong } from "@/lib/kelengkapanNilai";
import { labelGugur } from "@/lib/gugurTim";
import prisma from "@/lib/prisma";

export default async function PenilaianBaruPage() {
  const [nilaiMasters, subKategoris, pelanggarans, juris, juriKategoris, kategoriLombas, penilaians, kelengkapan, timGugur] =
    await Promise.all([
      findNilaiDiskritMasters(),
      findSubKategoriMasters(),
      findPelanggarans(),
      findJuris(),
      findJuriKategoris(),
      findKategoriLombas(),
      findPenilaianBarus(),
      hitungKelengkapanNilai(),
      prisma.tim.findMany({
        where: { confirmed: true, gugurAt: { not: null } },
        select: { id: true, nama_tim: true, asal_sekolah: true, jenjang: true, noUrut: true, gugurJenis: true },
        orderBy: [{ jenjang: "asc" }, { noUrut: "asc" }],
      }),
    ]);
  // Tim terkonfirmasi yang belum punya satu nilai pun — tidak muncul di tabel rekap.
  const adaPenilaian = new Set(penilaians.map((p) => p.timId));
  const timBelumDinilai = Object.values(kelengkapan).filter((k) => !adaPenilaian.has(k.timId));

  return (
    <div className="flex flex-col gap-10">
      <H1>Konfigurasi Penilaian</H1>

      <KategoriLombaSection kategoris={kategoriLombas} />

      <JuriKategoriSection juris={juris} juriKategoris={juriKategoris} kategoris={kategoriLombas} />

      <MasterNilaiDiskritSection masters={nilaiMasters} kategoris={kategoriLombas} />

      <SubKategoriSection subKategoris={subKategoris} kategoris={kategoriLombas} />

      <PelanggaranSection pelanggarans={pelanggarans} />

      <RankingSection
        penilaians={penilaians}
        kategoris={kategoriLombas}
        kelengkapan={Object.fromEntries(
          Object.values(kelengkapan).map((k) => [
            k.timId,
            { kosong: k.kosong, diharapkan: k.diharapkan, detail: ringkasKosong(k), yatim: k.yatim },
          ])
        )}
        timBelumDinilai={timBelumDinilai.map((k) => ({
          timId: k.timId,
          jenjang: k.jenjang,
          label: `${k.jenjang}-${String(k.noUrut ?? "?").padStart(2, "0")} ${k.namaTim} — ${k.asalSekolah}`,
        }))}
        timGugur={timGugur.map((t) => ({
          timId: t.id,
          label: `${t.jenjang}-${String(t.noUrut ?? "?").padStart(2, "0")} ${t.nama_tim} — ${t.asal_sekolah}`,
          status: labelGugur(t.gugurJenis),
        }))}
      />
    </div>
  );
}
