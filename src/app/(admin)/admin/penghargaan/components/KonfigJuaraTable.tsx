"use client";

import { hapusKonfigJuara, kunciKonfigJuara } from "@/actions/Penghargaan";
import { toast } from "sonner";

type KonfigJuara = {
  id: string;
  jenisJuara: string;
  kode: string;
  namaJuara: string;
  jenjang: string;
  urutan: number | null;
  kategoriList: unknown;
  penghargaan: string | null;
  dikunci: boolean;
};

export default function KonfigJuaraTable({ konfigs }: { konfigs: KonfigJuara[] }) {
  async function handleKunci(id: string, dikunci: boolean) {
    const toastId = toast.loading(dikunci ? "Membuka kunci..." : "Mengunci...");
    const result = await kunciKonfigJuara(id, !dikunci);
    if (result.success)
      toast.success(dikunci ? "Kunci dibuka" : "Konfigurasi dikunci!", { id: toastId });
    else toast.error("Gagal", { id: toastId });
  }

  async function handleHapus(id: string) {
    const toastId = toast.loading("Menghapus...");
    const result = await hapusKonfigJuara(id);
    if (result.success) toast.success("Dihapus", { id: toastId });
    else toast.error("Gagal", { id: toastId });
  }

  if (konfigs.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-3">Konfigurasi Tersimpan</h2>
        <p className="text-gray-400 text-sm">Belum ada konfigurasi juara.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Konfigurasi Tersimpan</h2>
      <div className="overflow-x-auto rounded-xl border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-4 py-3 text-left">Jenis</th>
              <th className="px-4 py-3 text-left">Nama</th>
              <th className="px-4 py-3 text-left">Jenjang</th>
              <th className="px-4 py-3 text-left">Kategori</th>
              <th className="px-4 py-3 text-left">Penghargaan</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {konfigs.map((k) => (
              <tr key={k.id} className="bg-white">
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      k.jenisJuara === "UMUM"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {k.jenisJuara}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">{k.namaJuara}</td>
                <td className="px-4 py-3">{k.jenjang}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {(k.kategoriList as string[]).join(", ")}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {k.penghargaan ?? "-"}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      k.dikunci
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {k.dikunci ? "🔒 Terkunci" : "🔓 Terbuka"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => handleKunci(k.id, k.dikunci)}
                      className="text-xs px-3 py-1 rounded-lg border border-neutral-300 hover:bg-neutral-50 transition-colors"
                    >
                      {k.dikunci ? "Buka" : "Kunci"}
                    </button>
                    {!k.dikunci && (
                      <button
                        onClick={() => handleHapus(k.id)}
                        className="text-xs px-3 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
