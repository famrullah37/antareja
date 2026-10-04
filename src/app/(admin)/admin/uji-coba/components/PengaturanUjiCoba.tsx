"use client";

import { createSesiUjiCoba, setBatasUjiCoba } from "@/actions/UjiCoba";
import { toWibDatetimeLocal } from "@/lib/ujiCoba";
import { useRouter } from "next-nprogress-bar";
import { useRef, useState } from "react";
import { toast } from "sonner";

const inputCls =
  "border border-neutral-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400";

export default function PengaturanUjiCoba({ batas }: { batas: Date | null }) {
  const router = useRouter();
  const sesiRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);

  async function handleSesi(data: FormData) {
    setLoading(true);
    const toastId = toast.loading("Menyimpan sesi...");
    const result = await createSesiUjiCoba(data);
    setLoading(false);
    if (result.success) {
      toast.success("Sesi ditambahkan", { id: toastId });
      sesiRef.current?.reset();
      router.refresh();
    } else {
      toast.error(result.message ?? "Gagal menambah sesi", { id: toastId });
    }
  }

  async function handleBatas(data: FormData) {
    const toastId = toast.loading("Menyimpan...");
    const result = await setBatasUjiCoba(data);
    if (result.success) {
      toast.success("Batas waktu disimpan", { id: toastId });
      router.refresh();
    } else {
      toast.error(result.message ?? "Gagal menyimpan", { id: toastId });
    }
  }

  return (
    <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
      <div className="bg-white rounded-2xl border border-neutral-200 p-6">
        <h2 className="font-semibold text-lg mb-1">Tambah Sesi</h2>
        <p className="text-sm text-gray-500 mb-4">
          Sesi dipecah otomatis menjadi slot sesuai durasi per tim. Contoh: &quot;Malang&quot; 15.00–18.00
          dengan 10 menit = 18 slot. Semua waktu dalam WIB.
        </p>
        <form ref={sesiRef} action={handleSesi} className="flex flex-col gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-sm font-medium">Nama sesi</label>
              <input name="nama" required placeholder="Malang / Luar Malang" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Mulai</label>
              <input name="mulai" type="datetime-local" required className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Selesai</label>
              <input name="selesai" type="datetime-local" required className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Durasi per tim (menit)</label>
              <input name="durasiMenit" type="number" min={1} max={120} defaultValue={10} required className={inputCls} />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-primary-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-600 transition-colors disabled:opacity-60"
            >
              {loading ? "Menyimpan..." : "Tambah Sesi"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 p-6">
        <h2 className="font-semibold text-lg mb-1">Batas Ganti Slot</h2>
        <p className="text-sm text-gray-500 mb-4">
          Sampai waktu ini tim bisa memilih, mengganti, atau membatalkan slot sendiri. Setelahnya terkunci,
          hanya panitia yang bisa mengubah. Kosongkan = boleh sampai slot dimulai.
        </p>
        <form action={handleBatas} className="flex flex-col gap-4">
          <input
            name="batas"
            type="datetime-local"
            defaultValue={toWibDatetimeLocal(batas)}
            className={inputCls}
          />
          <button
            type="submit"
            className="self-start bg-primary-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-600 transition-colors"
          >
            Simpan
          </button>
        </form>
      </div>
    </div>
  );
}
