"use client";

import { adminHapusSlotUjiCoba, adminSetSlotUjiCoba, deleteSesiUjiCoba } from "@/actions/UjiCoba";
import { daftarSlot, formatJamWib, formatRentangSlot, formatTanggalWib } from "@/lib/ujiCoba";
import { useRouter } from "next-nprogress-bar";
import { toast } from "sonner";

type TimRingkas = { id: string; nama_tim: string; asal_sekolah: string; jenjang: string };
type Sesi = {
  id: string;
  nama: string;
  mulai: Date;
  selesai: Date;
  durasiMenit: number;
  bookings: { timId: string; mulai: Date; tim: TimRingkas }[];
};

export default function JadwalUjiCoba({ sesi, belumPilih }: { sesi: Sesi[]; belumPilih: TimRingkas[] }) {
  const router = useRouter();

  async function jalankan(aksi: () => Promise<{ success: boolean; message?: string }>, berhasil: string) {
    const toastId = toast.loading("Memproses...");
    const result = await aksi();
    if (result.success) {
      toast.success(berhasil, { id: toastId });
      router.refresh();
    } else {
      toast.error(result.message ?? "Gagal", { id: toastId });
    }
  }

  if (sesi.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center text-gray-400">
        Belum ada sesi uji coba. Tambahkan melalui form di atas — slot akan muncul di dashboard tim.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {sesi.map((s) => {
        const terisi = new Map(s.bookings.map((b) => [new Date(b.mulai).getTime(), b]));
        const slots = daftarSlot(s);
        return (
          <div key={s.id} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{s.nama}</div>
                <div className="text-sm text-gray-500">
                  {formatTanggalWib(s.mulai)} · {formatJamWib(s.mulai)}–{formatJamWib(s.selesai)} WIB ·{" "}
                  {s.durasiMenit} menit/tim · {s.bookings.length}/{slots.length} terisi
                </div>
              </div>
              <button
                onClick={() => {
                  const peringatan = s.bookings.length
                    ? `\n\n${s.bookings.length} tim yang sudah memilih slot di sesi ini akan kehilangan slotnya.`
                    : "";
                  if (confirm(`Hapus sesi "${s.nama}"?${peringatan}`))
                    jalankan(() => deleteSesiUjiCoba(s.id), "Sesi dihapus");
                }}
                className="text-sm text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg"
              >
                Hapus sesi
              </button>
            </div>
            <div className="divide-y divide-neutral-100">
              {slots.map((mulai) => {
                const b = terisi.get(mulai.getTime());
                return (
                  <div key={mulai.getTime()} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-2.5 text-sm">
                    <span className="w-36 shrink-0 font-mono text-gray-700">
                      {formatRentangSlot(mulai, s.durasiMenit)}
                    </span>
                    {b ? (
                      <>
                        <span className="flex-1 min-w-0">
                          <span className="font-semibold">{b.tim.nama_tim}</span>
                          <span className="text-gray-500">
                            {" "}
                            · {b.tim.asal_sekolah} · {b.tim.jenjang}
                          </span>
                        </span>
                        <button
                          onClick={() => {
                            if (confirm(`Kosongkan slot ${b.tim.nama_tim}?`))
                              jalankan(() => adminHapusSlotUjiCoba(b.timId), "Slot dikosongkan");
                          }}
                          className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg"
                        >
                          Kosongkan
                        </button>
                      </>
                    ) : belumPilih.length > 0 ? (
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          const timId = e.target.value;
                          e.target.value = "";
                          if (timId)
                            jalankan(
                              () => adminSetSlotUjiCoba(timId, s.id, mulai.toISOString()),
                              "Tim ditempatkan"
                            );
                        }}
                        className="flex-1 min-w-[200px] border border-dashed border-neutral-300 rounded-lg px-3 py-1.5 text-sm text-gray-500"
                      >
                        <option value="">— Kosong (pilih tim untuk menempatkan) —</option>
                        {belumPilih.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nama_tim} · {t.asal_sekolah} · {t.jenjang}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="flex-1 text-gray-400">Kosong</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100 font-semibold">
          Tim Belum Memilih Slot ({belumPilih.length})
        </div>
        {belumPilih.length === 0 ? (
          <div className="px-6 py-6 text-sm text-gray-400">Semua tim terverifikasi sudah punya slot.</div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {belumPilih.map((t) => (
              <li key={t.id} className="px-6 py-2.5 text-sm">
                <span className="font-semibold">{t.nama_tim}</span>
                <span className="text-gray-500">
                  {" "}
                  · {t.asal_sekolah} · {t.jenjang}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
