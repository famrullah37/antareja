"use client";

import { saveBeritaForm } from "@/actions/Berita";
import { Berita } from "@prisma/client";
import { useRouter } from "next-nprogress-bar";
import { useState } from "react";
import { toast } from "sonner";

const inputClass =
  "border border-neutral-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400";

export default function BeritaForm({ data }: { data?: Berita }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(data?.coverUrl ?? null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    const toastId = toast.loading("Menyimpan...");
    const result = await saveBeritaForm(formData);
    setLoading(false);
    if (result.success) {
      toast.success("Berita disimpan", { id: toastId });
      router.push("/admin/berita");
      router.refresh();
    } else {
      toast.error(result.message ?? "Gagal menyimpan berita", { id: toastId });
    }
  }

  return (
    <form action={handleSubmit} className="bg-white rounded-2xl border border-neutral-200 p-6 flex flex-col gap-4">
      {data && <input type="hidden" name="id" value={data.id} />}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">
          Judul <span className="text-red-500">*</span>
        </label>
        <input name="judul" required defaultValue={data?.judul} placeholder="Judul berita" className={inputClass} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">
          Ringkasan
          <span className="text-xs text-gray-400 font-normal ml-1">
            tampil di hasil Google &amp; pratinjau tautan — ±150 karakter, sebut kata yang dicari orang (mis.
            &quot;lomba paskibra Malang&quot;)
          </span>
        </label>
        <textarea name="ringkasan" rows={2} maxLength={300} defaultValue={data?.ringkasan ?? ""} className={inputClass} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">
          Isi berita <span className="text-red-500">*</span>
          <span className="text-xs text-gray-400 font-normal ml-1">pisahkan paragraf dengan baris kosong</span>
        </label>
        <textarea name="konten" required rows={14} defaultValue={data?.konten} className={inputClass} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Gambar sampul (opsional)</label>
        <input
          name="cover"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            setPreview(file ? URL.createObjectURL(file) : data?.coverUrl ?? null);
          }}
          className="border border-neutral-200 py-2.5 px-3 rounded-xl text-sm file:bg-primary-500 file:text-white file:rounded-md file:border-none file:py-1 file:px-3 hover:cursor-pointer"
        />
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element -- bisa blob lokal
          <img src={preview} alt="sampul" className="mt-2 rounded-xl max-h-56 object-cover" />
        )}
        {data?.coverUrl && (
          <label className="flex items-center gap-2 text-sm text-gray-600 mt-1">
            <input type="checkbox" name="hapusCover" /> Hapus gambar sampul
          </label>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="publish" defaultChecked={data?.publish ?? false} />
        Terbitkan (tampil di halaman publik)
      </label>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => router.push("/admin/berita")}
          className="px-6 py-2.5 rounded-xl font-semibold text-sm border border-neutral-300 hover:bg-neutral-50"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bg-primary-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-600 transition-colors disabled:opacity-60"
        >
          {loading ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </form>
  );
}
