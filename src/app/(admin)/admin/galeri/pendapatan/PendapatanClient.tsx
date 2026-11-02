"use client";

import { ajukanPenarikan, batalkanPenarikan } from "@/actions/PenarikanFotografer";
import cn from "@/lib/clsx";
import { useRouter } from "next-nprogress-bar";
import { useState } from "react";
import { toast } from "sonner";
import { STATUS_PENARIKAN } from "@/lib/penarikanFoto";

type Saldo = {
  persenFotografer: number;
  biayaAdminPenarikan: number;
  penjualan: number;
  pendapatan: number;
  dibayar: number;
  diajukan: number;
  saldo: number;
  albums: { albumId: string; nama: string; transaksi: number; penjualan: number; bagianFotografer: number }[];
};
type Riwayat = {
  id: string;
  jumlah: number;
  biayaAdmin: number;
  rekening: string;
  status: string;
  catatanAdmin: string | null;
  buktiTransfer: string | null;
  createdAt: string;
};
type Rekening = { bankNama: string; bankNoRek: string; bankAtasNama: string } | null;

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const tgl = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
const inputCls = "border border-neutral-300 rounded-lg px-3 py-2 text-sm";

export default function PendapatanClient({
  saldo,
  rekeningTerakhir,
  riwayat,
}: {
  saldo: Saldo;
  rekeningTerakhir: Rekening;
  riwayat: Riwayat[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [jumlah, setJumlah] = useState(saldo.saldo > 0 ? saldo.saldo : 0);
  const biaya = saldo.biayaAdminPenarikan;
  // Penarikan tidak boleh melebihi saldo (server juga menolak) dan harus lebih dari biaya admin.
  const lebihSaldo = jumlah > saldo.saldo;
  const kurangDariBiaya = jumlah > 0 && jumlah <= biaya;
  const saldoKurang = saldo.saldo <= biaya;

  async function ajukan(data: FormData) {
    setLoading(true);
    const r = await ajukanPenarikan(data);
    setLoading(false);
    if (r.success) {
      toast.success("Penarikan diajukan, menunggu diproses bendahara");
      router.refresh();
    } else toast.error(r.message ?? "Gagal");
  }

  async function batal(id: string) {
    if (!confirm("Batalkan pengajuan penarikan ini?")) return;
    const r = await batalkanPenarikan(id);
    if (r.success) {
      toast.success("Pengajuan dibatalkan");
      router.refresh();
    } else toast.error(r.message ?? "Gagal");
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["Total pendapatan", rp(saldo.pendapatan), `${saldo.persenFotografer}% dari harga jual ${rp(saldo.penjualan)}`],
          ["Sudah dibayar", rp(saldo.dibayar), ""],
          ["Sedang diajukan", rp(saldo.diajukan), ""],
          ["Saldo bisa ditarik", rp(saldo.saldo), ""],
        ].map(([label, nilai, ket], i) => (
          <div key={label} className={cn("rounded-xl border p-4", i === 3 ? "bg-primary-50 border-primary-200" : "bg-white border-neutral-200")}>
            <div className="text-xs text-gray-500">{label}</div>
            <div className={cn("text-xl font-bold mt-1", i === 3 && "text-primary-600")}>{nilai}</div>
            {ket && <div className="text-xs text-gray-400 mt-0.5">{ket}</div>}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <form action={ajukan} className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col gap-3">
          <h2 className="font-semibold text-lg">Ajukan Penarikan</h2>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Jumlah (maks. {rp(Math.max(0, saldo.saldo))})</label>
            <input
              name="jumlah"
              type="number"
              min={biaya + 1}
              max={Math.max(1, saldo.saldo)}
              value={jumlah || ""}
              onChange={(e) => setJumlah(parseInt(e.target.value) || 0)}
              required
              className={cn(inputCls, (lebihSaldo || kurangDariBiaya) && "border-red-400 ring-1 ring-red-300")}
            />
            {lebihSaldo && (
              <p className="text-xs font-semibold text-red-600">
                Melebihi saldo — maksimal {rp(Math.max(0, saldo.saldo))}.{" "}
                <button type="button" onClick={() => setJumlah(saldo.saldo)} className="underline">
                  Tarik semua saldo
                </button>
              </p>
            )}
            {kurangDariBiaya && (
              <p className="text-xs font-semibold text-red-600">Jumlah harus lebih dari biaya admin transfer {rp(biaya)}.</p>
            )}
            {biaya > 0 && !lebihSaldo && !kurangDariBiaya && (
              <p className="text-xs text-gray-600">
                Biaya admin transfer {rp(biaya)} — yang Anda terima <b>{rp(Math.max(0, jumlah - biaya))}</b>, saldo
                berkurang {rp(jumlah)}.
              </p>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Bank / e-wallet</label>
              <input name="bankNama" required maxLength={60} defaultValue={rekeningTerakhir?.bankNama} placeholder="BCA / DANA" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">No. rekening / HP</label>
              <input name="bankNoRek" required maxLength={40} defaultValue={rekeningTerakhir?.bankNoRek} className={inputCls} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Atas nama</label>
            <input name="bankAtasNama" required maxLength={100} defaultValue={rekeningTerakhir?.bankAtasNama} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Catatan (opsional)</label>
            <input name="catatan" maxLength={300} className={inputCls} />
          </div>
          <button
            type="submit"
            disabled={loading || saldoKurang || lebihSaldo || kurangDariBiaya || jumlah <= 0}
            className="bg-primary-500 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50"
          >
            {saldoKurang
              ? saldo.saldo <= 0
                ? "Belum ada saldo"
                : `Saldo belum cukup (min. ${rp(biaya + 1)})`
              : loading
                ? "Mengajukan..."
                : "Ajukan Penarikan"}
          </button>
        </form>

        <div className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col gap-2">
          <h2 className="font-semibold text-lg">Penjualan per Album</h2>
          {saldo.albums.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada penjualan foto terverifikasi dari album Anda.</p>
          ) : (
            saldo.albums.map((a) => (
              <div key={a.albumId} className="flex justify-between gap-3 text-sm border-b border-neutral-100 pb-2">
                <div>
                  <div className="font-medium">{a.nama}</div>
                  <div className="text-xs text-gray-500">
                    {a.transaksi} transaksi · harga jual {rp(a.penjualan)}
                  </div>
                </div>
                <div className="font-semibold whitespace-nowrap">{rp(a.bagianFotografer)}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-lg">Riwayat Penarikan</h2>
        <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-100">
          {riwayat.length === 0 && <p className="p-6 text-center text-sm text-gray-400">Belum ada penarikan.</p>}
          {riwayat.map((p) => (
            <div key={p.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
              <div>
                <div className="font-semibold">
                  {rp(p.jumlah)}
                  {p.biayaAdmin > 0 && (
                    <span className="text-xs font-normal text-gray-500">
                      {" "}
                      · diterima {rp(p.jumlah - p.biayaAdmin)} (biaya admin {rp(p.biayaAdmin)})
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {tgl(p.createdAt)} · {p.rekening}
                </div>
                {p.catatanAdmin && <div className="text-xs text-gray-600 mt-1">Panitia: {p.catatanAdmin}</div>}
              </div>
              <div className="flex items-center gap-2">
                {p.buktiTransfer && (
                  <a href={p.buktiTransfer} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                    Bukti transfer
                  </a>
                )}
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", STATUS_PENARIKAN[p.status]?.cls)}>
                  {STATUS_PENARIKAN[p.status]?.label ?? p.status}
                </span>
                {p.status === "PENDING" && (
                  <button type="button" onClick={() => batal(p.id)} className="text-xs text-red-600 hover:underline">
                    Batalkan
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
