"use client";

import { centangSemuaSesuai, resetPresensiDP, setSesuaiAnggota } from "@/actions/PresensiDP";
import { KONDISI_TIM, kondisiTim, noUrutLabel, ringkasPresensi } from "@/lib/presensiDp";
import cn from "@/lib/clsx";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next-nprogress-bar";
import { useState } from "react";
import { toast } from "sonner";

type Anggota = {
  id: string;
  nama: string;
  foto: string;
  nisn: string | null;
  kelas: string | null;
  tanggalLahir: string | null;
  sesuai: boolean;
  olehNama: string | null;
};

type Slot = { posisi: string; anggota: Anggota | null };

type Props = {
  tim: {
    id: string;
    nama_tim: string;
    asal_sekolah: string;
    jenjang: string;
    tipe_tim: string;
    noUrut: number | null;
    confirmed: boolean;
    foto: string | null;
  };
  presensi: { hadirAt: string; olehNama: string } | null;
  slot: Slot[];
};

const btnCls = "rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60";

// tanggal_lahir kolom DATE (tanpa jam) → tampilkan apa adanya, jangan digeser zona waktu.
const formatTanggal = (v: string) =>
  new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const jamWIB = (iso: string) =>
  new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

function KartuAnggota({ timId, bisa, posisi, a }: { timId: string; bisa: boolean; posisi: string; a: Anggota | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!a)
    return (
      <div className="rounded-2xl border-2 border-dashed border-red-300 bg-red-50 p-4 flex flex-col gap-1">
        <div className="text-xs font-bold text-red-700">{posisi}</div>
        <div className="text-sm text-red-700">Slot belum diisi tim saat pendaftaran — tidak ada data pembanding.</div>
      </div>
    );

  async function toggle() {
    setLoading(true);
    const result = await setSesuaiAnggota(timId, a!.id, !a!.sesuai);
    setLoading(false);
    if (!result.success) toast.error(result.message ?? "Gagal");
    router.refresh();
  }

  return (
    <label
      className={cn(
        "rounded-2xl border-2 bg-white overflow-hidden flex flex-col select-none",
        bisa ? "cursor-pointer" : "opacity-70",
        a.sesuai ? "border-green-500" : "border-neutral-200"
      )}
    >
      <div className="relative w-full aspect-[3/4] bg-neutral-200">
        <Image src={a.foto} alt={`Foto ${a.nama}`} fill sizes="(max-width: 640px) 50vw, 240px" className="object-cover" unoptimized />
        <span className="absolute top-2 left-2 bg-black/70 text-white text-xs font-bold rounded px-2 py-0.5">
          {posisi}
        </span>
      </div>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div>
          <div className="font-bold leading-tight">{a.nama}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            NISN {a.nisn || "—"} · Kelas {a.kelas || "—"}
            {a.tanggalLahir && <> · Lahir {formatTanggal(a.tanggalLahir)}</>}
          </div>
        </div>
        <div
          className={cn(
            "mt-auto flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold",
            a.sesuai ? "bg-green-100 border-green-300 text-green-800" : "border-neutral-300 text-gray-600"
          )}
        >
          <input
            type="checkbox"
            checked={a.sesuai}
            disabled={!bisa || loading}
            onChange={toggle}
            className="w-5 h-5 accent-green-600"
          />
          Sesuai
        </div>
        {a.sesuai && a.olehNama && <div className="text-[11px] text-gray-400">dicentang {a.olehNama}</div>}
      </div>
    </label>
  );
}

export default function PresensiTim({ tim, presensi, slot }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const ringkas = ringkasPresensi(
    tim.tipe_tim,
    new Map(slot.filter((s) => s.anggota).map((s) => [s.posisi, s.anggota!.sesuai]))
  );
  const kondisi = kondisiTim(!!presensi, ringkas);
  const belum = slot.filter((s) => s.anggota && !s.anggota.sesuai).length;

  async function jalankan(aksi: () => Promise<{ success: boolean; message?: string }>, sukses: string) {
    setLoading(true);
    const result = await aksi();
    setLoading(false);
    if (result.success) toast.success(sukses);
    else toast.error(result.message ?? "Gagal");
    router.refresh();
  }

  return (
    <div className="py-6 flex flex-col gap-6">
      <Link href="/admin/presensi-dp" className="text-sm text-primary-600 hover:underline w-fit">
        ← Kembali ke daftar tim
      </Link>

      <div className="bg-white rounded-2xl border border-neutral-200 p-5 flex flex-wrap items-center gap-5">
        {tim.foto && (
          <div className="relative w-24 h-24 shrink-0">
            <Image src={tim.foto} alt={tim.nama_tim} fill sizes="96px" className="object-cover rounded-xl" unoptimized />
          </div>
        )}
        <div className="flex-1 min-w-[200px]">
          <div className="font-mono font-bold text-primary-600">{noUrutLabel(tim.jenjang, tim.noUrut)}</div>
          <h1 className="text-2xl font-bold">{tim.nama_tim}</h1>
          <div className="text-sm text-gray-500">
            {tim.asal_sekolah} · {tim.tipe_tim === "SMALL" ? 12 : 15} pasukan + Danton
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={cn("text-xs border rounded-full px-2.5 py-1", KONDISI_TIM[kondisi].cls)}>
              {KONDISI_TIM[kondisi].label}
            </span>
            <span className="text-sm font-semibold">
              {ringkas.sesuai}/{ringkas.total} sesuai
            </span>
            {ringkas.slotKosong > 0 && <span className="text-sm text-red-600">· {ringkas.slotKosong} slot kosong</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {!tim.confirmed ? (
            <div className="text-sm text-yellow-700">Pembayaran tim belum terkonfirmasi</div>
          ) : (
            <>
              {presensi && (
                <div className="text-sm text-gray-500 text-right">
                  Hadir {jamWIB(presensi.hadirAt)} WIB · {presensi.olehNama}
                </div>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                {belum > 0 && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => jalankan(() => centangSemuaSesuai(tim.id), "Semua anggota dicentang sesuai")}
                    className={cn(btnCls, "bg-green-600 text-white hover:bg-green-700")}
                  >
                    Centang Semua Sesuai
                  </button>
                )}
                {presensi && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      if (confirm(`Reset presensi ${tim.nama_tim}? Semua centang tim ini dihapus.`))
                        jalankan(() => resetPresensiDP(tim.id), "Presensi direset");
                    }}
                    className={cn(btnCls, "border border-neutral-300 text-gray-600 hover:bg-neutral-50")}
                  >
                    Reset
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {slot.map((s) => (
          <KartuAnggota key={s.posisi} timId={tim.id} bisa={tim.confirmed} posisi={s.posisi} a={s.anggota} />
        ))}
      </div>
    </div>
  );
}
