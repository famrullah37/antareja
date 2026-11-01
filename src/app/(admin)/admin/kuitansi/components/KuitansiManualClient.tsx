"use client";

import { batalkanKuitansiManual, terbitkanKuitansiManual, unduhKuitansiManual } from "@/actions/KuitansiManual";
import { KATEGORI_KAS_PEMASUKAN, METODE_KUITANSI_MANUAL } from "@/lib/kuitansiManual";
import { saveBase64File } from "@/lib/saveFile";
import cn from "@/lib/clsx";
import UnduhKuitansiButton from "../../components/UnduhKuitansiButton";
import { useRouter } from "next-nprogress-bar";
import { useRef, useState } from "react";
import { toast } from "sonner";

type Kuitansi = {
  id: string;
  nomor: string;
  tanggal: string;
  diterimaDari: string;
  untukPembayaran: string;
  jumlah: number;
  metode: string;
  dicatatKas: boolean;
  olehNama: string;
  batal: { alasan: string | null; oleh: string | null } | null;
};

const inputCls =
  "border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400";
const labelCls = "text-xs text-gray-500";

const hariIniWIB = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
const formatTanggal = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

function FormKuitansi() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [catatKas, setCatatKas] = useState(false);

  async function kirim(data: FormData) {
    setLoading(true);
    const toastId = toast.loading("Menerbitkan kuitansi...");
    try {
      const r = await terbitkanKuitansiManual(data);
      if (!r.success || !r.base64) {
        toast.error(r.message ?? "Gagal menerbitkan kuitansi", { id: toastId });
        return;
      }
      saveBase64File(r.base64, r.filename ?? "Kuitansi.pdf", "application/pdf");
      toast.success("Kuitansi diterbitkan & diunduh", { id: toastId });
      formRef.current?.reset();
      setCatatKas(false);
      router.refresh();
    } catch {
      toast.error("Gagal menerbitkan kuitansi", { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      ref={formRef}
      action={kirim}
      className="bg-white rounded-2xl border border-neutral-200 p-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
    >
      <h2 className="sm:col-span-2 font-bold text-lg">Buat Kuitansi Baru</h2>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Diterima dari</label>
        <input name="diterimaDari" required maxLength={150} placeholder="Nama orang / instansi" className={inputCls} />
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Jumlah (Rp)</label>
        <input name="jumlah" type="number" min="1" step="1" required placeholder="0" className={inputCls} />
      </div>
      <div className="flex flex-col gap-1 sm:col-span-2">
        <label className={labelCls}>Untuk pembayaran</label>
        <input
          name="untukPembayaran"
          required
          maxLength={200}
          placeholder="mis. Sponsorship LPKBB Antareja paket Silver"
          className={inputCls}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Metode pembayaran</label>
        <select name="metode" defaultValue="TUNAI" className={inputCls}>
          {Object.entries(METODE_KUITANSI_MANUAL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Tanggal kuitansi</label>
        <input name="tanggal" type="date" required defaultValue={hariIniWIB()} className={inputCls} />
      </div>
      <div className="flex flex-col gap-1 sm:col-span-2">
        <label className={labelCls}>Catatan di kuitansi (opsional)</label>
        <textarea
          name="catatan"
          rows={2}
          maxLength={300}
          placeholder="Kosongkan untuk memakai catatan standar"
          className={inputCls}
        />
      </div>
      <div className="sm:col-span-2 flex flex-wrap items-center gap-3 rounded-lg bg-neutral-50 border border-neutral-200 px-4 py-3">
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input
            type="checkbox"
            name="catatKas"
            checked={catatKas}
            onChange={(e) => setCatatKas(e.target.checked)}
            className="w-4 h-4 accent-primary-600"
          />
          Catat juga sebagai pemasukan di Kas
        </label>
        {catatKas && (
          <select name="kategori" defaultValue="LAINNYA" className={inputCls}>
            {Object.entries(KATEGORI_KAS_PEMASUKAN).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        )}
        <p className="w-full text-xs text-gray-500">
          Jangan dicentang kalau pemasukannya sudah tercatat di Kas (otomatis atau manual), supaya tidak dihitung dua
          kali.
        </p>
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="bg-primary-600 text-white rounded-lg px-5 py-2 text-sm font-semibold hover:bg-primary-700 disabled:opacity-60"
        >
          {loading ? "Menerbitkan..." : "Terbitkan & Unduh PDF"}
        </button>
      </div>
    </form>
  );
}

function BatalButton({ k }: { k: Kuitansi }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function batal() {
    const alasan = prompt(
      `Batalkan kuitansi ${k.nomor}?${k.dicatatKas ? " Pemasukan Kas-nya ikut dihapus." : ""}\n\nAlasan pembatalan:`
    );
    if (alasan === null) return;
    if (!alasan.trim()) return toast.error("Alasan pembatalan wajib diisi");
    setLoading(true);
    const r = await batalkanKuitansiManual(k.id, alasan);
    setLoading(false);
    if (r.success) toast.success("Kuitansi dibatalkan");
    else toast.error(r.message ?? "Gagal");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={batal}
      disabled={loading}
      className="bg-red-50 text-red-700 px-3 py-1 rounded-lg text-xs hover:bg-red-100 transition-colors disabled:opacity-60 whitespace-nowrap"
    >
      {loading ? "..." : "Batalkan"}
    </button>
  );
}

export default function KuitansiManualClient({ kuitansi }: { kuitansi: Kuitansi[] }) {
  const [cari, setCari] = useState("");
  const q = cari.trim().toLowerCase();
  const tampil = kuitansi.filter(
    (k) => !q || [k.nomor, k.diterimaDari, k.untukPembayaran].some((s) => s.toLowerCase().includes(q))
  );
  const total = kuitansi.filter((k) => !k.batal).reduce((s, k) => s + k.jumlah, 0);

  return (
    <div className="flex flex-col gap-8">
      <FormKuitansi />

      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <h2 className="font-bold text-lg">Kuitansi Diterbitkan</h2>
            <p className="text-xs text-gray-500">
              {kuitansi.filter((k) => !k.batal).length} kuitansi aktif · total {rupiah(total)}
            </p>
          </div>
          <input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nomor, penerima, atau keperluan..."
            className={cn(inputCls, "min-w-[240px]")}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-6 py-2 font-medium">Nomor / Tanggal</th>
                <th className="px-3 py-2 font-medium">Diterima dari</th>
                <th className="px-3 py-2 font-medium">Untuk pembayaran</th>
                <th className="px-3 py-2 font-medium text-right">Jumlah</th>
                <th className="px-6 py-2 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {tampil.map((k) => (
                <tr key={k.id} className={cn(k.batal && "bg-neutral-50 text-gray-400")}>
                  <td className="px-6 py-3 align-top">
                    <div className={cn("font-mono font-semibold whitespace-nowrap", k.batal && "line-through")}>
                      {k.nomor}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTanggal(k.tanggal)} · {k.olehNama}
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">{k.diterimaDari}</td>
                  <td className="px-3 py-3 align-top">
                    {k.untukPembayaran}
                    <div className="text-xs text-gray-500">
                      {METODE_KUITANSI_MANUAL[k.metode] ?? k.metode}
                      {k.dicatatKas && " · dicatat di Kas"}
                    </div>
                    {k.batal && (
                      <div className="text-xs text-red-600 mt-1">
                        Dibatalkan{k.batal.oleh ? ` oleh ${k.batal.oleh}` : ""}: {k.batal.alasan}
                      </div>
                    )}
                  </td>
                  <td className={cn("px-3 py-3 align-top text-right whitespace-nowrap font-semibold", k.batal && "line-through")}>
                    {rupiah(k.jumlah)}
                  </td>
                  <td className="px-6 py-3 align-top">
                    {!k.batal && (
                      <div className="flex justify-end gap-2">
                        <UnduhKuitansiButton id={k.id} aksi={unduhKuitansiManual} />
                        <BatalButton k={k} />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {tampil.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-gray-400">
                    {kuitansi.length === 0 ? "Belum ada kuitansi manual." : "Tidak ada kuitansi yang cocok."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
