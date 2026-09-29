"use client";

import { saveKuotaTim } from "@/actions/KonfigUmum";
import { toast } from "sonner";

type Baris = {
  label: string;
  name: "kuotaSD" | "kuotaSMP" | "kuotaSMA" | "kuotaPurna";
  kuota: number | null;
  terkonfirmasi: number;
  terdaftar: number;
};

// Kuota jumlah tim yang berlaga per jenjang — diatur Sie Lomba/admin.
// Begitu jumlah tim terkonfirmasi mencapai kuota, jenjang itu otomatis
// tidak bisa dipilih lagi di form pendaftaran.
export default function KuotaTimForm({ baris }: Readonly<{ baris: Baris[] }>) {
  async function handleSubmit(data: FormData) {
    const toastId = toast.loading("Menyimpan kuota...");
    const result = await saveKuotaTim(data);
    if (result.success) toast.success("Kuota tim disimpan!", { id: toastId });
    else toast.error(result.message ?? "Gagal menyimpan kuota", { id: toastId });
  }

  return (
    <form action={handleSubmit} className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col gap-4">
      <div>
        <h2 className="font-semibold text-lg">Kuota Tim yang Berlaga</h2>
        <p className="text-sm text-gray-500">
          Batas maksimal tim per jenjang, dihitung dari tim yang pembayarannya sudah terkonfirmasi.
          Kosongkan kalau tidak dibatasi. Begitu kuota tercapai, jenjang otomatis tidak bisa dipilih
          lagi di form pendaftaran.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {baris.map((b) => {
          const penuh = b.kuota !== null && b.terkonfirmasi >= b.kuota;
          return (
            <label key={b.name} className="flex flex-col gap-1 text-sm font-medium">
              {b.label}
              <input
                type="number"
                min={0}
                max={9999}
                name={b.name}
                defaultValue={b.kuota ?? ""}
                placeholder="Tanpa batas"
                className="border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
              />
              <span className={`text-xs font-normal ${penuh ? "text-red-600 font-semibold" : "text-gray-500"}`}>
                {b.terkonfirmasi}
                {b.kuota !== null ? `/${b.kuota}` : ""} terkonfirmasi
                {penuh ? " · penuh" : ""} ({b.terdaftar} mendaftar)
              </span>
            </label>
          );
        })}
      </div>
      <button
        type="submit"
        className="self-start bg-primary-500 text-white rounded-lg py-2 px-6 text-sm font-semibold hover:bg-primary-600 transition-colors"
      >
        Simpan Kuota
      </button>
    </form>
  );
}
