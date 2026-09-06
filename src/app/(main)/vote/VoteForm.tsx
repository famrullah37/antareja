"use client";

import { getDynamicQrisVoting, reserveKodeVoting, submitVote } from "@/actions/Voting";
import { initials } from "@/lib/initials";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

type TimVote = {
  id: string;
  nama_tim: string;
  asal_sekolah: string;
  jenjang: string;
  totalVote: number;
  foto: string | null;
};

type KonfigVoting = {
  qrisUrl?: string | null;
  bankNama?: string | null;
  bankNoRek?: string | null;
  bankAtasNama?: string | null;
} | null;

function Avatar({ tim, className }: { tim: TimVote; className: string }) {
  return tim.foto ? (
    <img src={tim.foto} alt={tim.nama_tim} className={`${className} object-cover`} />
  ) : (
    <div className={`${className} bg-primary-100 text-primary-600 font-bold flex items-center justify-center`}>
      {initials(tim.nama_tim)}
    </div>
  );
}

// Podium 3 besar: #1 di tengah (paling tinggi & emas), #2 di kiri (silver),
// #3 di kanan (perunggu) — urutan klasik podium juara.
const PODIUM_STYLES = [
  { order: "order-2", height: "h-44", bg: "bg-gradient-to-b from-amber-400 to-amber-500" },
  { order: "order-1", height: "h-36", bg: "bg-gradient-to-b from-slate-300 to-slate-400" },
  { order: "order-3", height: "h-32", bg: "bg-gradient-to-b from-orange-300 to-orange-400" },
];

export default function VoteForm({
  tims,
  userId,
  konfig,
}: {
  tims: TimVote[];
  userId?: string;
  konfig: KonfigVoting;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<TimVote | null>(null);
  const [reserved, setReserved] = useState<{ kodeUnik: string; hargaSatuan: number } | null>(null);
  const [loadingReserve, setLoadingReserve] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [jumlahVote, setJumlahVote] = useState(1);
  const [qrisDinamis, setQrisDinamis] = useState<string | null>(null);

  const totalBayar = reserved ? reserved.hargaSatuan * jumlahVote + parseInt(reserved.kodeUnik) : 0;

  const ranked = tims.slice().sort((a, b) => b.totalVote - a.totalVote);
  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  // Papan Dukungan (leaderboard) update otomatis tanpa reload halaman.
  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 20000);
    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    if (!reserved || totalBayar <= 0) {
      setQrisDinamis(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await getDynamicQrisVoting(totalBayar);
      if (!cancelled) setQrisDinamis(result.success ? result.dataUrl! : null);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [reserved, totalBayar]);

  async function handlePilihTim(tim: TimVote) {
    setSelected(tim);
    setReserved(null);
    setJumlahVote(1);
    setLoadingReserve(true);
    const result = await reserveKodeVoting();
    setLoadingReserve(false);
    if (result.success) {
      setReserved({ kodeUnik: result.kodeUnik!, hargaSatuan: result.hargaSatuan! });
    } else {
      toast.error(result.message ?? "Gagal menyiapkan kode pembayaran");
      setSelected(null);
    }
  }

  async function handleSubmit(data: FormData) {
    const toastId = toast.loading("Memproses...");
    const result = await submitVote(data, userId);
    if (result.success) {
      toast.success(
        "Dukungan diterima! Admin akan memverifikasi bukti pembayaranmu.",
        { id: toastId, duration: 5000 }
      );
      setSubmitted(true);
    } else {
      toast.error(result.message ?? "Gagal mengirim dukungan", { id: toastId, duration: 6000 });
      if (result.message?.includes("ulangi dari pemilihan tim")) {
        setSelected(null);
        setReserved(null);
      }
    }
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-xl font-bold text-green-800 mb-2">
          Dukungan Terkirim!
        </h2>
        <p className="text-green-700 text-sm">
          Tim kami akan memverifikasi bukti pembayaranmu. Suara akan dihitung setelah terverifikasi.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Papan Peringkat */}
      {ranked.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Papan Dukungan</h3>
            <span className="text-[11px] text-gray-400">Update otomatis setelah verifikasi admin</span>
          </div>

          {/* Podium top 3 */}
          <div className="flex items-end justify-center gap-3 mb-4">
            {top3.map((t, i) => {
              const style = PODIUM_STYLES[i];
              return (
                <div key={t.id} className={`flex-1 max-w-[170px] ${style.order}`}>
                  <div
                    className={`rounded-2xl ${style.bg} ${style.height} text-white flex flex-col items-center justify-between p-3 shadow-md`}
                  >
                    <span className="text-xs font-bold bg-white/25 rounded-full px-2.5 py-0.5">
                      #{i + 1}
                    </span>
                    <Avatar tim={t} className="w-12 h-12 rounded-full border-2 border-white/70" />
                    <div className="text-center">
                      <div className="font-bold text-sm leading-tight line-clamp-2">{t.nama_tim}</div>
                      <div className="text-xs opacity-90 mt-1">{t.totalVote} suara</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sisanya (ranking 4 dst) */}
          {rest.length > 0 && (
            <div className="flex flex-col divide-y divide-gray-100">
              {rest.map((t, i) => (
                <div key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-gray-400 font-mono text-xs">{i + 4}</span>
                    <Avatar tim={t} className="w-8 h-8 rounded-full" />
                    <div>
                      <div className="font-medium">{t.nama_tim}</div>
                      <div className="text-xs text-gray-400">{t.asal_sekolah} — {t.jenjang}</div>
                    </div>
                  </div>
                  <span className="font-bold text-primary-600">{t.totalVote} suara</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pilih Tim */}
      <div>
        <h3 className="font-semibold text-lg mb-3">Pilih Peserta Favorit untuk Vote</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {ranked.map((t, i) => (
            <div
              key={t.id}
              className={`rounded-2xl border-2 p-5 flex flex-col items-center text-center gap-2 transition-all ${
                selected?.id === t.id
                  ? "border-primary-500 bg-primary-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="relative mb-1">
                <Avatar tim={t} className="w-20 h-20 rounded-full border-2 border-white shadow" />
                <span className="absolute -top-1 -left-1 bg-primary-500 text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center border-2 border-white">
                  #{i + 1}
                </span>
              </div>
              <div className="font-bold text-base leading-snug line-clamp-2">{t.nama_tim}</div>
              <div className="text-xs text-gray-400 -mt-1">{t.asal_sekolah}</div>
              <div className="text-sm text-gray-500">{t.totalVote} suara</div>
              <button
                type="button"
                onClick={() => handlePilihTim(t)}
                className="w-full bg-primary-500 hover:bg-primary-600 text-white rounded-xl py-2.5 font-semibold transition-colors mt-1"
              >
                Pilih
              </button>
            </div>
          ))}
        </div>
      </div>

      {selected && loadingReserve && (
        <p className="text-sm text-gray-400">Menyiapkan kode pembayaran...</p>
      )}

      {selected && reserved && (
        <form action={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="timId" value={selected.id} />
          <input type="hidden" name="kodeUnik" value={reserved.kodeUnik} />
          <input type="hidden" name="jumlahVote" value={jumlahVote} />

          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-4">
            <h3 className="font-semibold text-lg">
              Dukung {selected.nama_tim}
            </h3>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Jumlah Vote</label>
              <input
                type="number"
                min={1}
                value={jumlahVote}
                onChange={(e) => setJumlahVote(Math.max(1, parseInt(e.target.value) || 1))}
                className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <span className="text-xs text-gray-400">
                {formatRupiah(reserved.hargaSatuan)} × {jumlahVote} vote
              </span>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-800 flex flex-col items-center gap-2">
              <p className="font-semibold">Scan QRIS berikut:</p>
              {qrisDinamis ? (
                <img
                  src={qrisDinamis}
                  alt="QRIS Dinamis"
                  className="w-48 h-48 object-contain rounded-lg border border-purple-200 bg-white"
                />
              ) : konfig?.qrisUrl ? (
                <img
                  src={konfig.qrisUrl}
                  alt="QRIS"
                  className="w-48 h-48 object-contain rounded-lg border border-purple-200 bg-white"
                />
              ) : (
                <div className="w-40 h-40 bg-white border border-purple-200 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                  QRIS belum dikonfigurasi
                </div>
              )}
              <div className="bg-purple-100 rounded-lg px-4 py-2 text-center w-full">
                <p className="text-xs text-purple-600">Total yang harus dibayar (tepat)</p>
                <p className="font-bold text-2xl">{formatRupiah(totalBayar)}</p>
                <p className="text-xs text-purple-500 mt-1">
                  {formatRupiah(reserved.hargaSatuan * jumlahVote)} + kode unik {reserved.kodeUnik}
                </p>
              </div>
              {qrisDinamis ? (
                <p className="text-xs text-purple-500">Nominal sudah otomatis terisi di QRIS — tinggal scan & bayar sesuai jumlah yang muncul.</p>
              ) : (
                <p className="text-xs text-purple-500">Transfer nominal tepat (termasuk kode unik) agar mudah diverifikasi admin.</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Nama Lengkap</label>
              <input
                name="nama"
                required
                placeholder="Nama pendukung"
                className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Email</label>
              <input
                name="email"
                type="email"
                required
                placeholder="email@contoh.com"
                className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">No. WhatsApp</label>
              <input
                name="noHp"
                required
                placeholder="08xxxxxxxxxx"
                className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Bukti Pembayaran QRIS</label>
              <input
                name="bukti"
                type="file"
                accept="image/*"
                required
                className="border border-gray-200 py-3 px-3 rounded-xl file:bg-primary-500 file:text-white file:rounded-md file:border-none file:py-1 hover:cursor-pointer"
              />
            </div>
          </div>

          <button
            type="submit"
            className="bg-primary-500 text-white rounded-xl py-4 font-bold hover:bg-primary-600 transition-colors"
          >
            Kirim Dukungan
          </button>
        </form>
      )}
    </div>
  );
}
