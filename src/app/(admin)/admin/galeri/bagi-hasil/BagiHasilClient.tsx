"use client";

import { setBiayaAdminPenarikan, setPersenFotografer } from "@/actions/Galeri";
import { prosesPenarikan } from "@/actions/PenarikanFotografer";
import cn from "@/lib/clsx";
import { STATUS_PENARIKAN } from "@/lib/penarikanFoto";
import { useRouter } from "next-nprogress-bar";
import { Fragment, useState } from "react";
import { toast } from "sonner";

type Album = { albumId: string; nama: string; transaksi: number; jumlahFoto: number; penjualan: number; bagianFotografer: number };
type Fotografer = {
  fotograferId: string | null;
  nama: string;
  penjualan: number;
  bagianFotografer: number;
  bagianPanitia: number;
  dibayar: number;
  diajukan: number;
  saldo: number;
  albums: Album[];
};
type Penarikan = {
  id: string;
  fotografer: string;
  jumlah: number;
  biayaAdmin: number;
  rekening: string;
  catatan: string | null;
  status: string;
  catatanAdmin: string | null;
  buktiTransfer: string | null;
  diprosesOleh: string | null;
  createdAt: string;
};
type Ringkas = {
  persenFotografer: number;
  biayaAdminPenarikan: number;
  jumlahTransaksi: number;
  totalKas: number;
  totalKodeUnik: number;
  totalPenjualan: number;
  totalFotografer: number;
};

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const tgl = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
const inputCls = "border border-neutral-300 rounded-lg px-3 py-2 text-sm";

function Kartu({ label, nilai, ket }: { label: string; nilai: string; ket?: string }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-bold mt-1">{nilai}</div>
      {ket && <div className="text-xs text-gray-400 mt-0.5">{ket}</div>}
    </div>
  );
}

function FormPersen({ awal, biayaAwal }: { awal: number; biayaAwal: number }) {
  const router = useRouter();
  const [persen, setPersen] = useState(awal);
  const [biaya, setBiaya] = useState(biayaAwal);
  const [loading, setLoading] = useState(false);

  async function simpan() {
    setLoading(true);
    const r: { success: boolean; message?: string } = persen !== awal ? await setPersenFotografer(persen) : { success: true };
    const b: { success: boolean; message?: string } =
      r.success && biaya !== biayaAwal ? await setBiayaAdminPenarikan(biaya) : r;
    setLoading(false);
    if (b.success) {
      toast.success("Pengaturan disimpan");
      router.refresh();
    } else toast.error(b.message ?? "Gagal");
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Bagian fotografer (%)</label>
        <input
          type="number"
          min={0}
          max={100}
          value={persen}
          onChange={(e) => setPersen(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
          className={cn(inputCls, "w-28")}
        />
      </div>
      <div className="text-sm pb-2">
        Fotografer <b>{persen}%</b> · Panitia <b>{100 - persen}%</b> <span className="text-gray-400">(dari harga jual tanpa kode unik)</span>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Biaya admin transfer (Rp)</label>
        <input
          type="number"
          min={0}
          value={biaya}
          onChange={(e) => setBiaya(Math.max(0, parseInt(e.target.value) || 0))}
          className={cn(inputCls, "w-32")}
        />
      </div>
      <button
        type="button"
        onClick={simpan}
        disabled={loading || (persen === awal && biaya === biayaAwal)}
        className="bg-primary-500 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {loading ? "Menyimpan..." : "Simpan"}
      </button>
      <p className="w-full text-xs text-gray-500">
        Berlaku untuk transaksi yang diverifikasi setelah disimpan. Transaksi yang sudah terverifikasi memakai persentase
        saat diverifikasi (transaksi lama sebelum fitur ini memakai persentase sekarang). Biaya admin transfer dipotong
        dari setiap penarikan: saldo fotografer berkurang sebesar jumlah yang ditarik, yang ditransfer jumlah − biaya.
      </p>
    </div>
  );
}

function ProsesPenarikan({ p }: { p: Penarikan }) {
  const router = useRouter();
  const [mode, setMode] = useState<"DIBAYAR" | "DITOLAK" | null>(null);
  const [loading, setLoading] = useState(false);

  async function kirim(data: FormData) {
    setLoading(true);
    const r = await prosesPenarikan(data);
    setLoading(false);
    if (r.success) {
      toast.success(mode === "DIBAYAR" ? "Penarikan ditandai dibayar & tercatat di Kas" : "Penarikan ditolak");
      setMode(null);
      router.refresh();
    } else toast.error(r.message ?? "Gagal");
  }

  if (!mode)
    return (
      <div className="flex gap-1.5 justify-end">
        <button type="button" onClick={() => setMode("DIBAYAR")} className="px-2.5 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700">
          Tandai Dibayar
        </button>
        <button type="button" onClick={() => setMode("DITOLAK")} className="px-2.5 py-1 rounded-md text-xs font-medium bg-red-100 text-red-700">
          Tolak
        </button>
      </div>
    );

  return (
    <form action={kirim} className="flex flex-col gap-2 min-w-[220px]">
      <input type="hidden" name="id" value={p.id} />
      <input type="hidden" name="aksi" value={mode} />
      {mode === "DIBAYAR" && (
        <label className="text-xs text-gray-500 flex flex-col gap-1">
          Bukti transfer (opsional)
          <input name="bukti" type="file" accept="image/*,application/pdf" className="text-xs" />
        </label>
      )}
      <input
        name="catatanAdmin"
        required={mode === "DITOLAK"}
        maxLength={300}
        placeholder={mode === "DITOLAK" ? "Alasan penolakan" : "Catatan (opsional)"}
        className={cn(inputCls, "text-xs py-1.5")}
      />
      <div className="flex gap-1.5 justify-end">
        <button
          type="submit"
          disabled={loading}
          className={cn(
            "px-2.5 py-1 rounded-md text-xs font-semibold text-white disabled:opacity-60",
            mode === "DIBAYAR" ? "bg-green-600" : "bg-red-600"
          )}
        >
          {loading ? "..." : mode === "DIBAYAR" ? "Konfirmasi Dibayar" : "Konfirmasi Tolak"}
        </button>
        <button type="button" onClick={() => setMode(null)} className="px-2.5 py-1 rounded-md text-xs bg-neutral-100">
          Batal
        </button>
      </div>
    </form>
  );
}

export default function BagiHasilClient({
  bisaAturPersen,
  ringkas,
  fotografer,
  penarikan,
}: {
  bisaAturPersen: boolean;
  ringkas: Ringkas;
  fotografer: Fotografer[];
  penarikan: Penarikan[];
}) {
  const [buka, setBuka] = useState<string | null>(null);
  const menunggu = penarikan.filter((p) => p.status === "PENDING");

  return (
    <div className="flex flex-col gap-8">
      {bisaAturPersen ? (
        <FormPersen awal={ringkas.persenFotografer} biayaAwal={ringkas.biayaAdminPenarikan} />
      ) : (
        <p className="text-sm">
          Pembagian saat ini: fotografer <b>{ringkas.persenFotografer}%</b> · panitia <b>{100 - ringkas.persenFotografer}%</b> ·
          biaya admin transfer <b>{rp(ringkas.biayaAdminPenarikan)}</b>{" "}
          <span className="text-gray-400">(diatur Admin)</span>
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kartu label="Masuk Kas (harga + kode unik)" nilai={rp(ringkas.totalKas)} ket={`${ringkas.jumlahTransaksi} transaksi terverifikasi`} />
        <Kartu label="Harga jual (tanpa kode unik)" nilai={rp(ringkas.totalPenjualan)} ket={`kode unik ${rp(ringkas.totalKodeUnik)}`} />
        <Kartu label="Bagian fotografer" nilai={rp(ringkas.totalFotografer)} />
        <Kartu
          label="Bagian panitia"
          nilai={rp(ringkas.totalKas - ringkas.totalFotografer)}
          ket="termasuk seluruh kode unik"
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Per Fotografer</h2>
        <div className="overflow-x-auto bg-white rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-xs text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Fotografer</th>
                <th className="px-3 py-2 font-medium text-right">Harga jual</th>
                <th className="px-3 py-2 font-medium text-right">Pendapatan</th>
                <th className="px-3 py-2 font-medium text-right">Dibayar</th>
                <th className="px-3 py-2 font-medium text-right">Diajukan</th>
                <th className="px-4 py-2 font-medium text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {fotografer.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-400">
                    Belum ada penjualan foto terverifikasi.
                  </td>
                </tr>
              )}
              {fotografer.map((f) => {
                const key = f.fotograferId ?? "-";
                return (
                  <Fragment key={key}>
                    <tr className="cursor-pointer hover:bg-neutral-50" onClick={() => setBuka(buka === key ? null : key)}>
                      <td className="px-4 py-2 font-medium">
                        {buka === key ? "▾" : "▸"} {f.nama}
                        {!f.fotograferId && (
                          <span className="ml-2 text-xs text-amber-600 font-normal">
                            tetapkan fotografer albumnya di Galeri
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">{rp(f.penjualan)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{rp(f.bagianFotografer)}</td>
                      <td className="px-3 py-2 text-right">{rp(f.dibayar)}</td>
                      <td className="px-3 py-2 text-right">{rp(f.diajukan)}</td>
                      <td className="px-4 py-2 text-right font-bold text-primary-600">{f.fotograferId ? rp(f.saldo) : "—"}</td>
                    </tr>
                    {buka === key &&
                      f.albums.map((a) => (
                        <tr key={a.albumId} className="bg-neutral-50 text-xs text-gray-600">
                          <td className="pl-10 pr-4 py-1.5">
                            {a.nama} · {a.jumlahFoto} foto terjual · {a.transaksi} transaksi
                          </td>
                          <td className="px-3 py-1.5 text-right">{rp(a.penjualan)}</td>
                          <td className="px-3 py-1.5 text-right">{rp(a.bagianFotografer)}</td>
                          <td colSpan={3} />
                        </tr>
                      ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          Penarikan Fotografer {menunggu.length > 0 && <span className="text-sm text-amber-600">· {menunggu.length} menunggu</span>}
        </h2>
        <div className="overflow-x-auto bg-white rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-xs text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Tanggal / Fotografer</th>
                <th className="px-3 py-2 font-medium">Rekening</th>
                <th className="px-3 py-2 font-medium text-right">Jumlah / Transfer</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {penarikan.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-400">
                    Belum ada pengajuan penarikan.
                  </td>
                </tr>
              )}
              {penarikan.map((p) => (
                <tr key={p.id} className="align-top">
                  <td className="px-4 py-2">
                    <div className="font-medium">{p.fotografer}</div>
                    <div className="text-xs text-gray-500">{tgl(p.createdAt)}</div>
                    {p.catatan && <div className="text-xs text-gray-500 mt-1">“{p.catatan}”</div>}
                  </td>
                  <td className="px-3 py-2 text-xs">{p.rekening}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <div className="font-semibold">{rp(p.jumlah)}</div>
                    {p.biayaAdmin > 0 && (
                      <div className="text-xs text-gray-500">
                        transfer <b>{rp(p.jumlah - p.biayaAdmin)}</b>
                        <br />
                        biaya admin {rp(p.biayaAdmin)}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", STATUS_PENARIKAN[p.status]?.cls)}>
                      {STATUS_PENARIKAN[p.status]?.label ?? p.status}
                    </span>
                    {p.diprosesOleh && p.status !== "PENDING" && (
                      <div className="text-xs text-gray-400 mt-1">oleh {p.diprosesOleh}</div>
                    )}
                    {p.catatanAdmin && <div className="text-xs text-gray-500 mt-1">{p.catatanAdmin}</div>}
                    {p.buktiTransfer && (
                      <a href={p.buktiTransfer} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                        Bukti transfer
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-2">{p.status === "PENDING" && <ProsesPenarikan p={p} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
