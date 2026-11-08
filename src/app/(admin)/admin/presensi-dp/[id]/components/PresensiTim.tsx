"use client";

import { centangSemuaSesuai, resetPresensiDP, setStatusAnggota } from "@/actions/PresensiDP";
import { KONDISI_TIM, kondisiTim, noUrutLabel, ringkasPresensi, type StatusAnggota } from "@/lib/presensiDp";
import cn from "@/lib/clsx";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next-nprogress-bar";
import { useState } from "react";
import { toast } from "sonner";
import StatusGugurTim, { type DataGugur } from "../../../components/StatusGugurTim";

type Anggota = {
  id: string;
  nama: string;
  foto: string;
  nisn: string | null;
  kelas: string | null;
  tanggalLahir: string | null;
  status: StatusAnggota;
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
  gugur: DataGugur;
  nilaiDipublish: boolean;
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

  async function ubah(status: StatusAnggota) {
    if (loading) return;
    setLoading(true);
    const result = await setStatusAnggota(timId, a!.id, status).catch(() => ({ success: false, message: "Koneksi terputus" }));
    setLoading(false);
    if (!result.success) toast.error(result.message ?? "Gagal");
    router.refresh();
  }

  const sesuai = a.status === "SESUAI";
  const absen = a.status === "TIDAK_HADIR";

  return (
    <div
      className={cn(
        "rounded-2xl border-2 bg-white overflow-hidden flex flex-col select-none",
        !bisa && "opacity-70",
        sesuai ? "border-green-500" : absen ? "border-orange-400" : "border-neutral-200"
      )}
    >
      <div className={cn("relative w-full aspect-[3/4] bg-neutral-200", absen && "grayscale")}>
        <Image src={a.foto} alt={`Foto ${a.nama}`} fill sizes="(max-width: 640px) 50vw, 240px" className="object-cover" unoptimized />
        <span className="absolute top-2 left-2 bg-black/70 text-white text-xs font-bold rounded px-2 py-0.5">
          {posisi}
        </span>
        {absen && (
          <span className="absolute bottom-2 left-2 right-2 rounded bg-orange-600 py-1 text-center text-xs font-bold text-white">
            TIDAK HADIR
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div>
          <div className="font-bold leading-tight">{a.nama}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            NISN {a.nisn || "—"} · Kelas {a.kelas || "—"}
            {a.tanggalLahir && <> · Lahir {formatTanggal(a.tanggalLahir)}</>}
          </div>
        </div>
        {/* Anggota tidak hadir ≠ tim tidak hadir: tim tetap ikut lomba. Ketuk lagi untuk menghapus tanda. */}
        <div className="mt-auto grid grid-cols-2 gap-1.5">
          <button
            type="button"
            disabled={!bisa || loading}
            onClick={() => ubah(sesuai ? null : "SESUAI")}
            className={cn(
              "rounded-lg border px-2 py-2 text-sm font-semibold disabled:opacity-60",
              sesuai ? "bg-green-600 border-green-600 text-white" : "border-neutral-300 text-gray-700 hover:bg-green-50"
            )}
          >
            ✓ Sesuai
          </button>
          <button
            type="button"
            disabled={!bisa || loading}
            onClick={() => ubah(absen ? null : "TIDAK_HADIR")}
            className={cn(
              "rounded-lg border px-2 py-2 text-sm font-semibold disabled:opacity-60",
              absen ? "bg-orange-500 border-orange-500 text-white" : "border-neutral-300 text-gray-700 hover:bg-orange-50"
            )}
          >
            Tidak hadir
          </button>
        </div>
        {a.status && a.olehNama && <div className="text-[11px] text-gray-400">ditandai {a.olehNama}</div>}
      </div>
    </div>
  );
}

export default function PresensiTim({ tim, presensi, slot, gugur, nilaiDipublish }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const ringkas = ringkasPresensi(
    tim.tipe_tim,
    new Map(slot.filter((s) => s.anggota).map((s) => [s.posisi, s.anggota!.status]))
  );
  const tGugur = !!gugur.gugurAt;
  const kondisi = kondisiTim(!!presensi, ringkas, tGugur);
  // Tim mundur / tidak hadir tidak dicentang (server juga menolak).
  const bisaCentang = tim.confirmed && !tGugur;
  // "Centang semua sesuai" hanya mengisi anggota yang BELUM dicek (yang ditandai tidak hadir tidak berubah).
  const belum = slot.filter((s) => s.anggota && !s.anggota.status).length;

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
            {ringkas.tidakHadir > 0 && (
              <span className="text-sm text-orange-700 font-semibold">· {ringkas.tidakHadir} anggota tidak hadir</span>
            )}
            {ringkas.belumDicek > 0 && presensi && (
              <span className="text-sm text-gray-500">· {ringkas.belumDicek} belum dicek</span>
            )}
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
                {belum > 0 && bisaCentang && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => jalankan(() => centangSemuaSesuai(tim.id), "Semua anggota dicentang sesuai")}
                    className={cn(btnCls, "bg-green-600 text-white hover:bg-green-700")}
                  >
                    Sisanya Sesuai ({belum})
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

      <StatusGugurTim
        timId={tim.id}
        namaTim={tim.nama_tim}
        confirmed={tim.confirmed}
        data={gugur}
        sudahPresensi={!!presensi}
        nilaiDipublish={nilaiDipublish}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {slot.map((s) => (
          <KartuAnggota key={s.posisi} timId={tim.id} bisa={bisaCentang} posisi={s.posisi} a={s.anggota} />
        ))}
      </div>
    </div>
  );
}
