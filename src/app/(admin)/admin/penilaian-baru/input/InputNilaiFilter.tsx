"use client";

import { useRouter } from "next-nprogress-bar";
import { useState } from "react";

type Juri = { id: string; nama: string };
type JuriKat = { id: string; juriId: string; kategori: string };
type KategoriLomba = { id: string; nama: string };

export default function InputNilaiFilter({
  jenjangList,
  juris,
  juriKategoris,
  kategoriLombas,
  defaultValues,
}: {
  jenjangList: string[];
  juris: Juri[];
  juriKategoris: JuriKat[];
  kategoriLombas: KategoriLomba[];
  defaultValues: { jenjang?: string; sekolah?: string; juriId?: string; kategori?: string };
}) {
  const router = useRouter();
  const [jenjang, setJenjang] = useState(defaultValues.jenjang ?? "");
  const [sekolah, setSekolah] = useState(defaultValues.sekolah ?? "");
  const [juriId, setJuriId] = useState(defaultValues.juriId ?? "");
  const [kategori, setKategori] = useState(defaultValues.kategori ?? "");

  const juriKategoriList = juriId
    ? juriKategoris.filter((jk) => jk.juriId === juriId).map((jk) => jk.kategori)
    : kategoriLombas.map((k) => k.nama);

  function handleFilter() {
    const params = new URLSearchParams();
    if (jenjang) params.set("jenjang", jenjang);
    if (sekolah) params.set("sekolah", sekolah);
    if (juriId) params.set("juriId", juriId);
    if (kategori) params.set("kategori", kategori);
    router.push(`/admin/penilaian-baru/input?${params.toString()}`);
  }

  function handleReset() {
    setJenjang(""); setSekolah(""); setJuriId(""); setKategori("");
    router.push("/admin/penilaian-baru/input");
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col gap-4">
      <h2 className="font-semibold text-sm text-neutral-600">Filter</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Jenjang</label>
          <select
            value={jenjang}
            onChange={(e) => setJenjang(e.target.value)}
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Semua Jenjang</option>
            {jenjangList.map((j) => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Nama Sekolah</label>
          <input
            value={sekolah}
            onChange={(e) => setSekolah(e.target.value)}
            placeholder="Cari sekolah..."
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Juri</label>
          <select
            value={juriId}
            onChange={(e) => { setJuriId(e.target.value); setKategori(""); }}
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Semua Juri</option>
            {juris.map((j) => (
              <option key={j.id} value={j.id}>{j.nama}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Kategori</label>
          <select
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Semua Kategori</option>
            {juriKategoriList.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleFilter}
          className="bg-primary-500 text-white rounded-lg px-5 py-2 text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          Terapkan Filter
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="bg-neutral-100 text-neutral-600 rounded-lg px-4 py-2 text-sm hover:bg-neutral-200 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
