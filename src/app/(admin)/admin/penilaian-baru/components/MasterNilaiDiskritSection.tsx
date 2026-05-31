"use client";

import {
  deleteMasterNilaiDiskrit,
  saveMasterNilaiDiskrit,
} from "@/actions/PenilaianBaru";
import { NilaiDiskritMaster } from "@prisma/client";
import { toast } from "sonner";

const PREDIKAT_OPTIONS = [
  { label: "Sangat Bagus", value: "SANGAT_BAGUS", warna: "#22c55e" },
  { label: "Bagus", value: "BAGUS", warna: "#84cc16" },
  { label: "Cukup Bagus", value: "CUKUP_BAGUS", warna: "#eab308" },
  { label: "Cukup", value: "CUKUP", warna: "#f97316" },
  { label: "Kurang", value: "KURANG", warna: "#ef4444" },
  { label: "Sangat Kurang", value: "SANGAT_KURANG", warna: "#991b1b" },
];

export default function MasterNilaiDiskritSection({
  masters,
  kategoris,
}: {
  masters: NilaiDiskritMaster[];
  kategoris: { id: string; nama: string }[];
}) {
  async function handleSave(data: FormData) {
    const predikat = PREDIKAT_OPTIONS.find(
      (p) => p.value === (data.get("predikat") as string)
    );
    if (predikat) data.set("warna", predikat.warna);
    const toastId = toast.loading("Menyimpan...");
    const result = await saveMasterNilaiDiskrit(data);
    if (result.success) toast.success("Disimpan!", { id: toastId });
    else toast.error("Gagal", { id: toastId });
  }

  async function handleDelete(id: string) {
    const toastId = toast.loading("Menghapus...");
    const result = await deleteMasterNilaiDiskrit(id);
    if (result.success) toast.success("Dihapus", { id: toastId });
    else toast.error("Gagal", { id: toastId });
  }

  return (
    <section>
      <h2 className="text-xl font-semibold mb-3">Master Nilai Diskrit</h2>
      <div className="grid lg:grid-cols-2 gap-6">
        <form
          action={handleSave}
          className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col gap-3"
        >
          <h3 className="font-medium">Tambah / Update Nilai</h3>
          <div className="flex flex-col gap-1">
            <label className="text-sm">Kategori</label>
            <select
              name="kategori"
              required
              className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            >
              {kategoris.map((k) => (
                <option key={k.id} value={k.nama}>
                  {k.nama}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm">Predikat</label>
            <select
              name="predikat"
              required
              className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            >
              {PREDIKAT_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm">
              Nilai (pisahkan koma, contoh: 100,90)
            </label>
            <input
              name="nilai"
              required
              placeholder="100, 90"
              className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm">Urutan</label>
            <input
              name="urutan"
              type="number"
              defaultValue={1}
              className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="bg-primary-500 text-white rounded-lg py-2 text-sm font-semibold"
          >
            Simpan
          </button>
        </form>

        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full text-xs">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-3 py-2 text-left">Kategori</th>
                <th className="px-3 py-2 text-left">Predikat</th>
                <th className="px-3 py-2 text-left">Nilai</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {masters.map((m) => (
                <tr key={m.id} className="bg-white">
                  <td className="px-3 py-2 font-medium">{m.kategori}</td>
                  <td className="px-3 py-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-white text-xs"
                      style={{ backgroundColor: m.warna }}
                    >
                      {m.predikat.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {(m.nilai as number[]).join(", ")}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="text-red-500 hover:underline"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
