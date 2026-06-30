"use client";

import { beliTiket } from "@/actions/Tiket";
import { Tiket } from "@prisma/client";
import { useState } from "react";
import { toast } from "sonner";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

type KonfigTiket = {
  qrisUrl?: string | null;
  bankNama?: string | null;
  bankNoRek?: string | null;
  bankAtasNama?: string | null;
} | null;

export default function BeliTiketForm({
  tikets,
  userId,
  konfig,
}: {
  tikets: Tiket[];
  userId?: string;
  konfig: KonfigTiket;
}) {
  const [selected, setSelected] = useState<Tiket | null>(null);
  const [jumlah, setJumlah] = useState(1);
  const [metode, setMetode] = useState<"TRANSFER" | "QRIS">("TRANSFER");
  const [submitted, setSubmitted] = useState(false);
  const [kodeUnik] = useState(() => crypto.randomUUID().replace(/-/g, "").substring(0, 8).toUpperCase());

  async function handleSubmit(data: FormData) {
    const toastId = toast.loading("Memproses...");
    const result = await beliTiket(data, userId);
    if (result.success) {
      toast.success(
        "Pembelian berhasil! Admin akan memverifikasi dan mengirim QR Code via email.",
        { id: toastId, duration: 5000 }
      );
      setSubmitted(true);
    } else {
      toast.error("Gagal memproses pembelian", { id: toastId });
    }
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-xl font-bold text-green-800 mb-2">
          Pembelian Diterima!
        </h2>
        <p className="text-green-700 text-sm">
          Tim kami akan memverifikasi bukti transfer Anda. QR Code tiket akan
          dikirim ke email Anda setelah verifikasi selesai.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Pilih Jenis Tiket */}
      <div className="grid sm:grid-cols-3 gap-4">
        {tikets.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelected(t)}
            className={`rounded-2xl border-2 p-5 text-left transition-all ${
              selected?.id === t.id
                ? "border-primary-500 bg-primary-50"
                : "border-gray-200 bg-white hover:border-gray-400"
            }`}
          >
            <div className="font-bold text-lg mb-1">Tiket {t.jenis}</div>
            <div className="text-primary-600 font-semibold text-xl">
              {formatRupiah(t.harga)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Sisa: {t.sisa} tiket
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <form action={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="tiketId" value={selected.id} />

          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-4">
            <h3 className="font-semibold text-lg">Data Pemesan</h3>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Nama Lengkap</label>
              <input
                name="nama"
                required
                placeholder="Nama pemesan"
                className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">
                Email <span className="text-red-500">*</span>
                <span className="text-xs text-gray-400 font-normal ml-1">— tiket dikirim ke sini</span>
              </label>
              <input
                name="email"
                type="email"
                required
                placeholder="email@contoh.com"
                className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">
                No. WhatsApp <span className="text-red-500">*</span>
                <span className="text-xs text-gray-400 font-normal ml-1">— konfirmasi via WA</span>
              </label>
              <input
                name="noHp"
                required
                placeholder="08xxxxxxxxxx"
                className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Jumlah Tiket</label>
              <input
                name="jumlah"
                type="number"
                min={1}
                max={selected.sisa}
                value={jumlah}
                onChange={(e) => setJumlah(parseInt(e.target.value))}
                required
                className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>

            {/* Ringkasan */}
            <div className="bg-gray-50 rounded-xl p-4 text-sm flex flex-col gap-1">
              <div className="flex justify-between">
                <span>
                  {selected.jenis} × {jumlah}
                </span>
                <span>{formatRupiah(selected.harga * jumlah)}</span>
              </div>
              <div className="border-t pt-1 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-primary-600">
                  {formatRupiah(selected.harga * jumlah)}
                </span>
              </div>
            </div>

            {/* Metode Pembayaran */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Metode Pembayaran</label>
              <div className="flex gap-3">
                {(["TRANSFER", "QRIS"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMetode(m)}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                      metode === m
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-gray-200 text-gray-600 hover:border-neutral-400"
                    }`}
                  >
                    {m === "TRANSFER" ? "Transfer Bank" : "QRIS"}
                  </button>
                ))}
              </div>
              <input type="hidden" name="metodePembayaran" value={metode} />
              <input type="hidden" name="kodeUnik" value={kodeUnik} />
            </div>

            {/* Info Pembayaran */}
            {metode === "TRANSFER" ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 flex flex-col gap-1">
                <p className="font-semibold">Transfer ke:</p>
                {konfig?.bankNoRek ? (
                  <>
                    <p><span className="font-bold">{konfig.bankNoRek}</span> — {konfig.bankNama ?? "Bank"}</p>
                    {konfig.bankAtasNama && <p>a.n {konfig.bankAtasNama}</p>}
                  </>
                ) : (
                  <p className="italic text-blue-600">Info rekening belum dikonfigurasi admin.</p>
                )}
                <div className="mt-1 border-t border-blue-200 pt-2 flex flex-col gap-0.5">
                  <div className="flex justify-between">
                    <span>Nominal transfer tepat</span>
                    <span className="font-bold">{formatRupiah(selected.harga * jumlah + parseInt(kodeUnik))}</span>
                  </div>
                  <div className="flex justify-between text-blue-600">
                    <span>Kode unik</span>
                    <span className="font-bold font-mono tracking-widest">+{kodeUnik}</span>
                  </div>
                  <p className="text-xs text-blue-500 mt-1">Transfer nominal tepat agar mudah diverifikasi admin.</p>
                </div>
              </div>
            ) : (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-800 flex flex-col items-center gap-2">
                <p className="font-semibold">Scan QRIS berikut:</p>
                {konfig?.qrisUrl ? (
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
                <p className="font-semibold">Nominal: {formatRupiah(selected.harga * jumlah)}</p>
                <div className="bg-purple-100 rounded-lg px-4 py-2 text-center">
                  <p className="text-xs text-purple-600">Kode unik</p>
                  <p className="font-bold font-mono text-xl tracking-widest">{kodeUnik}</p>
                  <p className="text-xs text-purple-500">Sertakan kode ini saat konfirmasi</p>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Bukti Pembayaran</label>
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
            Kirim Pembelian
          </button>
        </form>
      )}
    </div>
  );
}
