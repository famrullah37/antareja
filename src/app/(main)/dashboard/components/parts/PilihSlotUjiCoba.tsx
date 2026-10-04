"use client";

import { batalSlotUjiCoba, pilihSlotUjiCoba } from "@/actions/UjiCoba";
import { daftarSlot, formatJamWib, formatRentangSlot, formatTanggalWib } from "@/lib/ujiCoba";
import cn from "@/lib/clsx";
import { useRouter } from "next-nprogress-bar";
import { useState } from "react";
import { toast } from "sonner";

type Sesi = {
  id: string;
  nama: string;
  mulai: Date;
  selesai: Date;
  durasiMenit: number;
  terisi: string[]; // ISO waktu mulai slot yang diambil tim lain
};

export default function PilihSlotUjiCoba({
  sesi,
  milikku,
  terkunci,
}: {
  sesi: Sesi[];
  milikku: { sesiId: string; mulai: string } | null;
  terkunci: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const sesiku = milikku && sesi.find((s) => s.id === milikku.sesiId);
  const sekarang = Date.now();
  // Slot sendiri yang sudah dimulai juga tidak bisa diganti (dicek ulang di server).
  const bisaUbah = !terkunci && !(milikku && new Date(milikku.mulai).getTime() <= sekarang);

  async function jalankan(aksi: () => Promise<{ success: boolean; message?: string }>, berhasil: string) {
    setLoading(true);
    const toastId = toast.loading("Menyimpan...");
    const result = await aksi();
    setLoading(false);
    if (result.success) toast.success(berhasil, { id: toastId });
    else toast.error(result.message ?? "Gagal", { id: toastId });
    // Refresh juga saat gagal: slot yang baru diambil tim lain langsung terlihat terisi.
    router.refresh();
  }

  function pilih(s: Sesi, mulai: Date) {
    const label = `${s.nama}, ${formatTanggalWib(mulai)} ${formatRentangSlot(mulai, s.durasiMenit)}`;
    const pesan = milikku ? `Pindah slot ke ${label}?` : `Pilih slot ${label}?`;
    if (confirm(pesan)) jalankan(() => pilihSlotUjiCoba(s.id, mulai.toISOString()), "Slot uji coba tersimpan");
  }

  return (
    <div className="flex flex-col gap-6">
      {milikku && sesiku ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-green-700 uppercase tracking-wide">Slot tim kamu</div>
            <div className="font-bold text-gray-900">
              {sesiku.nama} · {formatTanggalWib(new Date(milikku.mulai))}
            </div>
            <div className="text-gray-700">{formatRentangSlot(new Date(milikku.mulai), sesiku.durasiMenit)}</div>
          </div>
          {bisaUbah && (
            <button
              disabled={loading}
              onClick={() => {
                if (confirm("Batalkan slot uji coba tim kamu? Slot akan bisa diambil tim lain."))
                  jalankan(() => batalSlotUjiCoba(), "Slot dibatalkan");
              }}
              className="text-sm text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg disabled:opacity-60"
            >
              Batalkan slot
            </button>
          )}
        </div>
      ) : (
        terkunci && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
            Batas waktu memilih slot sudah lewat. Hubungi panitia untuk mendapatkan jadwal uji coba.
          </div>
        )
      )}

      {bisaUbah &&
        sesi.map((s) => {
          const terisi = new Set(s.terisi.map((iso) => new Date(iso).getTime()));
          return (
            <div key={s.id} className="flex flex-col gap-3">
              <div>
                <div className="font-semibold text-gray-900">{s.nama}</div>
                <div className="text-sm text-gray-500">
                  {formatTanggalWib(s.mulai)} · {formatJamWib(s.mulai)}–{formatJamWib(s.selesai)} WIB ·{" "}
                  {s.durasiMenit} menit per tim
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {daftarSlot(s).map((mulai) => {
                  const t = mulai.getTime();
                  const punyaku = milikku?.sesiId === s.id && new Date(milikku.mulai).getTime() === t;
                  const diambil = terisi.has(t);
                  const lewat = t <= sekarang;
                  const nonaktif = loading || punyaku || diambil || lewat;
                  return (
                    <button
                      key={t}
                      disabled={nonaktif}
                      onClick={() => pilih(s, mulai)}
                      title={punyaku ? "Slot tim kamu" : diambil ? "Sudah diambil tim lain" : lewat ? "Sudah lewat" : "Pilih slot ini"}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-xs sm:text-sm font-semibold transition-colors",
                        punyaku && "bg-green-500 border-green-500 text-white",
                        !punyaku && (diambil || lewat) && "bg-neutral-100 border-neutral-200 text-neutral-400 line-through",
                        !nonaktif && "bg-white border-primary-200 text-primary-600 hover:bg-primary-50"
                      )}
                    >
                      {formatJamWib(mulai)}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

      {bisaUbah && (
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border border-primary-200 bg-white" /> Tersedia
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-neutral-200" /> Terisi / lewat
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-green-500" /> Slot tim kamu
          </span>
        </div>
      )}
    </div>
  );
}
