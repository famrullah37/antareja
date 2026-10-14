"use client";

import { hapusPengajuanMenginap, tinjauMenginap } from "@/actions/Menginap";
import { formatTanggalMenginap, jumlahMalam, STATUS_MENGINAP, type StatusMenginap } from "@/lib/menginap";
import cn from "@/lib/clsx";
import { useRouter } from "next-nprogress-bar";
import { useState } from "react";
import { toast } from "sonner";

type Pengajuan = {
  id: string;
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
  tim: { id: string; nama_tim: string; asal_sekolah: string; jenjang: string; ruangan: { nama: string } | null };
};

const inputCls =
  "border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400";

function waLink(noHp: string) {
  const digit = noHp.replace(/\D/g, "");
  return `https://wa.me/${digit.startsWith("0") ? "62" + digit.slice(1) : digit}`;
}

function Baris({ p }: { p: Pengajuan }) {
  const router = useRouter();
  const [catatan, setCatatan] = useState(p.catatanAdmin ?? "");
  const [loading, setLoading] = useState(false);
  const status = (p.status in STATUS_MENGINAP ? p.status : "PENDING") as StatusMenginap;
  const malam = jumlahMalam(p.tanggalDatang, p.tanggalPulang);

  async function jalankan(aksi: () => Promise<{ success: boolean; message?: string }>, berhasil: string) {
    setLoading(true);
    const toastId = toast.loading("Memproses...");
    const result = await aksi();
    setLoading(false);
    if (result.success) {
      toast.success(berhasil, { id: toastId });
      router.refresh();
    } else {
      toast.error(result.message ?? "Gagal", { id: toastId });
    }
  }

  const simpan = (s: StatusMenginap, pesan: string) =>
    jalankan(() => tinjauMenginap(p.id, { status: s, catatanAdmin: catatan }), pesan);

  return (
    <div className="px-6 py-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{p.tim.nama_tim}</div>
          <div className="text-sm text-gray-500">
            {p.tim.asal_sekolah} · {p.tim.jenjang} · Basecamp:{" "}
            <a href="/admin/basecamp" className="text-primary-600 hover:underline">
              {p.tim.ruangan?.nama ?? "belum ditentukan"}
            </a>
          </div>
        </div>
        <span className={cn("text-xs font-semibold border rounded-full px-3 py-1", STATUS_MENGINAP[status].cls)}>
          {STATUS_MENGINAP[status].label}
        </span>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-xs text-gray-500">Jumlah orang</div>
          <div className="font-medium">
            {p.jumlahPutra} putra · {p.jumlahPutri} putri · {p.jumlahPendamping} pendamping
          </div>
          <div className="text-gray-500">Total {p.jumlahPutra + p.jumlahPutri + p.jumlahPendamping} orang</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Tanggal ({malam} malam)</div>
          <div className="font-medium">{formatTanggalMenginap(p.tanggalDatang)}</div>
          <div className="text-gray-500">s.d. {formatTanggalMenginap(p.tanggalPulang)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Penanggung jawab</div>
          <div className="font-medium">{p.namaPj}</div>
          <a href={waLink(p.noHpPj)} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
            {p.noHpPj}
          </a>
        </div>
      </div>
      {p.catatan && (
        <div className="text-sm bg-neutral-50 rounded-lg px-3 py-2">
          <span className="text-gray-500">Catatan tim: </span>
          <span className="whitespace-pre-line">{p.catatan}</span>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-xs font-medium text-gray-600">Catatan untuk tim</label>
          <input
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            maxLength={500}
            placeholder="Wajib diisi kalau menolak"
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          disabled={loading}
          onClick={() => simpan("DISETUJUI", status === "DISETUJUI" ? "Tersimpan" : "Pengajuan disetujui")}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
        >
          {status === "DISETUJUI" ? "Simpan" : "Setujui"}
        </button>
        {status !== "DITOLAK" && (
          <button
            disabled={loading}
            onClick={() => {
              if (confirm(`Tolak pengajuan menginap ${p.tim.nama_tim}?`)) simpan("DITOLAK", "Pengajuan ditolak");
            }}
            className="bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-50 disabled:opacity-60"
          >
            Tolak
          </button>
        )}
        {status !== "PENDING" && (
          <button
            disabled={loading}
            onClick={() => simpan("PENDING", "Dikembalikan ke menunggu")}
            className="text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-neutral-100 disabled:opacity-60"
          >
            Kembalikan ke menunggu
          </button>
        )}
        <button
          disabled={loading}
          onClick={() => {
            if (confirm(`Hapus pengajuan menginap ${p.tim.nama_tim}? Tim bisa mengajukan ulang.`))
              jalankan(() => hapusPengajuanMenginap(p.id), "Pengajuan dihapus");
          }}
          className="ml-auto text-red-600 px-3 py-2 rounded-lg text-sm hover:bg-red-50 disabled:opacity-60"
        >
          Hapus
        </button>
      </div>
    </div>
  );
}

export default function DaftarMenginap({ pengajuan }: { pengajuan: Pengajuan[] }) {
  if (pengajuan.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center text-gray-400">
        Belum ada pengajuan menginap dari tim.
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden divide-y divide-neutral-100">
      {pengajuan.map((p) => (
        <Baris key={p.id} p={p} />
      ))}
    </div>
  );
}
