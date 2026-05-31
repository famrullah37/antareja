import { findTim } from "@/queries/tim.query";
import { findJuris } from "@/queries/juri.query";
import {
  findNilaiDiskritMasters,
  findPenilaianBaru,
  findPelanggarans,
  findSubKategoriMasters,
  findJuriKategoris,
} from "@/queries/penilaianBaru.query";
import { notFound } from "next/navigation";
import InputNilaiForm from "./InputNilaiForm";

export default async function InputNilaiPage({
  params,
}: {
  params: { timId: string };
}) {
  const [tim, juris, subKategoris, nilaiMasters, pelanggarans, juriKategoris] =
    await Promise.all([
      findTim({ id: params.timId }, {}),
      findJuris(),
      findSubKategoriMasters({ aktif: true }),
      findNilaiDiskritMasters(),
      findPelanggarans(),
      findJuriKategoris(),
    ]);

  if (!tim) return notFound();

  const existing = await findPenilaianBaru({ timId: params.timId });

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{tim.nama_tim}</h1>
        <p className="text-gray-500">
          {tim.asal_sekolah} — {tim.jenjang}
        </p>
      </div>
      <InputNilaiForm
        tim={tim as any}
        juris={juris}
        subKategoris={subKategoris}
        nilaiMasters={nilaiMasters as any}
        pelanggarans={pelanggarans}
        juriKategoris={juriKategoris as any}
        existing={existing as any}
      />
    </div>
  );
}
