"use client";

import { removePelanggaran, savePelanggaran } from "@/actions/PenilaianBaru";
import { Pelanggaran } from "@prisma/client";
import { useState } from "react";
import { toast } from "sonner";

const KATEGORI_OPTIONS = [
  { label: "Administrasi", value: "Administrasi", prefix: "PKGA" },
  { label: "Teknis", value: "Teknis", prefix: "PKGT" },
  { label: "Custom", value: "Custom", prefix: "PKGC" },
];

export default function PelanggaranSection({
  pelanggarans,
}: {
  pelanggarans: Pelanggaran[];
}) {
  const [kategori, setKategori] = useState(KATEGORI_OPTIONS[0].value);
  const [kode, setKode] = useState(() => generateKode(KATEGORI_OPTIONS[0].value, pelanggarans));

  function generateKode(kat: string, existing: Pelanggaran[]) {
    const opt = KATEGORI_OPTIONS.find((o) => o.value === kat);
    if (!opt) return "";
    const count = existing.filter((p) => p.kategori === kat).length;
    return `${opt.prefix}-${String(count + 1).padStart(2, "0")}`;
  }

  function handleKategoriChange(val: string) {
    setKategori(val);
    setKode(generateKode(val, pelanggarans));
  }

  async function handleSave(data: FormData) {
    const toastId = toast.loading("Menyimpan...");
    const result = await savePelanggaran(data);
    if (result.success) {
      toast.success("Pelanggaran ditambahkan!", { id: toastId });
      setKode(generateKode(kategori, pelanggarans));
    } else {
      toast.error("Gagal (kode sudah ada?)", { id: toastId });
    }
  }

  async function handleDelete(id: string) {
    const toastId = toast.loading("Menghapus...");
    const result = await removePelanggaran(id);
    if (result.success) toast.success("Dihapus", { id: toastId });
    else toast.error("Gagal", { id: toastId });
  }

  return (
    <section>
      <h2 className="text-xl font-semibold mb-3">Master Pengurangan Poin</h2>
      <div className="grid lg:grid-cols-2 gap-6">
        <form
          action={handleSave}
          className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm">Kategori</label>
            <select
              name="kategori"
              value={kategori}
              onChange={(e) => handleKategoriChange(e.target.value)}
              className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            >
              {KATEGORI_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm">Kode (otomatis dari kategori)</label>
            <input
              name="kode"
              required
              value={kode}
              onChange={(e) => setKode(e.target.value)}
              placeholder="PKGA-01"
              className="border border-neutral-300 rounded-lg px-3 py-2 text-sm font-mono"
            />
            <span className="text-xs text-gray-400">
              Format: {KATEGORI_OPTIONS.find((o) => o.value === kategori)?.prefix ?? "PKG"}-XX
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm">Nama Pelanggaran</label>
            <input
              name="nama"
              required
              placeholder="Terlambat masuk lapangan (per menit)"
              className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm">Poin Pengurangan (angka positif)</label>
            <input
              name="poin"
              type="number"
              required
              min={1}
              placeholder="5"
              className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="bg-primary-500 text-white rounded-lg py-2 text-sm font-semibold"
          >
            Tambah
          </button>
        </form>

        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full text-xs">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-3 py-2 text-left">Kode</th>
                <th className="px-3 py-2 text-left">Nama</th>
                <th className="px-3 py-2 text-left">Kategori</th>
                <th className="px-3 py-2 text-left">Poin</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {pelanggarans.map((p) => (
                <tr key={p.id} className="bg-white">
                  <td className="px-3 py-2 font-mono font-medium">{p.kode}</td>
                  <td className="px-3 py-2">{p.nama}</td>
                  <td className="px-3 py-2">{p.kategori}</td>
                  <td className="px-3 py-2 text-red-600 font-semibold">
                    -{p.poinPengurangan}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleDelete(p.id)}
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
