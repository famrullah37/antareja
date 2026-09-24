"use client";

import { useMemo, useState } from "react";

type LogItem = {
  id: string;
  userNama: string;
  userRole: string;
  aksi: string;
  detail: string | null;
  createdAt: Date;
};

function formatWaktu(d: Date) {
  return new Date(d).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

const aksiBadge: Record<string, string> = {
  LOGIN: "bg-neutral-100 text-neutral-600",
  VERIFIKASI_TIKET: "bg-green-100 text-green-700",
  VERIFIKASI_FOTO: "bg-green-100 text-green-700",
  VERIFIKASI_VOTING: "bg-green-100 text-green-700",
  KONFIRMASI_PEMBAYARAN_TIM: "bg-green-100 text-green-700",
  JUAL_TIKET_OFFLINE: "bg-blue-100 text-blue-700",
  TOLAK_TIKET: "bg-red-100 text-red-700",
  TOLAK_FOTO: "bg-red-100 text-red-700",
  TOLAK_VOTING: "bg-red-100 text-red-700",
  BATAL_KONFIRMASI_PEMBAYARAN_TIM: "bg-red-100 text-red-700",
};

function aksiLabel(aksi: string) {
  return aksi.replace(/_/g, " ");
}

export default function LogAktivitasClient({ logs }: { logs: LogItem[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return logs;
    return logs.filter((l) =>
      [l.userNama, l.userRole, l.aksi, l.detail ?? ""].some((v) => v.toLowerCase().includes(term))
    );
  }, [logs, q]);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cari nama, aksi, atau detail..."
        className="w-full max-w-sm border border-neutral-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
      />

      <p className="text-xs text-gray-400">
        Menampilkan {filtered.length} dari {logs.length} log terbaru (maks. 500 baris).
      </p>

      <div className="overflow-x-auto rounded-xl border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3 text-left">Waktu</th>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Aksi</th>
              <th className="px-4 py-3 text-left">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  Belum ada log aktivitas.
                </td>
              </tr>
            ) : (
              filtered.map((l) => (
                <tr key={l.id} className="bg-white">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatWaktu(l.createdAt)}</td>
                  <td className="px-4 py-3 font-medium">{l.userNama}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                      {l.userRole}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${aksiBadge[l.aksi] ?? "bg-neutral-100 text-neutral-600"}`}
                    >
                      {aksiLabel(l.aksi)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{l.detail ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
