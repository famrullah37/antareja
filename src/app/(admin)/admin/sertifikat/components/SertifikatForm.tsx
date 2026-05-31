"use client";

import { addSertifikat, removeSertifikat, removeAllSertifikatTim } from "@/actions/Sertifikat";
import Image from "next/image";
import { useRouter } from "next-nprogress-bar";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { FaTrash, FaTrophy, FaPlus } from "react-icons/fa";

type Tim = { id: string; nama_tim: string; jenjang: string; asal_sekolah: string };

type SertifikatItem = {
  id: string;
  fileUrl: string;
  namaAnggota: string | null;
  namaJuara: string | null;
};

interface Props {
  tim: Tim;
  sertifikats: SertifikatItem[];
  juaraLabel: string | null;
}

export default function SertifikatForm({ tim, sertifikats, juaraLabel }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);

  async function handleAdd(data: FormData) {
    data.append("timId", tim.id);
    if (juaraLabel) data.append("namaJuara", juaraLabel);
    setLoading(true);
    const toastId = toast.loading("Mengupload...");
    const result = await addSertifikat(data);
    setLoading(false);
    if (result.success) {
      toast.success("Sertifikat disimpan!", { id: toastId });
      formRef.current?.reset();
      setPreviews([]);
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.message ?? "Gagal", { id: toastId });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus sertifikat ini?")) return;
    const toastId = toast.loading("Menghapus...");
    const result = await removeSertifikat(id);
    if (result.success) {
      toast.success("Dihapus", { id: toastId });
      router.refresh();
    } else {
      toast.error(result.message ?? "Gagal", { id: toastId });
    }
  }

  async function handleDeleteAll() {
    if (!confirm(`Hapus semua sertifikat tim ${tim.nama_tim}?`)) return;
    const toastId = toast.loading("Menghapus semua...");
    const result = await removeAllSertifikatTim(tim.id);
    if (result.success) {
      toast.success("Semua sertifikat dihapus", { id: toastId });
      router.refresh();
    } else {
      toast.error(result.message ?? "Gagal", { id: toastId });
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm">{tim.nama_tim}</p>
          <p className="text-xs text-gray-400">{tim.asal_sekolah} · {tim.jenjang}</p>
          {juaraLabel && (
            <span className="inline-flex items-center gap-1 mt-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
              <FaTrophy className="text-[10px]" /> {juaraLabel}
            </span>
          )}
          <span className="ml-1 text-xs text-gray-400">{sertifikats.length} file</span>
        </div>
        <div className="flex gap-2 shrink-0">
          {sertifikats.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteAll}
              className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
              title="Hapus semua"
            >
              <FaTrash className="text-xs" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors text-xs font-semibold"
          >
            <FaPlus className="text-xs" />
            Tambah
          </button>
        </div>
      </div>

      {/* Daftar sertifikat */}
      {sertifikats.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sertifikats.map((s) => (
            <div key={s.id} className="relative group">
              <a href={s.fileUrl} target="_blank" rel="noopener noreferrer">
                <Image
                  src={s.fileUrl}
                  alt={s.namaAnggota ?? "sertifikat"}
                  width={80}
                  height={60}
                  unoptimized
                  className="rounded-lg border border-gray-200 object-cover w-20 h-14"
                />
              </a>
              {s.namaAnggota && (
                <p className="text-[10px] text-gray-500 text-center mt-0.5 max-w-[80px] truncate">
                  {s.namaAnggota}
                </p>
              )}
              <button
                type="button"
                onClick={() => handleDelete(s.id)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Form tambah */}
      {open && (
        <form
          ref={formRef}
          action={handleAdd}
          className="flex flex-col gap-3 pt-3 border-t border-gray-100"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">
              Nama Anggota <span className="font-normal text-gray-400">(opsional)</span>
            </label>
            <input
              type="text"
              name="namaAnggota"
              placeholder="Nama anggota penerima sertifikat"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">
              File Sertifikat{" "}
              <span className="font-normal text-gray-400">(bisa pilih banyak sekaligus)</span>
            </label>
            <input
              type="file"
              name="files"
              multiple
              accept="image/*,.pdf"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                setPreviews(files.map((f) => URL.createObjectURL(f)));
              }}
              className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100"
            />
            {previews.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {previews.map((p, i) => (
                  <img key={i} src={p} alt={`preview-${i}`} className="w-16 h-12 object-cover rounded border border-gray-200" />
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-primary-500 text-white rounded-lg py-1.5 px-4 text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-60"
            >
              {loading ? "Menyimpan..." : "Simpan"}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setPreviews([]); }}
              className="bg-gray-100 text-gray-600 rounded-lg py-1.5 px-4 text-sm font-semibold hover:bg-gray-200 transition-colors"
            >
              Batal
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
