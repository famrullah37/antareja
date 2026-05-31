"use client";

import { removeSubKategori, saveSubKategori } from "@/actions/PenilaianBaru";
import { SubKategoriMaster } from "@prisma/client";
import { useState } from "react";
import { toast } from "sonner";

export default function SubKategoriSection({
  subKategoris,
  kategoris,
}: {
  subKategoris: SubKategoriMaster[];
  kategoris: { id: string; nama: string }[];
}) {
  const [kategori, setKategori] = useState(kategoris[0]?.nama ?? "");
  const [kode, setKode] = useState(() => {
    const kat = kategoris[0]?.nama ?? "";
    if (!kat) return "";
    const prefix = kat.toLowerCase().replace(/\s+/g, "-") + "-";
    const count = subKategoris.filter((s) => s.kategori === kat).length;
    return prefix + String(count + 1).padStart(2, "0");
  });

  function handleKategoriChange(val: string) {
    setKategori(val);
    // auto-generate prefix kode sesuai kategori
    if (val) {
      const prefix = val.toLowerCase().replace(/\s+/g, "-") + "-";
      const existing = subKategoris.filter(
        (s) => s.kategori.toLowerCase() === val.toLowerCase()
      );
      const next = String(existing.length + 1).padStart(2, "0");
      setKode(prefix + next);
    } else {
      setKode("");
    }
  }

  async function handleSave(data: FormData) {
    const toastId = toast.loading("Menyimpan...");
    const result = await saveSubKategori(data);
    if (result.success) {
      toast.success("Sub-kategori ditambahkan!", { id: toastId });
      setKategori("");
      setKode("");
    } else {
      toast.error("Gagal (kode sudah ada?)", { id: toastId });
    }
  }

  async function handleDelete(id: string) {
    const toastId = toast.loading("Menghapus...");
    const result = await removeSubKategori(id);
    if (result.success) toast.success("Dihapus", { id: toastId });
    else toast.error("Gagal", { id: toastId });
  }

  return (
    <section>
      <h2 className="text-xl font-semibold mb-3">Master Sub-Kategori Gerakan</h2>
      <div className="grid lg:grid-cols-2 gap-6">
        <form
          action={handleSave}
          className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm">Kategori Utama</label>
            <select
              name="kategori"
              required
              value={kategori}
              onChange={(e) => handleKategoriChange(e.target.value)}
              className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            >
              {kategoris.map((k) => (
                <option key={k.id} value={k.nama}>{k.nama}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm">Kode (unik, otomatis dari kategori)</label>
            <input
              name="kode"
              required
              value={kode}
              onChange={(e) => setKode(e.target.value)}
              placeholder="pbb-01"
              className="border border-neutral-300 rounded-lg px-3 py-2 text-sm font-mono"
            />
            <span className="text-xs text-gray-400">
              Format: {kategori ? `${kategori.toLowerCase()}-XX` : "kategori-XX"}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm">Nama Sub-Kategori</label>
            <input
              name="nama"
              required
              placeholder="Gerakan Maju Jalan"
              className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-sm">Nilai Maks</label>
              <input
                name="maxNilai"
                type="number"
                defaultValue={100}
                className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-sm">Urutan</label>
              <input
                name="urutan"
                type="number"
                defaultValue={1}
                className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
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
                <th className="px-3 py-2 text-left">Maks</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {subKategoris.map((s) => (
                <tr key={s.id} className="bg-white">
                  <td className="px-3 py-2 font-mono font-medium">{s.kode}</td>
                  <td className="px-3 py-2">{s.nama}</td>
                  <td className="px-3 py-2">{s.kategori}</td>
                  <td className="px-3 py-2">{s.maxNilai}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleDelete(s.id)}
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
