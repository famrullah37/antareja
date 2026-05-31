"use client";

import { tugaskanJuriKategori } from "@/actions/PenilaianBaru";
import { Juri } from "@prisma/client";
import { toast } from "sonner";

type JuriKategoriWithJuri = {
  id: string;
  juriId: string;
  kategori: string;
  juri: Juri;
};

export default function JuriKategoriSection({
  juris,
  juriKategoris,
  kategoris,
}: {
  juris: Juri[];
  juriKategoris: JuriKategoriWithJuri[];
  kategoris: { id: string; nama: string }[];
}) {
  async function handleTugaskan(data: FormData) {
    const juriId = data.get("juriId") as string;
    const kategori = data.get("kategori") as string;
    const toastId = toast.loading("Menugaskan...");
    const result = await tugaskanJuriKategori(juriId, kategori);
    if (result.success)
      toast.success("Juri berhasil ditugaskan!", { id: toastId });
    else toast.error("Gagal (sudah ditugaskan?)", { id: toastId });
  }

  return (
    <section>
      <h2 className="text-xl font-semibold mb-3">Penugasan Juri per Kategori</h2>
      <div className="grid lg:grid-cols-2 gap-6">
        <form
          action={handleTugaskan}
          className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm">Juri</label>
            <select
              name="juriId"
              required
              className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">-- Pilih Juri --</option>
              {juris.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nama}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm">Kategori yang Dinilai</label>
            <select
              name="kategori"
              required
              className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">-- Pilih Kategori --</option>
              {kategoris.map((k) => (
                <option key={k.id} value={k.nama}>{k.nama}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="bg-primary-500 text-white rounded-lg py-2 text-sm font-semibold"
          >
            Tugaskan
          </button>
        </form>

        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full text-xs">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-3 py-2 text-left">Juri</th>
                <th className="px-3 py-2 text-left">Kategori</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {juriKategoris.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-3 py-4 text-center text-gray-400">
                    Belum ada penugasan
                  </td>
                </tr>
              )}
              {juriKategoris.map((jk) => (
                <tr key={jk.id} className="bg-white">
                  <td className="px-3 py-2 font-medium">{jk.juri.nama}</td>
                  <td className="px-3 py-2">{jk.kategori}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
