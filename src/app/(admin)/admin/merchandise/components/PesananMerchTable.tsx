"use client";

import {
  batalPesananMerchReady,
  konfirmasiOngkirMerch,
  tandaiDiambilMerch,
  tandaiDikirimMerch,
  tolakPesananMerch,
  verifikasiPesananMerch,
} from "@/actions/Merchandise";
import type { ItemPesanan } from "@/lib/merchandise";
import { useState } from "react";
import { toast } from "sonner";

type Pesanan = {
  id: string;
  nama: string;
  email: string;
  noHp: string;
  items: ItemPesanan[];
  totalBayar: number;
  kodeUnik: string;
  metodePembayaran: string;
  bukti: string | null;
  status: string;
  diambilAt: Date | null;
  createdAt: Date;
  jenis: string;
  pengiriman: string | null;
  alamat: string | null;
  ongkir: number | null;
  batasBayar: Date | null;
  kurir: string | null;
  resi: string | null;
  catatanAdmin: string | null;
};

const statusBadge: Record<string, string> = {
  MENUNGGU_ONGKIR: "bg-orange-100 text-orange-700",
  MENUNGGU_BAYAR: "bg-amber-100 text-amber-700",
  DIKIRIM: "bg-indigo-100 text-indigo-700",
  BATAL: "bg-neutral-200 text-neutral-600",
  PENDING: "bg-yellow-100 text-yellow-700",
  VERIFIED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  DIAMBIL: "bg-blue-100 text-blue-700",
};

const statusLabel: Record<string, string> = {
  MENUNGGU_ONGKIR: "Perlu Ongkir",
  MENUNGGU_BAYAR: "Menunggu Bayar",
  DIKIRIM: "Dikirim",
  BATAL: "Batal",
  PENDING: "Cek Bukti",
  VERIFIED: "Lunas",
  REJECTED: "Ditolak",
  DIAMBIL: "Sudah Diambil",
};

function linkWA(p: Pesanan) {
  const msg = [
    `Halo *${p.nama}*,`,
    `${p.jenis === "READY" ? "Pesanan" : "Pre-order"} merchandise LPKBB Antareja 2026 (kode *#${p.kodeUnik}*) sudah kami terima:`,
    ...(p.resi ? [`Dikirim via ${p.kurir}, resi *${p.resi}*`] : []),
    ...p.items.map((i) => `• ${i.nama}${i.ukuran ? ` (${i.ukuran})` : ""} × ${i.jumlah}`),
    ``,
    `Terima kasih! — Panitia LPKBB Antareja 2026`,
  ].join("\n");
  const no = p.noHp.replace(/^0/, "62").replace(/\D/g, "");
  return `https://wa.me/${no}?text=${encodeURIComponent(msg)}`;
}

async function jalankan(p: Promise<{ success: boolean; message?: string }>, ok: string) {
  const toastId = toast.loading("Memproses...");
  const r = await p;
  if (r.success) toast.success(ok, { id: toastId });
  else toast.error(r.message ?? "Gagal", { id: toastId });
  return r.success;
}

// Ongkir dikonfirmasi → kode unik terbit, pembeli dapat email total & batas bayar.
function FormOngkir({ id }: { id: string }) {
  const [ongkir, setOngkir] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex gap-1.5">
      <input
        type="number"
        min={0}
        value={ongkir}
        onChange={(e) => setOngkir(e.target.value)}
        placeholder="Ongkir Rp"
        className="border border-neutral-300 rounded-lg px-2 py-1 text-xs w-24"
      />
      <button
        disabled={busy || ongkir === ""}
        onClick={async () => {
          setBusy(true);
          await jalankan(konfirmasiOngkirMerch(id, parseInt(ongkir)), "Ongkir dikirim ke pembeli");
          setBusy(false);
        }}
        className="bg-orange-500 text-white px-3 py-1 rounded-lg hover:bg-orange-600 disabled:opacity-50"
      >
        Konfirmasi
      </button>
    </div>
  );
}

function FormResi({ id }: { id: string }) {
  const [kurir, setKurir] = useState("");
  const [resi, setResi] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <input value={kurir} onChange={(e) => setKurir(e.target.value)} placeholder="Kurir (JNE, J&T, ...)" className="border border-neutral-300 rounded-lg px-2 py-1 text-xs" />
      <input value={resi} onChange={(e) => setResi(e.target.value)} placeholder="Nomor resi" className="border border-neutral-300 rounded-lg px-2 py-1 text-xs" />
      <button
        disabled={busy || !kurir.trim() || !resi.trim()}
        onClick={async () => {
          setBusy(true);
          await jalankan(tandaiDikirimMerch(id, kurir, resi), "Ditandai dikirim, resi dikirim ke pembeli");
          setBusy(false);
        }}
        className="bg-indigo-500 text-white px-3 py-1 rounded-lg hover:bg-indigo-600 disabled:opacity-50"
      >
        Tandai Dikirim
      </button>
    </div>
  );
}

export default function PesananMerchTable({ pesanan }: { pesanan: Pesanan[] }) {
  const [filter, setFilter] = useState<string>("SEMUA");
  const [cari, setCari] = useState("");

  const tampil = pesanan.filter(
    (p) =>
      (filter === "SEMUA" || p.status === filter) &&
      (!cari ||
        p.nama.toLowerCase().includes(cari.toLowerCase()) ||
        p.kodeUnik.includes(cari) ||
        p.noHp.includes(cari))
  );

  async function aksi(fn: (id: string) => Promise<{ success: boolean; message?: string }>, id: string, ok: string) {
    const toastId = toast.loading("Memproses...");
    const r = await fn(id);
    if (r.success) toast.success(ok, { id: toastId });
    else toast.error(r.message ?? "Gagal", { id: toastId });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 items-center">
        {["SEMUA", "MENUNGGU_ONGKIR", "MENUNGGU_BAYAR", "PENDING", "VERIFIED", "DIKIRIM", "DIAMBIL", "REJECTED", "BATAL"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              filter === s ? "bg-primary-500 text-white border-primary-500" : "bg-white border-neutral-200 text-neutral-600"
            }`}
          >
            {s === "SEMUA" ? "Semua" : statusLabel[s]} (
            {s === "SEMUA" ? pesanan.length : pesanan.filter((p) => p.status === s).length})
          </button>
        ))}
        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari nama / kode / no. HP"
          className="border border-neutral-300 rounded-lg px-3 py-1.5 text-sm ml-auto w-full sm:w-64"
        />
      </div>

      {tampil.length === 0 ? (
        <p className="text-gray-400 text-sm">Tidak ada pesanan.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-3 text-left">Pemesan</th>
                <th className="px-4 py-3 text-left">Item</th>
                <th className="px-4 py-3 text-left">Total</th>
                <th className="px-4 py-3 text-left">Kode</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Bukti</th>
                <th className="px-4 py-3 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {tampil.map((p) => (
                <tr key={p.id} className="bg-white align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.nama}</div>
                    <div className="text-gray-400 text-xs">{p.email}</div>
                    <div className="text-gray-400 text-xs">{p.noHp}</div>
                    {p.alamat && <div className="text-xs text-gray-600 mt-1 whitespace-pre-line max-w-[220px]">Alamat: {p.alamat}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs max-w-[260px]">
                    <span
                      className={`inline-block mb-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        p.jenis === "READY" ? "bg-teal-100 text-teal-700" : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {p.jenis === "READY" ? `READY · ${p.pengiriman === "KIRIM" ? "KIRIM" : "AMBIL"}` : "PO"}
                    </span>
                    {p.items.map((i, idx) => (
                      <div key={idx}>
                        {i.nama}
                        {i.ukuran && <b> ({i.ukuran})</b>} × {i.jumlah}
                      </div>
                    ))}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    Rp{p.totalBayar.toLocaleString("id-ID")}
                    {p.ongkir != null && <div className="text-xs text-gray-500">ongkir Rp{p.ongkir.toLocaleString("id-ID")}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-primary-600 tracking-widest">{p.kodeUnik || "-"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusBadge[p.status] ?? ""}`}>
                      {statusLabel[p.status] ?? p.status}
                    </span>
                    {p.status === "MENUNGGU_BAYAR" && p.batasBayar && (
                      <div className="text-xs text-gray-500 mt-1">
                        s/d{" "}
                        {new Date(p.batasBayar).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Jakarta",
                        })}
                      </div>
                    )}
                    {p.resi && (
                      <div className="text-xs text-gray-500 mt-1">
                        {p.kurir} · <span className="font-mono">{p.resi}</span>
                      </div>
                    )}
                    {p.catatanAdmin && (p.status === "BATAL" || p.status === "REJECTED") && (
                      <div className="text-xs text-gray-500 mt-1">{p.catatanAdmin}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {p.bukti ? (
                      <a href={p.bukti} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        Lihat
                      </a>
                    ) : p.metodePembayaran === "QRIS" ? (
                      <span className="text-gray-400">QRIS (tanpa bukti)</span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5 text-xs">
                      {p.status === "PENDING" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => aksi(verifikasiPesananMerch, p.id, "Pesanan diverifikasi")}
                            className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600"
                          >
                            Verifikasi
                          </button>
                          <button
                            onClick={() => aksi(tolakPesananMerch, p.id, "Pesanan ditolak")}
                            className="bg-red-100 text-red-600 px-3 py-1 rounded-lg hover:bg-red-200"
                          >
                            Tolak
                          </button>
                        </div>
                      )}
                      {p.status === "MENUNGGU_ONGKIR" && <FormOngkir id={p.id} />}
                      {(p.status === "MENUNGGU_ONGKIR" || p.status === "MENUNGGU_BAYAR") && (
                        <button
                          onClick={() => {
                            const alasan = prompt("Alasan pembatalan (stok dikembalikan, pembeli diberi tahu lewat email):");
                            if (alasan === null) return;
                            aksi((id) => batalPesananMerchReady(id, alasan), p.id, "Pesanan dibatalkan");
                          }}
                          className="bg-neutral-100 text-neutral-700 px-3 py-1 rounded-lg hover:bg-neutral-200"
                        >
                          Batalkan
                        </button>
                      )}
                      {p.status === "VERIFIED" && p.pengiriman === "KIRIM" && <FormResi id={p.id} />}
                      {p.status === "VERIFIED" && p.pengiriman !== "KIRIM" && (
                        <button
                          onClick={() => aksi(tandaiDiambilMerch, p.id, "Ditandai sudah diambil")}
                          className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600"
                        >
                          Tandai Diambil
                        </button>
                      )}
                      {(p.status === "VERIFIED" || p.status === "DIAMBIL" || p.status === "DIKIRIM") && p.noHp && (
                        <a
                          href={linkWA(p)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-green-100 text-green-700 px-3 py-1 rounded-lg hover:bg-green-200 text-center"
                        >
                          Kirim WA
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
