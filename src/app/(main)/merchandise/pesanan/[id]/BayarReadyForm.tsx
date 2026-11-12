"use client";

import { bayarMerchReady } from "@/actions/Merchandise";
import { getDynamicQrisTiket } from "@/actions/Tiket";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { formatRupiah } from "../../format";

export default function BayarReadyForm({
  id,
  token,
  total,
  kodeUnik,
  bank,
  qrisUrl,
}: {
  id: string;
  token: string;
  total: number;
  kodeUnik: string;
  bank: { nama: string | null; noRek: string | null; atasNama: string | null };
  qrisUrl: string | null;
}) {
  const router = useRouter();
  const [metode, setMetode] = useState<"TRANSFER" | "QRIS">("TRANSFER");
  const [qrisDinamis, setQrisDinamis] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (metode !== "QRIS") return;
    let batal = false;
    getDynamicQrisTiket(total).then((r) => {
      if (!batal) setQrisDinamis(r.success ? r.dataUrl! : null);
    });
    return () => {
      batal = true;
    };
  }, [metode, total]);

  function kirim(data: FormData) {
    data.set("id", id);
    data.set("t", token);
    data.set("metodePembayaran", metode);
    startTransition(async () => {
      const r = await bayarMerchReady(data);
      if (r.success) {
        toast.success("Bukti pembayaran terkirim. Panitia akan memverifikasi.");
        router.refresh();
      } else toast.error(r.message ?? "Gagal mengirim bukti");
    });
  }

  return (
    <form action={kirim} className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-4">
      <h2 className="font-semibold text-lg">Pembayaran</h2>
      <div className="grid grid-cols-2 gap-3">
        {(["TRANSFER", "QRIS"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMetode(m)}
            className={`py-2.5 rounded-xl border-2 text-sm font-medium ${
              metode === m ? "border-primary-500 bg-primary-50 text-primary-700" : "border-gray-200 text-gray-600"
            }`}
          >
            {m === "TRANSFER" ? "Transfer Bank" : "QRIS"}
          </button>
        ))}
      </div>

      {metode === "TRANSFER" ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 flex flex-col gap-1">
          {bank.noRek ? (
            <>
              <p>
                <b>{bank.noRek}</b> — {bank.nama ?? "Bank"}
              </p>
              {bank.atasNama && <p>a.n {bank.atasNama}</p>}
            </>
          ) : (
            <p className="italic">Info rekening belum dikonfigurasi panitia.</p>
          )}
          <div className="border-t border-blue-200 mt-1 pt-2 flex justify-between">
            <span>Transfer tepat</span>
            <b>{formatRupiah(total)}</b>
          </div>
          <p className="text-xs">3 digit terakhir ({kodeUnik}) adalah kode unik untuk mencocokkan pembayaran Anda.</p>
        </div>
      ) : (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-800 flex flex-col items-center gap-2">
          {qrisDinamis || qrisUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- QRIS dinamis (data URL) atau statis dari konfigurasi
            <img src={qrisDinamis ?? qrisUrl!} alt="QRIS" className="w-52 h-52 object-contain rounded-lg border border-purple-200 bg-white" />
          ) : (
            <p className="italic">QRIS belum dikonfigurasi panitia.</p>
          )}
          <p className="font-semibold">Nominal: {formatRupiah(total)}</p>
          {!qrisDinamis && <p className="text-xs text-center">Ketik nominal di atas dengan tepat saat membayar.</p>}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">
          Bukti Pembayaran <span className="text-red-500">*</span>
        </label>
        <input
          name="bukti"
          type="file"
          accept="image/*"
          required
          className="border border-gray-200 py-3 px-3 rounded-xl text-sm file:bg-primary-500 file:text-white file:rounded-md file:border-none file:py-1 file:px-3"
        />
      </div>
      <button type="submit" disabled={pending} className="bg-primary-500 text-white rounded-xl py-3 font-bold hover:bg-primary-600 disabled:opacity-50">
        {pending ? "Mengirim..." : "Kirim Bukti Pembayaran"}
      </button>
    </form>
  );
}
