"use client";

import { makeSlug } from "@/lib/timSlug";
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
  sembunyikanSekolah = false,
  juriLoginId,
}: {
  jenjangList: string[];
  juris: Juri[];
  juriKategoris: JuriKat[];
  kategoriLombas: KategoriLomba[];
  defaultValues: { jenjang?: string; sekolah?: string; juriId?: string; kategori?: string; status?: string };
  sembunyikanSekolah?: boolean;
  // Akun juri: pilihan juri disembunyikan, kategori hanya milik juri ini.
  juriLoginId?: string;
}) {
  const router = useRouter();
  const [jenjang, setJenjang] = useState(defaultValues.jenjang ?? "");
  const [sekolah, setSekolah] = useState(defaultValues.sekolah ?? "");
  const [juriId, setJuriId] = useState(defaultValues.juriId ?? "");
  const [kategori, setKategori] = useState(defaultValues.kategori ?? "");
  const [status, setStatus] = useState(defaultValues.status ?? "");

  const juriKonteks = juriLoginId ?? juriId;
  const juriKategoriList = juriKonteks
    ? juriKategoris.filter((jk) => jk.juriId === juriKonteks).map((jk) => jk.kategori)
    : kategoriLombas.map((k) => k.nama);

  function handleFilter() {
    const params = new URLSearchParams();
    if (jenjang) params.set("jenjang", jenjang);
    if (sekolah && !sembunyikanSekolah) params.set("sekolah", sekolah);
    const juriDipilih = juris.find((j) => j.id === juriId);
    if (juriDipilih) params.set("juri", makeSlug(juriDipilih.nama, juriDipilih.id, "juri"));
    if (kategori) params.set("kategori", kategori);
    if (status && juriKonteks) params.set("status", status);
    const qs = params.toString();
    router.push(qs ? `/admin/penilaian-baru/input?${qs}` : "/admin/penilaian-baru/input");
  }

  function handleReset() {
    setJenjang(""); setSekolah(""); setJuriId(""); setKategori(""); setStatus("");
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

        {!sembunyikanSekolah && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Nama Sekolah</label>
          <input
            value={sekolah}
            onChange={(e) => setSekolah(e.target.value)}
            placeholder="Cari sekolah..."
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        )}

        {!juriLoginId && (
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
        )}

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

        {juriKonteks && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Status nilai</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Semua tim</option>
              <option value="belum">Belum selesai dinilai</option>
            </select>
          </div>
        )}
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
