"use client";

import { removeKategoriLomba, saveKategoriLomba } from "@/actions/PenilaianBaru";
import { toast } from "sonner";

type KategoriLomba = { id: string; nama: string };

export default function KategoriLombaSection({
  kategoris,
}: {
  kategoris: KategoriLomba[];
}) {
  async function handleSave(data: FormData) {
    const toastId = toast.loading("Menyimpan...");
    const result = await saveKategoriLomba(data);
    if (result.success) toast.success("Kategori ditambahkan!", { id: toastId });
    else toast.error("Gagal (sudah ada?)", { id: toastId });
  }

  async function handleDelete(id: string) {
    const toastId = toast.loading("Menghapus...");
    const result = await removeKategoriLomba(id);
    if (result.success) toast.success("Dihapus", { id: toastId });
    else toast.error("Gagal", { id: toastId });
  }

  return (
    <section>
      <h2 className="text-xl font-semibold mb-3">Kategori Lomba</h2>
      <div className="grid lg:grid-cols-2 gap-6">
        <form
          action={handleSave}
          className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col gap-3"
        >
          <p className="text-sm text-gray-500">
            Tambah kategori baru (contoh: PBB, VARIASI, FORMASI). Nama otomatis diubah ke huruf kapital.
          </p>
          <div className="flex gap-2">
            <input
              name="nama"
              required
              placeholder="Nama kategori"
              className="flex-1 border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="bg-primary-500 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-primary-600 transition-colors"
            >
              Tambah
            </button>
          </div>
        </form>

        <div className="flex flex-wrap gap-2 content-start">
          {kategoris.length === 0 ? (
            <p className="text-gray-400 text-sm">Belum ada kategori.</p>
          ) : (
            kategoris.map((k) => (
              <div
                key={k.id}
                className="flex items-center gap-1.5 bg-white border border-neutral-200 rounded-full px-3 py-1.5 text-sm"
              >
                <span className="font-medium">{k.nama}</span>
                <button
                  onClick={() => handleDelete(k.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors text-xs ml-1"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
