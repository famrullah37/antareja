"use client";

import { ajukanMenginap, batalMenginap } from "@/actions/Menginap";
import {
  formatTanggalMenginap,
  jumlahMalam,
  MAKS_ORANG_MENGINAP,
  STATUS_MENGINAP,
  toInputTanggal,
  type StatusMenginap,
} from "@/lib/menginap";
import cn from "@/lib/clsx";
import { useRouter } from "next-nprogress-bar";
import { useState } from "react";
import { toast } from "sonner";

type Pengajuan = {
  jumlahPutra: number;
  jumlahPutri: number;
  jumlahPendamping: number;
  tanggalDatang: Date;
  tanggalPulang: Date;
  namaPj: string;
  noHpPj: string;
  catatan: string | null;
  status: string;
  catatanAdmin: string | null;
};

const inputCls =
  "border border-neutral-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400";

export default function FormMenginap({ pengajuan, aktif }: { pengajuan: Pengajuan | null; aktif: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState(false);
  const status = (pengajuan && pengajuan.status in STATUS_MENGINAP ? pengajuan.status : "PENDING") as StatusMenginap;
  // Sama dengan cek di server (actions/Menginap.ts): terkunci setelah disetujui atau saat pengajuan ditutup.
  const bisaUbah = aktif && status !== "DISETUJUI";

  async function jalankan(aksi: () => Promise<{ success: boolean; message?: string }>, berhasil: string) {
    setLoading(true);
    const toastId = toast.loading("Menyimpan...");
    const result = await aksi();
    setLoading(false);
    if (result.success) {
      toast.success(berhasil, { id: toastId });
      setEdit(false);
      router.refresh();
    } else {
      toast.error(result.message ?? "Gagal", { id: toastId });
    }
  }

  if (pengajuan && !edit) {
    const malam = jumlahMalam(pengajuan.tanggalDatang, pengajuan.tanggalPulang);
    return (
      <div className={cn("border rounded-xl p-4 flex flex-col gap-3", STATUS_MENGINAP[status].cls)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide">{STATUS_MENGINAP[status].label}</div>
          {bisaUbah && (
            <div className="flex gap-2">
              <button
                disabled={loading}
                onClick={() => setEdit(true)}
                className="text-sm text-primary-600 hover:bg-white/60 px-3 py-1.5 rounded-lg disabled:opacity-60"
              >
                {status === "DITOLAK" ? "Ubah & ajukan ulang" : "Ubah"}
              </button>
              <button
                disabled={loading}
                onClick={() => {
                  if (confirm("Batalkan pengajuan menginap?")) jalankan(() => batalMenginap(), "Pengajuan dibatalkan");
                }}
                className="text-sm text-red-600 hover:bg-white/60 px-3 py-1.5 rounded-lg disabled:opacity-60"
              >
                Batalkan
              </button>
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-3 gap-3 text-sm text-gray-800">
          <div>
            <div className="text-xs text-gray-500">Jumlah orang</div>
            <div className="font-medium">
              {pengajuan.jumlahPutra} putra · {pengajuan.jumlahPutri} putri · {pengajuan.jumlahPendamping} pendamping
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Tanggal ({malam} malam)</div>
            <div className="font-medium">
              {formatTanggalMenginap(pengajuan.tanggalDatang)} – {formatTanggalMenginap(pengajuan.tanggalPulang)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Penanggung jawab</div>
            <div className="font-medium">
              {pengajuan.namaPj} · {pengajuan.noHpPj}
            </div>
          </div>
        </div>
        {pengajuan.catatanAdmin && (
          <div className="text-sm">
            <span className="font-semibold">Catatan panitia: </span>
            {pengajuan.catatanAdmin}
          </div>
        )}
        {status === "DISETUJUI" && (
          <div className="text-xs text-gray-600">Untuk perubahan setelah disetujui, hubungi panitia.</div>
        )}
      </div>
    );
  }

  if (!bisaUbah) return null;

  return (
    <form
      action={(data) => jalankan(() => ajukanMenginap(data), pengajuan ? "Pengajuan diperbarui" : "Pengajuan terkirim")}
      className="flex flex-col gap-4"
    >
      <div className="grid sm:grid-cols-3 gap-4">
        {(
          [
            ["jumlahPutra", "Jumlah putra"],
            ["jumlahPutri", "Jumlah putri"],
            ["jumlahPendamping", "Jumlah pendamping"],
          ] as const
        ).map(([name, label]) => (
          <div key={name} className="flex flex-col gap-1">
            <label className="text-sm font-medium">{label}</label>
            <input
              name={name}
              type="number"
              min={0}
              max={MAKS_ORANG_MENGINAP}
              required
              defaultValue={pengajuan?.[name] ?? 0}
              className={inputCls}
            />
          </div>
        ))}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Tanggal datang (malam pertama)</label>
          <input
            name="tanggalDatang"
            type="date"
            required
            defaultValue={toInputTanggal(pengajuan?.tanggalDatang)}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Tanggal pulang</label>
          <input
            name="tanggalPulang"
            type="date"
            required
            defaultValue={toInputTanggal(pengajuan?.tanggalPulang)}
            className={inputCls}
          />
        </div>
        <div />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Nama penanggung jawab</label>
          <input name="namaPj" required maxLength={100} defaultValue={pengajuan?.namaPj} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">No. HP / WhatsApp penanggung jawab</label>
          <input
            name="noHpPj"
            type="tel"
            required
            maxLength={20}
            defaultValue={pengajuan?.noHpPj}
            placeholder="08xxxxxxxxxx"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-3">
          <label className="text-sm font-medium">Catatan (opsional)</label>
          <textarea
            name="catatan"
            rows={2}
            maxLength={500}
            defaultValue={pengajuan?.catatan ?? ""}
            placeholder="Mis. ada peserta dengan kebutuhan khusus, perkiraan jam datang"
            className={inputCls}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {pengajuan && (
          <button
            type="button"
            disabled={loading}
            onClick={() => setEdit(false)}
            className="px-6 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-neutral-100 disabled:opacity-60"
          >
            Batal
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="bg-primary-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-600 transition-colors disabled:opacity-60"
        >
          {loading ? "Menyimpan..." : pengajuan ? "Simpan & ajukan ulang" : "Ajukan Menginap"}
        </button>
      </div>
    </form>
  );
}
