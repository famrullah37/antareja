"use client";

import { createRuangan, deleteRuangan, updateRuangan } from "@/actions/Basecamp";
import cn from "@/lib/clsx";
import { useRouter } from "next-nprogress-bar";
import { useRef, useState } from "react";
import { toast } from "sonner";

type Ruangan = {
  id: string;
  nama: string;
  kapasitas: number;
  keterangan: string | null;
  _count: { tims: number };
};

type Hasil = { success: boolean; message?: string };

const inputCls =
  "border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400";

function useJalankan() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function jalankan(aksi: () => Promise<Hasil>, berhasil: string) {
    setLoading(true);
    const toastId = toast.loading("Menyimpan...");
    const result = await aksi();
    setLoading(false);
    if (result.success) {
      toast.success(berhasil, { id: toastId });
      router.refresh();
    } else {
      toast.error(result.message ?? "Gagal", { id: toastId });
    }
    return result.success;
  }
  return { loading, jalankan };
}

function FieldRuangan({ r }: { r?: Ruangan }) {
  return (
    <>
      <input name="nama" required maxLength={100} defaultValue={r?.nama} placeholder="Kelas X-2" className={cn(inputCls, "flex-1 min-w-[140px]")} />
      <input
        name="kapasitas"
        type="number"
        required
        min={Math.max(1, r?._count.tims ?? 1)}
        max={100}
        defaultValue={r?.kapasitas ?? 1}
        title="Jumlah tim maksimal"
        className={cn(inputCls, "w-24")}
      />
      <input
        name="keterangan"
        maxLength={500}
        defaultValue={r?.keterangan ?? ""}
        placeholder="Keterangan (lokasi, lantai, dst) — opsional"
        className={cn(inputCls, "flex-[2] min-w-[200px]")}
      />
    </>
  );
}

function BarisRuangan({ r }: { r: Ruangan }) {
  const { loading, jalankan } = useJalankan();
  const [edit, setEdit] = useState(false);
  const penuh = r._count.tims >= r.kapasitas;

  if (edit) {
    return (
      <form
        action={async (data) => {
          if (await jalankan(() => updateRuangan(r.id, data), "Ruangan disimpan")) setEdit(false);
        }}
        className="flex flex-wrap items-center gap-2 px-6 py-3"
      >
        <FieldRuangan r={r} />
        <button type="submit" disabled={loading} className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600 disabled:opacity-60">
          Simpan
        </button>
        <button type="button" onClick={() => setEdit(false)} className="text-gray-600 px-3 py-2 rounded-lg text-sm hover:bg-neutral-100">
          Batal
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
      <div className="flex-1 min-w-[200px]">
        <div className="font-semibold">{r.nama}</div>
        {r.keterangan && <div className="text-sm text-gray-500">{r.keterangan}</div>}
      </div>
      <span
        className={cn(
          "text-xs font-semibold border rounded-full px-3 py-1",
          penuh ? "bg-green-50 border-green-200 text-green-700" : "bg-neutral-50 border-neutral-200 text-gray-600"
        )}
      >
        {r._count.tims}/{r.kapasitas} tim{penuh && " · penuh"}
      </span>
      <div className="flex gap-1">
        <button onClick={() => setEdit(true)} className="text-sm text-primary-600 hover:bg-primary-50 px-3 py-1.5 rounded-lg">
          Ubah
        </button>
        <button
          disabled={loading}
          onClick={() => {
            const peringatan = r._count.tims ? `\n\n${r._count.tims} tim di ruangan ini akan kembali belum punya ruangan.` : "";
            if (confirm(`Hapus ruangan "${r.nama}"?${peringatan}`)) jalankan(() => deleteRuangan(r.id), "Ruangan dihapus");
          }}
          className="text-sm text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg disabled:opacity-60"
        >
          Hapus
        </button>
      </div>
    </div>
  );
}

export default function KelolaRuangan({ ruangan }: { ruangan: Ruangan[] }) {
  const { loading, jalankan } = useJalankan();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-100">
        <h2 className="font-semibold text-lg mb-1">Daftar Ruangan</h2>
        <p className="text-sm text-gray-500 mb-4">
          Kapasitas = jumlah tim maksimal di satu ruangan. Tim tidak bisa ditempatkan ke ruangan yang sudah penuh.
        </p>
        <form
          ref={formRef}
          action={async (data) => {
            if (await jalankan(() => createRuangan(data), "Ruangan ditambahkan")) formRef.current?.reset();
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <FieldRuangan />
          <button
            type="submit"
            disabled={loading}
            className="bg-primary-500 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600 disabled:opacity-60"
          >
            Tambah Ruangan
          </button>
        </form>
      </div>
      {ruangan.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-400">Belum ada ruangan. Tambahkan lewat form di atas.</div>
      ) : (
        <div className="divide-y divide-neutral-100">
          {ruangan.map((r) => (
            <BarisRuangan key={r.id} r={r} />
          ))}
        </div>
      )}
    </div>
  );
}
