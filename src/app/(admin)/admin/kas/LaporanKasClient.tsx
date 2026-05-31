"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { addKasTransaksi, deleteKasTransaksi } from "@/actions/Kas";
import { useRouter } from "next-nprogress-bar";
import * as XLSX from "xlsx";

type KasTransaksi = {
  id: string;
  tipe: string;
  keterangan: string;
  vendor: string | null;
  jumlah: number;
  kategori: string;
  nota: string | null;
  sumber: string;
  referensiId: string | null;
  createdAt: Date;
};
type PerJenis = { jenis: string; harga: number; terjual: number; pendapatan: number };
type TransaksiTiket = {
  id: string; nama: string; email: string; jumlah: number; status: string;
  jenisJual: string; metodePembayaran: string; createdAt: Date;
  tiket: { jenis: string; harga: number };
};
type TransaksiFoto = {
  id: string; paket: string; harga: number; status: string; createdAt: Date;
  bukti: string; kodeUnik: string | null; email: string | null;
  user: { nama: string; email: string } | null;
};
type KasData = {
  totalPendapatan: number; totalTiketVerified: number; totalFotoVerified: number;
  totalOffline: number; totalOnline: number; totalPengeluaran: number;
  totalPemasukanManual: number; saldo: number; timsConfirmed: number;
  perJenisTiket: PerJenis[];
  transaksiTikets: TransaksiTiket[];
  transaksiFotos: TransaksiFoto[];
  kasTransaksis: KasTransaksi[];
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  VERIFIED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}
function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

type Tab = "ringkasan" | "kas" | "tiket" | "foto";

export default function LaporanKasClient({ data }: { data: KasData }) {
  const [tab, setTab] = useState<Tab>("ringkasan");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [tipeInput, setTipeInput] = useState<"PEMASUKAN" | "PENGELUARAN">("PENGELUARAN");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const pemasukan = data.kasTransaksis.filter((k) => k.tipe === "PEMASUKAN");
  const pengeluaran = data.kasTransaksis.filter((k) => k.tipe === "PENGELUARAN");
  const manualPemasukan = pemasukan.filter((k) => k.sumber === "MANUAL");

  const filteredTikets = filterStatus === "ALL"
    ? data.transaksiTikets : data.transaksiTikets.filter((t) => t.status === filterStatus);
  const filteredFotos = filterStatus === "ALL"
    ? data.transaksiFotos : data.transaksiFotos.filter((f) => f.status === filterStatus);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    fd.set("tipe", tipeInput);
    const toastId = toast.loading("Menyimpan...");
    const result = await addKasTransaksi(fd);
    setSubmitting(false);
    if (result.success) {
      toast.success("Transaksi disimpan", { id: toastId });
      formRef.current?.reset();
      router.refresh();
    } else toast.error((result as any).message ?? "Gagal", { id: toastId });
  }

  async function handleDelete(id: string, label: string) {
    if (!confirm(`Hapus ${label}?`)) return;
    const toastId = toast.loading("Menghapus...");
    const result = await deleteKasTransaksi(id);
    if (result.success) { toast.success("Dihapus", { id: toastId }); router.refresh(); }
    else toast.error("Gagal hapus", { id: toastId });
  }

  function exportExcel() {
    const rows = data.kasTransaksis.map((k) => ({
      Tanggal: formatDate(k.createdAt),
      Tipe: k.tipe,
      Keterangan: k.keterangan,
      Vendor: k.vendor ?? "-",
      Kategori: k.kategori,
      Jumlah: k.jumlah,
      Sumber: k.sumber,
    }));
    const tiketRows = data.transaksiTikets.filter((t) => t.status === "VERIFIED").map((t) => ({
      Tanggal: formatDate(t.createdAt),
      Nama: t.nama,
      Email: t.email,
      Jenis: t.tiket.jenis,
      Jumlah: t.jumlah,
      Total: t.tiket.harga * t.jumlah,
      JenisJual: t.jenisJual,
      Metode: t.metodePembayaran,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Kas Manual");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tiketRows), "Transaksi Tiket");
    XLSX.writeFile(wb, `laporan-kas-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "ringkasan", label: "Ringkasan" },
    { key: "kas", label: `Input Kas (${data.kasTransaksis.length})` },
    { key: "tiket", label: `Transaksi Tiket (${data.transaksiTikets.length})` },
    { key: "foto", label: `Transaksi Foto (${data.transaksiFotos.length})` },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Total Pemasukan" value={formatRupiah(data.totalPendapatan)} color="green" />
        <SummaryCard label="Total Pengeluaran" value={formatRupiah(data.totalPengeluaran)} color="red" />
        <SummaryCard label="Saldo Bersih" value={formatRupiah(data.saldo)} color={data.saldo >= 0 ? "primary" : "orange"} />
        <SummaryCard label="Tim Terdaftar" value={`${data.timsConfirmed} Tim`} color="blue" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Tiket (Verified)" value={formatRupiah(data.totalTiketVerified)} color="green" />
        <SummaryCard label="Foto (Verified)" value={formatRupiah(data.totalFotoVerified)} color="blue" />
        <SummaryCard label="Online" value={formatRupiah(data.totalOnline)} color="primary" />
        <SummaryCard label="Offline/Tunai" value={formatRupiah(data.totalOffline)} color="orange" />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-3 bg-neutral-50 border-b border-neutral-100 flex gap-2 flex-wrap items-center">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === t.key ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>
              {t.label}
            </button>
          ))}
          <button onClick={exportExcel}
            className="ml-auto px-4 py-1.5 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">
            Export Excel
          </button>
          {(tab === "tiket" || tab === "foto") && (
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-neutral-200 rounded-lg px-3 py-1.5 text-sm">
              <option value="ALL">Semua Status</option>
              <option value="PENDING">Pending</option>
              <option value="VERIFIED">Verified</option>
              <option value="REJECTED">Rejected</option>
            </select>
          )}
        </div>

        {/* Ringkasan — Buku Kas */}
        {tab === "ringkasan" && (() => {
          const rows = [...data.kasTransaksis].reverse(); // ascending (oldest first)
          let saldoBerjalan = 0;
          return (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 bg-neutral-50 border-b border-neutral-100">
                  <tr>
                    <th className="px-4 py-2.5 text-center w-10">No</th>
                    <th className="px-4 py-2.5 text-left">Tanggal</th>
                    <th className="px-4 py-2.5 text-left">Keterangan</th>
                    <th className="px-4 py-2.5 text-right text-green-700">Pemasukan</th>
                    <th className="px-4 py-2.5 text-right text-red-700">Pengeluaran</th>
                    <th className="px-4 py-2.5 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Belum ada transaksi</td>
                    </tr>
                  )}
                  {rows.map((k, i) => {
                    const isPemasukan = k.tipe === "PEMASUKAN";
                    if (isPemasukan) saldoBerjalan += k.jumlah;
                    else saldoBerjalan -= k.jumlah;
                    const saldoSnap = saldoBerjalan;
                    return (
                      <tr key={k.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-2.5 text-center text-gray-400">{i + 1}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{formatDate(k.createdAt)}</td>
                        <td className="px-4 py-2.5">
                          <div className="font-medium">{k.keterangan}</div>
                          <div className="text-xs text-gray-400">{(k.kategori ?? "").replace(/_/g, " ")}{k.vendor ? ` · ${k.vendor}` : ""}</div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-green-600">
                          {isPemasukan ? formatRupiah(k.jumlah) : ""}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-red-500">
                          {!isPemasukan ? formatRupiah(k.jumlah) : ""}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-bold ${saldoSnap >= 0 ? "text-neutral-800" : "text-red-600"}`}>
                          {formatRupiah(saldoSnap)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {rows.length > 0 && (
                  <tfoot className="border-t-2 border-neutral-200 bg-neutral-50 text-sm font-bold">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-neutral-600">Total</td>
                      <td className="px-4 py-3 text-right text-green-700">{formatRupiah(data.totalPendapatan)}</td>
                      <td className="px-4 py-3 text-right text-red-600">{formatRupiah(data.totalPengeluaran)}</td>
                      <td className={`px-4 py-3 text-right text-lg ${data.saldo >= 0 ? "text-primary-600" : "text-red-600"}`}>
                        {formatRupiah(data.saldo)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          );
        })()}

        {/* Kas Manual */}
        {tab === "kas" && (
          <div className="p-5 flex flex-col gap-6">
            {/* Single input form with tipe toggle */}
            <form ref={formRef} onSubmit={handleSubmit} className="bg-neutral-50 rounded-lg p-4 flex flex-col gap-3" encType="multipart/form-data">
              <div className="flex gap-1 p-1 bg-neutral-200 rounded-lg w-fit">
                {(["PENGELUARAN", "PEMASUKAN"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setTipeInput(t)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tipeInput === t
                      ? t === "PEMASUKAN" ? "bg-green-600 text-white" : "bg-red-600 text-white"
                      : "text-neutral-600 hover:bg-neutral-300"}`}>
                    {t === "PEMASUKAN" ? "Pemasukan" : "Pengeluaran"}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Keterangan</label>
                  <input name="keterangan" required placeholder="Keterangan" className="border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Jumlah (Rp)</label>
                  <input name="jumlah" type="number" min="0" required placeholder="0" className="border rounded-lg px-3 py-2 text-sm" />
                </div>
                {tipeInput === "PENGELUARAN" && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Vendor / Toko</label>
                    <input name="vendor" placeholder="Nama vendor" className="border rounded-lg px-3 py-2 text-sm" />
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Kategori</label>
                  <select name="kategori" className="border rounded-lg px-3 py-2 text-sm">
                    {tipeInput === "PEMASUKAN" ? (
                      <>
                        <option value="SPONSOR">Sponsor</option>
                        <option value="PENDAFTARAN_TIM">Pendaftaran Tim</option>
                        <option value="LAINNYA">Lainnya</option>
                      </>
                    ) : (
                      <>
                        <option value="OPERASIONAL">Operasional</option>
                        <option value="KONSUMSI">Konsumsi</option>
                        <option value="PERLENGKAPAN">Perlengkapan</option>
                        <option value="TRANSPORTASI">Transportasi</option>
                        <option value="LAINNYA">Lainnya</option>
                      </>
                    )}
                  </select>
                </div>
                {tipeInput === "PENGELUARAN" && (
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-xs text-gray-500">Upload Nota (opsional)</label>
                    <input name="nota" type="file" accept="image/*,.pdf" className="border rounded-lg px-3 py-2 text-sm" />
                  </div>
                )}
              </div>
              <button type="submit" disabled={submitting}
                className={`self-end px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors ${tipeInput === "PEMASUKAN" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>
                Simpan {tipeInput === "PEMASUKAN" ? "Pemasukan" : "Pengeluaran"}
              </button>
            </form>

            {/* Grouped table: Pemasukan first, then Pengeluaran */}
            {[
              { label: "Pemasukan Manual", rows: manualPemasukan, color: "green" },
              { label: "Pengeluaran", rows: pengeluaran, color: "red" },
            ].map(({ label, rows, color }) => (
              <div key={label}>
                <h3 className={`font-semibold text-sm mb-2 ${color === "green" ? "text-green-700" : "text-red-700"}`}>{label}</h3>
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-400 bg-neutral-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Keterangan</th>
                      <th className="px-4 py-2 text-left">Vendor</th>
                      <th className="px-4 py-2 text-left">Kategori</th>
                      <th className="px-4 py-2 text-right">Jumlah</th>
                      <th className="px-4 py-2 text-left">Nota</th>
                      <th className="px-4 py-2 text-left">Tanggal</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400 text-xs">Belum ada data</td></tr>}
                    {rows.map((k) => (
                      <tr key={k.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-2.5 font-medium">{k.keterangan}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{k.vendor ?? "-"}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${color === "green" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {(k.kategori ?? "").replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className={`px-4 py-2.5 text-right font-semibold ${color === "green" ? "text-green-600" : "text-red-600"}`}>{formatRupiah(k.jumlah)}</td>
                        <td className="px-4 py-2.5">{k.nota ? <a href={k.nota} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">Lihat</a> : <span className="text-xs text-gray-400">-</span>}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-400">{formatDate(k.createdAt)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button onClick={() => handleDelete(k.id, k.keterangan)} className="text-xs text-red-500 hover:text-red-700">Hapus</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* Transaksi Tiket */}
        {tab === "tiket" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400 bg-neutral-50 border-b border-neutral-100">
                <tr>
                  <th className="px-4 py-2 text-left">Nama</th>
                  <th className="px-4 py-2 text-left">Jenis</th>
                  <th className="px-4 py-2 text-right">Jml</th>
                  <th className="px-4 py-2 text-right">Total</th>
                  <th className="px-4 py-2 text-left">Jenis Jual</th>
                  <th className="px-4 py-2 text-left">Metode</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {filteredTikets.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Tidak ada transaksi</td></tr>}
                {filteredTikets.map((tr) => (
                  <tr key={tr.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-2.5"><div className="font-medium">{tr.nama}</div><div className="text-xs text-gray-400">{tr.email}</div></td>
                    <td className="px-4 py-2.5">{tr.tiket.jenis}</td>
                    <td className="px-4 py-2.5 text-right">{tr.jumlah}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{formatRupiah(tr.tiket.harga * tr.jumlah)}</td>
                    <td className="px-4 py-2.5"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tr.jenisJual === "OFFLINE" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>{tr.jenisJual === "OFFLINE" ? "Tunai" : "Online"}</span></td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{tr.metodePembayaran}</td>
                    <td className="px-4 py-2.5"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[tr.status] ?? ""}`}>{tr.status}</span></td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">{formatDate(tr.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Transaksi Foto */}
        {tab === "foto" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400 bg-neutral-50 border-b border-neutral-100">
                <tr>
                  <th className="px-4 py-2 text-left">Pembeli</th>
                  <th className="px-4 py-2 text-left">Paket</th>
                  <th className="px-4 py-2 text-right">Harga</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {filteredFotos.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Tidak ada transaksi</td></tr>}
                {filteredFotos.map((f) => (
                  <tr key={f.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-2.5">{f.user ? <><div className="font-medium">{f.user.nama}</div><div className="text-xs text-gray-400">{f.user.email}</div></> : <span className="text-gray-400 text-xs">Tamu</span>}</td>
                    <td className="px-4 py-2.5">{f.paket?.replace(/_/g, " ") ?? "-"}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{formatRupiah(f.harga)}</td>
                    <td className="px-4 py-2.5"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[f.status] ?? ""}`}>{f.status}</span></td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">{formatDate(f.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    primary: "bg-primary-50 border-primary-200 text-primary-700",
    green: "bg-green-50 border-green-200 text-green-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    red: "bg-red-50 border-red-200 text-red-700",
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color] ?? colorMap.primary}`}>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs mt-1 opacity-70">{label}</div>
    </div>
  );
}
