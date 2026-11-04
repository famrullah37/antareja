"use client";

import { beliTiket, getDynamicQrisTiket, reserveKodeTiket } from "@/actions/Tiket";
import { Tiket } from "@prisma/client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import MasaBerlakuQris, { type KodeTerbit } from "@/app/components/global/MasaBerlakuQris";
import { usePeringatanKeluar } from "@/lib/usePeringatanKeluar";
import { namaTiket } from "@/lib/tiket";

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
  konfig,
  punyaTim,
  sudahLogin,
  sudahDipesan,
  pilihAwal,
}: {
  tikets: Tiket[];
  konfig: KonfigTiket;
  punyaTim: boolean;
  sudahLogin: boolean;
  sudahDipesan: string[];
  pilihAwal: string | null;
}) {
  // Tiket wajib hanya bisa dipilih akun tim, satu pesanan aktif per tim.
  const terkunci = (t: Tiket) => t.khususTim && (!punyaTim || sudahDipesan.includes(t.id));
  // ?pilih=<id> (dari dashboard tim): langsung terpilih kalau boleh dipilih.
  const awal = tikets.find((t) => t.id === pilihAwal && !terkunci(t)) ?? null;
  const [selected, setSelected] = useState<Tiket | null>(awal);
  const [jumlah, setJumlah] = useState(awal?.khususTim ? awal.jumlahPerTim : 1);
  const [bundleJumlah, setBundleJumlah] = useState(0);
  const [metode, setMetode] = useState<"TRANSFER" | "QRIS">("TRANSFER");
  const [submitted, setSubmitted] = useState<{ linkPesanan?: string; adaBukti?: boolean } | null>(null);
  const [kodeUnik, setKodeUnik] = useState<string | null>(null);
  const [reservingKode, setReservingKode] = useState(false);
  const [qrisDinamis, setQrisDinamis] = useState<string | null>(null);
  const [kodeTerbit, setKodeTerbit] = useState<KodeTerbit | null>(null);

  usePeringatanKeluar(
    !!selected && !!kodeUnik && !submitted,
    "Pesanan tiket belum dikirim. Kalau sudah membayar, tekan tombol kirim dulu supaya pembayaran tercatat " +
      "(bukti bisa diunggah belakangan). Tetap tinggalkan halaman ini?"
  );

  function terimaKode(r: KodeTerbit) {
    setKodeUnik(r.kodeUnik);
    setKodeTerbit(r);
  }

  async function buatKodeBaru() {
    setReservingKode(true);
    setKodeUnik(null);
    const r = await reserveKodeTiket();
    setReservingKode(false);
    if (r.success) terimaKode(r as KodeTerbit);
    else toast.error("Gagal menyiapkan kode pembayaran, coba pilih ulang tiket");
  }

  const adaBundling = !!selected?.bundleHarga && !!selected?.bundleIsi;
  const subtotal = selected ? selected.harga * jumlah + (adaBundling ? selected.bundleHarga! * bundleJumlah : 0) : 0;
  const totalBayar = selected && kodeUnik ? subtotal + parseInt(kodeUnik) : 0;

  // Paket bundling maksimal 1 per tiket — ikut turun kalau jumlah tiket dikurangi
  useEffect(() => {
    setBundleJumlah((b) => Math.min(b, Number.isFinite(jumlah) ? Math.max(jumlah, 0) : 0));
  }, [jumlah]);

  // Cadangkan kode unik begitu jenis tiket dipilih — nomor urut atomik dari
  // server (lihat reserveKodeTiket) supaya tidak bentrok dengan pembeli lain.
  useEffect(() => {
    if (!selected) {
      setKodeUnik(null);
      return;
    }
    let cancelled = false;
    setBundleJumlah(0);
    setReservingKode(true);
    setKodeUnik(null);
    reserveKodeTiket().then((result) => {
      if (cancelled) return;
      setReservingKode(false);
      if (result.success) terimaKode(result as KodeTerbit);
      else toast.error("Gagal menyiapkan kode pembayaran, coba pilih ulang tiket");
    });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  useEffect(() => {
    if (metode !== "QRIS" || totalBayar <= 0) {
      setQrisDinamis(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await getDynamicQrisTiket(totalBayar);
      if (!cancelled) setQrisDinamis(result.success ? result.dataUrl! : null);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [metode, totalBayar]);

  async function handleSubmit(data: FormData) {
    const toastId = toast.loading("Memproses...");
    const result = await beliTiket(data);
    if (result.success) {
      toast.success(
        "Pembelian berhasil! Admin akan memverifikasi dan mengirim QR Code via email.",
        { id: toastId, duration: 5000 }
      );
      setSubmitted({ linkPesanan: result.linkPesanan, adaBukti: result.adaBukti });
    } else {
      toast.error(result.message ?? "Gagal memproses pembelian", { id: toastId });
      if (["sudah terpakai", "tidak valid", "kedaluwarsa"].some((m) => result.message?.includes(m))) await buatKodeBaru();
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
          Tim kami akan memverifikasi pembayaran Anda. QR Code tiket akan
          dikirim ke email Anda setelah verifikasi selesai.
        </p>
        {submitted.linkPesanan && (
          <div className="mt-5 flex flex-col items-center gap-2">
            {!submitted.adaBukti && (
              <p className="text-sm text-green-800 font-medium">
                Belum upload bukti pembayaran? Unggah lewat halaman pesanan Anda.
              </p>
            )}
            <a
              href={submitted.linkPesanan}
              className="bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
            >
              {submitted.adaBukti ? "Lihat Pesanan" : "Upload Bukti / Lihat Pesanan"}
            </a>
            <p className="text-xs text-green-700">Link ini juga dikirim ke email Anda.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Pilih Jenis Tiket */}
      <div className="grid sm:grid-cols-3 gap-4">
        {tikets.map((t) => {
          const dipesan = t.khususTim && sudahDipesan.includes(t.id);
          const dikunci = terkunci(t);
          return (
          <button
            key={t.id}
            type="button"
            disabled={dikunci}
            onClick={() => {
              setSelected(t);
              // Tiket wajib: jumlah ditetapkan admin, tidak bisa diubah pembeli.
              setJumlah(t.khususTim ? t.jumlahPerTim : 1);
            }}
            className={`rounded-2xl border-2 p-5 text-left transition-all ${
              dikunci
                ? "border-gray-200 bg-gray-50 opacity-70 cursor-not-allowed"
                : selected?.id === t.id
                ? "border-primary-500 bg-primary-50"
                : "border-gray-200 bg-white hover:border-gray-400"
            }`}
          >
            {t.khususTim && (
              <div className="text-[11px] font-semibold uppercase tracking-wide text-primary-700 bg-primary-100 rounded px-2 py-0.5 mb-2 inline-block">
                Wajib tim peserta
              </div>
            )}
            <div className="font-bold text-lg mb-1">{namaTiket(t.jenis)}</div>
            <div className="text-primary-600 font-semibold text-xl">
              {formatRupiah(t.harga)}
            </div>
            {t.bundleHarga && t.bundleIsi ? (
              <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1 mt-2 inline-block">
                Bundling: +{formatRupiah(t.bundleHarga)} dapat {t.bundleIsi}
              </div>
            ) : null}
            <div className="text-xs text-gray-400 mt-1">
              Sisa: {t.sisa} tiket
            </div>
            {t.khususTim && (
              <div className="text-xs text-gray-600 mt-1">Wajib {t.jumlahPerTim} tiket per tim</div>
            )}
            {dikunci && (
              <div className="text-xs text-gray-600 mt-2">
                {dipesan
                  ? "Tim kamu sudah memesan tiket ini — cek status di dashboard tim."
                  : sudahLogin
                  ? "Hanya untuk akun yang sudah mendaftarkan tim."
                  : "Login dengan akun tim untuk membeli tiket ini."}
              </div>
            )}
          </button>
          );
        })}
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
                readOnly={selected.khususTim}
                required
                className={`border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 ${
                  selected.khususTim ? "bg-gray-100 text-gray-600 cursor-not-allowed" : ""
                }`}
              />
              {selected.khususTim && (
                <span className="text-xs text-gray-500">Jumlah tiket wajib per tim ditetapkan panitia.</span>
              )}
            </div>

            {adaBundling && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col gap-2">
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    Tambah Bundling: +{formatRupiah(selected.bundleHarga!)} dapat {selected.bundleIsi}
                  </p>
                  <p className="text-xs text-amber-700">
                    Maksimal 1 paket per tiket. Diambil saat QR tiket di-scan di pintu masuk.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setBundleJumlah((b) => Math.max(0, b - 1))}
                    disabled={bundleJumlah <= 0}
                    className="w-9 h-9 rounded-lg border border-amber-300 bg-white font-bold text-amber-800 disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="min-w-[2rem] text-center font-semibold">{bundleJumlah}</span>
                  <button
                    type="button"
                    onClick={() => setBundleJumlah((b) => Math.min(jumlah || 0, b + 1))}
                    disabled={bundleJumlah >= (jumlah || 0)}
                    className="w-9 h-9 rounded-lg border border-amber-300 bg-white font-bold text-amber-800 disabled:opacity-40"
                  >
                    +
                  </button>
                  <span className="text-xs text-amber-700">paket</span>
                </div>
              </div>
            )}
            <input type="hidden" name="bundleJumlah" value={adaBundling ? bundleJumlah : 0} />

            {/* Ringkasan */}
            <div className="bg-gray-50 rounded-xl p-4 text-sm flex flex-col gap-1">
              <div className="flex justify-between">
                <span>
                  {selected.jenis} × {jumlah}
                </span>
                <span>{formatRupiah(selected.harga * jumlah)}</span>
              </div>
              {adaBundling && bundleJumlah > 0 && (
                <div className="flex justify-between">
                  <span>
                    Bundling {selected.bundleIsi} × {bundleJumlah}
                  </span>
                  <span>{formatRupiah(selected.bundleHarga! * bundleJumlah)}</span>
                </div>
              )}
              <div className="border-t pt-1 flex justify-between font-bold">
                <span>Total (+ kode unik)</span>
                <span className="text-primary-600">
                  {kodeUnik ? formatRupiah(totalBayar) : formatRupiah(subtotal)}
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
              <input type="hidden" name="kodeUnik" value={kodeUnik ?? ""} />
              <input type="hidden" name="kodeToken" value={kodeTerbit?.kodeToken ?? ""} />
            </div>

            {reservingKode || !kodeUnik ? (
              <p className="text-sm text-gray-400">Menyiapkan kode pembayaran...</p>
            ) : metode === "TRANSFER" ? (
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
                    <span className="font-bold">{formatRupiah(totalBayar)}</span>
                  </div>
                  <div className="flex justify-between text-blue-600">
                    <span>Kode unik</span>
                    <span className="font-bold font-mono tracking-widest">+{kodeUnik}</span>
                  </div>
                  <p className="text-xs text-blue-500 mt-1">Transfer nominal tepat agar mudah diverifikasi admin.</p>
                </div>
              </div>
            ) : (
              <MasaBerlakuQris berlakuSampai={kodeTerbit?.berlakuSampai ?? null} onBuatBaru={buatKodeBaru}>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-800 flex flex-col items-center gap-2">
                <p className="font-semibold">Scan QRIS berikut:</p>
                {qrisDinamis ? (
                  // eslint-disable-next-line @next/next/no-img-element -- QRIS dinamis (data URL sekali pakai)
                  <img
                    src={qrisDinamis}
                    alt="QRIS Dinamis"
                    className="w-48 h-48 object-contain rounded-lg border border-purple-200 bg-white"
                  />
                ) : konfig?.qrisUrl ? (
                  <Image
                    src={konfig.qrisUrl}
                    alt="QRIS"
                    width={192}
                    height={192}
                    className="w-48 h-48 object-contain rounded-lg border border-purple-200 bg-white"
                  />
                ) : (
                  <div className="w-40 h-40 bg-white border border-purple-200 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                    QRIS belum dikonfigurasi
                  </div>
                )}
                <p className="font-semibold">Nominal: {formatRupiah(totalBayar)}</p>
                <p className="text-xs font-semibold text-purple-700 text-center">
                  Setelah bayar, langsung kirim pesanan di bawah — bukti boleh diunggah belakangan.
                </p>
                {qrisDinamis ? (
                  <p className="text-xs text-purple-500 text-center">Nominal sudah otomatis terisi di QRIS — tinggal scan & bayar.</p>
                ) : (
                  <div className="bg-purple-100 rounded-lg px-4 py-2 text-center">
                    <p className="text-xs text-purple-600">Kode unik</p>
                    <p className="font-bold font-mono text-xl tracking-widest">{kodeUnik}</p>
                    <p className="text-xs text-purple-500">Sertakan kode ini saat konfirmasi</p>
                  </div>
                )}
              </div>
              </MasaBerlakuQris>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">
                Bukti Pembayaran {metode === "TRANSFER" && <span className="text-red-500">*</span>}
                {metode === "QRIS" && (
                  <span className="text-xs text-gray-400 font-normal ml-1">— opsional, admin cek dari riwayat QRIS</span>
                )}
              </label>
              <input
                name="bukti"
                type="file"
                accept="image/*"
                required={metode === "TRANSFER"}
                className="border border-gray-200 py-3 px-3 rounded-xl file:bg-primary-500 file:text-white file:rounded-md file:border-none file:py-1 hover:cursor-pointer"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={reservingKode || !kodeUnik}
            className="bg-primary-500 text-white rounded-xl py-4 font-bold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Kirim Pembelian
          </button>
        </form>
      )}
    </div>
  );
}
