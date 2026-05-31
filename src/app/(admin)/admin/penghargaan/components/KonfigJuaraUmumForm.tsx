"use client";

import { saveKonfigJuaraUmum } from "@/actions/Penghargaan";
import { toast } from "sonner";

export default function KonfigJuaraUmumForm({
  kategoris,
}: {
  kategoris: { id: string; nama: string }[];
}) {
  async function handleSave(data: FormData) {
    const toastId = toast.loading("Menyimpan konfigurasi...");
    const result = await saveKonfigJuaraUmum(data);
    if (result.success) toast.success("Juara Umum dikonfigurasi!", { id: toastId });
    else toast.error("Gagal (sudah ada untuk jenjang ini?)", { id: toastId });
  }

  return (
    <form
      action={handleSave}
      className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col gap-4"
    >
      <div>
        <h2 className="font-bold text-lg">Juara Umum</h2>
        <p className="text-xs text-gray-400">1 tim terbaik per jenjang</p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Jenjang</label>
        <input
          name="jenjang"
          required
          placeholder="SD / SMP / SMA / PURNA / UMUM..."
          list="jenjang-umum-options"
          className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
        />
        <datalist id="jenjang-umum-options">
          <option value="SD" />
          <option value="SMP" />
          <option value="SMA" />
          <option value="PURNA" />
          <option value="UMUM" />
        </datalist>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">
          Kategori yang Dihitung (checklist)
        </label>
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
        Simpan Konfigurasi Juara Umum
      </button>
    </form>
  );
}
