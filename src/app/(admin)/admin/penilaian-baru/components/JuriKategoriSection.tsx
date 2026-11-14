"use client";

import { hapusJuriKategori, tugaskanJuriKategori, ubahJuriKategori } from "@/actions/PenilaianBaru";
import { Juri } from "@prisma/client";
import { useState } from "react";
import { toast } from "sonner";

type JuriKategoriWithJuri = {
  id: string;
  juriId: string;
  kategori: string;
  juri: Juri;
};

function BarisPenugasan({ jk, kategoris }: { jk: JuriKategoriWithJuri; kategoris: { id: string; nama: string }[] }) {
  const [edit, setEdit] = useState(false);
  const [kategori, setKategori] = useState(jk.kategori);
  const [loading, setLoading] = useState(false);

  async function simpan() {
    if (kategori === jk.kategori) return setEdit(false);
    setLoading(true);
    const r = await ubahJuriKategori(jk.id, kategori);
    setLoading(false);
    if (r.success) {
      toast.success("Penugasan diubah");
      setEdit(false);
    } else toast.error(r.message ?? "Gagal");
  }

  async function hapus() {
    if (!confirm(`Hapus penugasan ${jk.juri.nama} di kategori ${jk.kategori}? Nilai yang sudah diinput tidak ikut terhapus.`)) return;
    setLoading(true);
    const r = await hapusJuriKategori(jk.id);
    setLoading(false);
    if (r.success) toast.success("Penugasan dihapus");
    else toast.error(r.message ?? "Gagal");
  }

  const btn = "px-2.5 py-1 rounded-md text-xs font-medium disabled:opacity-60";
  return (
    <tr className="bg-white">
      <td className="px-3 py-2 font-medium">{jk.juri.nama}</td>
      <td className="px-3 py-2">
        {edit ? (
          <select
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            className="border border-neutral-300 rounded-md px-2 py-1 text-xs"
          >
            {/* Kategori lama tetap jadi pilihan walau sudah tidak ada di master. */}
            {!kategoris.some((k) => k.nama === jk.kategori) && <option value={jk.kategori}>{jk.kategori}</option>}
            {kategoris.map((k) => (
              <option key={k.id} value={k.nama}>
                {k.nama}
              </option>
            ))}
          </select>
        ) : (
          jk.kategori
        )}
      </td>
      <td className="px-3 py-2">
        <div className="flex justify-end gap-1.5">
          {edit ? (
            <>
              <button type="button" onClick={simpan} disabled={loading} className={`${btn} bg-primary-500 text-white`}>
                Simpan
              </button>
              <button
                type="button"
                onClick={() => {
                  setKategori(jk.kategori);
                  setEdit(false);
                }}
                disabled={loading}
                className={`${btn} bg-neutral-100 text-neutral-700`}
              >
                Batal
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setEdit(true)} disabled={loading} className={`${btn} bg-amber-100 text-amber-700`}>
                Edit
              </button>
              <button type="button" onClick={hapus} disabled={loading} className={`${btn} bg-red-100 text-red-700`}>
                Hapus
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

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
    else toast.error(result.message ?? "Gagal", { id: toastId });
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
                <th className="px-3 py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {juriKategoris.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-gray-400">
                    Belum ada penugasan
                  </td>
                </tr>
              )}
              {juriKategoris.map((jk) => (
                <BarisPenugasan key={jk.id} jk={jk} kategoris={kategoris} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
