"use client";

import { batalTiketDiambil, tandaiTiketDiambil } from "@/actions/Tiket";
import { useRouter } from "next-nprogress-bar";
import { useState } from "react";
import { toast } from "sonner";

export type TiketOnline = {
  id: string;
  nama: string;
  email: string;
  noHp: string;
  jenis: string;
  jumlah: number;
  bundleJumlah: number;
  bundleIsi: string | null;
  kodeUnik: string | null;
  diambilAt: string | null;
};

function jamWib(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

// Daftar tiket online terverifikasi di halaman POS — petugas loket mencari
// pembeli lalu menandai tiketnya sudah diambil.
export default function TiketOnlineDiambil({ tiket }: { tiket: TiketOnline[] }) {
  const router = useRouter();
  const [cari, setCari] = useState("");
  const [filter, setFilter] = useState<"BELUM" | "SUDAH" | "SEMUA">("BELUM");
  const [busy, setBusy] = useState<string | null>(null);

  const q = cari.trim().toLowerCase();
  const sudah = tiket.filter((t) => t.diambilAt).length;
  const tampil = tiket.filter(
    (t) =>
      (filter === "SEMUA" || (filter === "SUDAH" ? !!t.diambilAt : !t.diambilAt)) &&
      (!q ||
        t.nama.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.noHp.includes(q) ||
        (t.kodeUnik ?? "").includes(q))
  );

  async function aksi(id: string, fn: (id: string) => Promise<{ success: boolean; message?: string }>, ok: string) {
    setBusy(id);
    const r = await fn(id);
    setBusy(null);
    if (r.success) {
      toast.success(ok);
      router.refresh();
    } else toast.error(r.message ?? "Gagal");
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-lg">Tiket Online Terverifikasi</h2>
        <span className="text-sm text-gray-500">
          {sudah} / {tiket.length} sudah diambil
        </span>
      </div>

      <input
        value={cari}
        onChange={(e) => setCari(e.target.value)}
        placeholder="Cari nama, kode, email, atau no. HP"
        className="border border-neutral-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
      />
      <div className="flex gap-2">
        {(["BELUM", "SUDAH", "SEMUA"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              filter === f ? "bg-primary-500 text-white border-primary-500" : "bg-white border-neutral-200 text-neutral-600"
            }`}
          >
            {f === "BELUM" ? "Belum diambil" : f === "SUDAH" ? "Sudah diambil" : "Semua"}
          </button>
        ))}
      </div>

      {tampil.length === 0 ? (
        <p className="text-sm text-gray-400">Tidak ada tiket.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 border border-neutral-200 rounded-xl">
          {tampil.map((t) => (
            <li key={t.id} className={`p-4 flex flex-col gap-2 ${t.diambilAt ? "bg-green-50" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{t.nama}</div>
                  <div className="text-xs text-gray-500 break-all">
                    {t.email} · {t.noHp}
                  </div>
                </div>
                {t.kodeUnik && (
                  <span className="font-mono font-bold text-primary-600 tracking-widest shrink-0">#{t.kodeUnik}</span>
                )}
              </div>
              <div className="text-sm">
                Tiket <b>{t.jenis}</b> × {t.jumlah}
                {t.bundleJumlah > 0 && (
                  <span className="ml-2 text-xs bg-amber-100 text-amber-800 rounded px-2 py-0.5">
                    + {t.bundleIsi ?? "Bundling"} × {t.bundleJumlah}
                  </span>
                )}
              </div>
              {t.diambilAt ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-green-700">✓ Sudah diambil {jamWib(t.diambilAt)} WIB</span>
                  <button
                    type="button"
                    disabled={busy === t.id}
                    onClick={() =>
                      confirm(`Batalkan tanda diambil untuk ${t.nama}?`) &&
                      aksi(t.id, batalTiketDiambil, "Tanda diambil dibatalkan")
                    }
                    className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-60"
                  >
                    Batalkan
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy === t.id}
                  onClick={() => aksi(t.id, tandaiTiketDiambil, `Tiket ${t.nama} ditandai diambil`)}
                  className="self-start bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600 disabled:opacity-60"
                >
                  Tandai Diambil
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
