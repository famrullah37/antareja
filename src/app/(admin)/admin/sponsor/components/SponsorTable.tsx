"use client";

import { deleteSponsorForm, toggleAktifSponsor, updateSponsorForm } from "@/actions/Sponsor";
import { Sponsor } from "@prisma/client";
import Image from "next/image";
import { useRouter } from "next-nprogress-bar";
import { useState } from "react";
import { toast } from "sonner";

const inputKelas =
  "border border-neutral-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400";

const TIPE_LABEL: Record<string, string> = {
  SPONSOR: "Sponsor",
  MEDIA_PARTNER: "Media Partner",
  SUPPORT_BY: "Support By",
};

const TIPE_COLOR: Record<string, string> = {
  SPONSOR: "bg-blue-100 text-blue-700",
  MEDIA_PARTNER: "bg-purple-100 text-purple-700",
  SUPPORT_BY: "bg-green-100 text-green-700",
};

export default function SponsorTable({ data }: { data: Sponsor[] }) {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  async function handleEdit(id: string, data: FormData) {
    setMenyimpan(true);
    const toastId = toast.loading("Menyimpan...");
    const result = await updateSponsorForm(id, data);
    setMenyimpan(false);
    if (result.success) {
      toast.success("Sponsor diperbarui", { id: toastId });
      setEditId(null);
      router.refresh();
    } else {
      toast.error(result.message ?? "Gagal menyimpan", { id: toastId });
    }
  }

  async function handleToggle(id: string, aktif: boolean) {
    const toastId = toast.loading("Memperbarui...");
    const result = await toggleAktifSponsor(id, !aktif);
    if (result.success) {
      toast.success(aktif ? "Disembunyikan dari halaman" : "Ditampilkan di halaman", { id: toastId });
      router.refresh();
    } else {
      toast.error("Gagal memperbarui", { id: toastId });
    }
  }

  async function handleDelete(id: string, nama: string) {
    if (!confirm(`Hapus sponsor "${nama}"?`)) return;
    const toastId = toast.loading("Menghapus...");
    const result = await deleteSponsorForm(id);
    if (result.success) {
      toast.success("Sponsor dihapus", { id: toastId });
      router.refresh();
    } else {
      toast.error("Gagal menghapus", { id: toastId });
    }
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center text-gray-400">
        Belum ada sponsor. Tambahkan melalui form di atas.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-100 font-semibold">
        Daftar Sponsor ({data.length})
      </div>
      <div className="divide-y divide-neutral-100">
        {data.map((s) => (
          <div key={s.id}>
          <div
            className={`flex items-center gap-4 px-6 py-4 transition-colors ${!s.aktif ? "opacity-50 bg-neutral-50" : ""}`}
          >
            {/* Logo */}
            <div className="w-24 h-14 bg-neutral-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
              <Image
                src={s.logoUrl}
                alt={s.nama}
                width={96}
                height={56}
                unoptimized
                className="object-contain max-h-full max-w-full p-1"
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{s.nama}</div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPE_COLOR[s.tipe] ?? "bg-neutral-100 text-neutral-600"}`}
                >
                  {TIPE_LABEL[s.tipe] ?? s.tipe}
                </span>
                <span className="text-xs text-gray-400">Urutan: {s.urutan}</span>
                {s.linkUrl && (
                  <a
                    href={s.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline truncate max-w-[200px]"
                  >
                    {s.linkUrl}
                  </a>
                )}
              </div>
            </div>

            {/* Aksi */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setEditId(editId === s.id ? null : s.id)}
                className="px-3 py-1.5 text-xs rounded-lg font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
              >
                {editId === s.id ? "Tutup" : "Edit"}
              </button>
              <button
                onClick={() => handleToggle(s.id, s.aktif)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  s.aktif
                    ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                    : "bg-green-100 text-green-700 hover:bg-green-200"
                }`}
              >
                {s.aktif ? "Sembunyikan" : "Tampilkan"}
              </button>
              <button
                onClick={() => handleDelete(s.id, s.nama)}
                className="px-3 py-1.5 text-xs rounded-lg font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
          {editId === s.id && (
            <form
              action={(data) => handleEdit(s.id, data)}
              className="px-6 pb-5 pt-1 bg-neutral-50 border-t border-neutral-100 flex flex-col gap-3"
            >
              <div className="grid sm:grid-cols-2 gap-3 pt-3">
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Nama
                  <input name="nama" required defaultValue={s.nama} className={inputKelas} />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Link URL (opsional)
                  <input
                    name="linkUrl"
                    type="url"
                    defaultValue={s.linkUrl ?? ""}
                    placeholder="https://contoh.com"
                    className={inputKelas}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Tipe
                  <select name="tipe" defaultValue={s.tipe} className={inputKelas}>
                    {Object.entries(TIPE_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Urutan tampil
                  <input name="urutan" type="number" min={0} defaultValue={s.urutan} className={inputKelas} />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-sm font-medium">
                <span>
                  Ganti logo <span className="text-xs text-gray-400 font-normal">— kosongkan jika tidak diganti</span>
                </span>
                <input
                  name="logo"
                  type="file"
                  accept="image/*"
                  className="border border-neutral-200 bg-white py-2 px-3 rounded-xl text-sm file:bg-primary-500 file:text-white file:rounded-md file:border-none file:py-1 file:px-3 hover:cursor-pointer"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditId(null)}
                  className="px-4 py-2 text-sm rounded-xl font-medium text-neutral-600 hover:bg-neutral-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={menyimpan}
                  className="bg-primary-500 text-white px-5 py-2 rounded-xl font-semibold text-sm hover:bg-primary-600 disabled:opacity-60"
                >
                  {menyimpan ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          )}
          </div>
        ))}
      </div>
    </div>
  );
}
