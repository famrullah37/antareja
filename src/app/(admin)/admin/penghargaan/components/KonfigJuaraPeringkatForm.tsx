"use client";

import { saveKonfigJuaraPeringkat } from "@/actions/Penghargaan";
import { useState } from "react";
import { toast } from "sonner";

const JENJANG_OPTIONS = ["SD", "SMP", "SMA", "PURNA", "UMUM"];

type Konfig = { jenisJuara: string; jenjang: string; urutan: number | null };

function computeUrutan(jenjang: string, konfigs: Konfig[]) {
  const count = konfigs.filter(
    (k) => k.jenisJuara === "PERINGKAT" && k.jenjang === jenjang
  ).length;
  return count + 1;
}

function computeKode(jenjang: string, urutan: number) {
  return `JP-${jenjang}-${urutan}`;
}

export default function KonfigJuaraPeringkatForm({
  kategoris,
  konfigs,
}: {
  kategoris: { id: string; nama: string }[];
  konfigs: Konfig[];
}) {
  const initJenjang = JENJANG_OPTIONS[0];
  const initUrutan = computeUrutan(initJenjang, konfigs);

  const [jenjang, setJenjang] = useState(initJenjang);
  const [urutan, setUrutan] = useState(initUrutan);
  const [kode, setKode] = useState(computeKode(initJenjang, initUrutan));

  function handleJenjangChange(val: string) {
    setJenjang(val);
    const u = computeUrutan(val, konfigs);
    setUrutan(u);
    setKode(computeKode(val, u));
  }

  async function handleSave(data: FormData) {
    const toastId = toast.loading("Menyimpan...");
    const result = await saveKonfigJuaraPeringkat(data);
    if (result.success) {
      toast.success("Juara Peringkat ditambahkan!", { id: toastId });
      const newU = urutan + 1;
      setUrutan(newU);
      setKode(computeKode(jenjang, newU));
    } else {
      toast.error((result as any).message ?? "Gagal", { id: toastId });
    }
  }

  return (
    <form
      action={handleSave}
      className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col gap-4"
    >
      <div>
        <h2 className="font-bold text-lg">Juara Peringkat</h2>
        <p className="text-xs text-gray-400">Urutan per jenjang dengan kategori pilihan</p>
      </div>

      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm font-medium">Jenjang</label>
          <select
            name="jenjang"
            required
            value={jenjang}
            onChange={(e) => handleJenjangChange(e.target.value)}
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          >
            {JENJANG_OPTIONS.map((j) => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm font-medium">Urutan (otomatis)</label>
          <input
            name="urutan"
            type="number"
            min={1}
            required
            value={urutan}
            onChange={(e) => {
              const u = parseInt(e.target.value);
              setUrutan(u);
              setKode(computeKode(jenjang, u));
            }}
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Nama Juara</label>
        <input
          name="namaJuara"
          required
          placeholder="contoh: Juara 1, Juara 2, Best Drill..."
          className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Kode Unik (otomatis)</label>
        <input
          name="kode"
          required
          value={kode}
          onChange={(e) => setKode(e.target.value)}
          className="border border-neutral-300 rounded-lg px-3 py-2 text-sm font-mono"
        />
        <span className="text-xs text-gray-400">Format: JP-{jenjang}-{urutan}</span>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Penghargaan</label>
        <input
          name="penghargaan"
          placeholder="Trofi + Sertifikat + Uang Pembinaan"
          className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Kategori yang Dihitung</label>
        <div className="grid grid-cols-2 gap-2">
          {kategoris.map((k) => (
            <label key={k.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                name={`kat_${k.nama}`}
                defaultChecked
                className="w-4 h-4 accent-primary-500"
              />
              {k.nama}
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="bg-primary-500 text-white rounded-lg py-2 font-semibold text-sm hover:bg-primary-600 transition-colors"
      >
        Tambah Juara Peringkat
      </button>
    </form>
  );
}
