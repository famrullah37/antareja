"use client";

import { batalPesananMakanan, pesanMakanan, reserveKodeMakanan } from "@/actions/Makanan";
import { MAKS_PORSI_PER_MENU, STATUS_MAKANAN, type ItemMakanan, type StatusMakanan } from "@/lib/makanan";
import { formatRupiah, formatTanggalWib } from "@/app/(main)/merchandise/format";
import { getDynamicQrisTiket } from "@/actions/Tiket";
import Image from "next/image";
import { useRouter } from "next-nprogress-bar";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Sesi = {
  id: string;
  nama: string;
  waktu: string;
  batasPesan: string;
  menus: { id: string; nama: string; deskripsi: string | null; harga: number }[];
};

type Pesanan = {
  id: string;
  sesiNama: string;
  sesiWaktu: string;
  items: ItemMakanan[];
  totalBayar: number;
  kodeUnik: string;
  catatan: string | null;
  status: string;
  catatanAdmin: string | null;
};

const inputCls =
  "border border-neutral-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400";

function DaftarPesanan({ pesanan }: { pesanan: Pesanan[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function batal(id: string) {
    if (!confirm("Batalkan pesanan ini?")) return;
    setBusy(id);
    const r = await batalPesananMakanan(id);
    setBusy(null);
    if (r.success) {
      toast.success("Pesanan dibatalkan");
      router.refresh();
    } else toast.error(r.message ?? "Gagal");
  }

  return (
    <div className="flex flex-col gap-3">
      {pesanan.map((p) => {
        const st = STATUS_MAKANAN[p.status as StatusMakanan] ?? STATUS_MAKANAN.PENDING;
        return (
          <div key={p.id} className="bg-white border border-neutral-200 rounded-xl p-4 flex flex-col gap-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-semibold">{p.sesiNama}</div>
                <div className="text-xs text-gray-400">{formatTanggalWib(p.sesiWaktu)}</div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${st.badge}`}>{st.label}</span>
            </div>
            <ul className="text-gray-600">
              {p.items.map((i) => (
                <li key={i.menuId}>
                  {i.nama} × {i.jumlah}
                </li>
              ))}
            </ul>
            {p.catatan && <p className="text-xs text-gray-500">Catatan: {p.catatan}</p>}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-2">
              <span>
                Total <b>{formatRupiah(p.totalBayar)}</b> · Kode{" "}
                <span className="font-mono font-bold text-primary-600 tracking-widest">#{p.kodeUnik}</span>
              </span>
              {p.status === "PENDING" && (
                <button
                  type="button"
                  onClick={() => batal(p.id)}
                  disabled={busy === p.id}
                  className="text-xs text-red-500 hover:underline disabled:opacity-60"
                >
                  Batalkan
                </button>
              )}
            </div>
            {p.status === "VERIFIED" && (
              <p className="text-xs text-green-700">Sebutkan kode pesanan saat mengambil makanan di stand panitia.</p>
            )}
            {p.catatanAdmin && <p className="text-xs text-red-600">Catatan panitia: {p.catatanAdmin}</p>}
          </div>
        );
      })}
    </div>
  );
}

function FormPesan({ sesi, qrisUrl, onSelesai }: { sesi: Sesi[]; qrisUrl: string | null; onSelesai: () => void }) {
  const router = useRouter();
  const [sesiId, setSesiId] = useState(sesi[0]?.id ?? "");
  const [jumlah, setJumlah] = useState<Record<string, number>>({});
  const [kodeUnik, setKodeUnik] = useState<string | null>(null);
  const [reserving, setReserving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qrisDinamis, setQrisDinamis] = useState<string | null>(null);

  const aktif = sesi.find((s) => s.id === sesiId);
  const baris = (aktif?.menus ?? []).filter((m) => (jumlah[m.id] ?? 0) > 0);
  const subtotal = baris.reduce((s, m) => s + m.harga * jumlah[m.id], 0);
  const totalBayar = subtotal + (kodeUnik ? parseInt(kodeUnik, 10) : 0);
  const adaIsi = baris.length > 0;

  // QRIS dinamis memuat nominal persis (subtotal + kode unik); dibuat ulang
  // setiap jumlah berubah, dengan jeda supaya tidak membanjiri server.
  useEffect(() => {
    if (!kodeUnik || subtotal <= 0) {
      setQrisDinamis(null);
      return;
    }
    let batal = false;
    const timer = setTimeout(async () => {
      const r = await getDynamicQrisTiket(totalBayar);
      if (!batal) setQrisDinamis(r.success ? r.dataUrl! : null);
    }, 300);
    return () => {
      batal = true;
      clearTimeout(timer);
    };
  }, [kodeUnik, subtotal, totalBayar]);

  // Kode unik dicadangkan sekali saat menu pertama kali dipilih.
  useEffect(() => {
    if (!adaIsi || kodeUnik || reserving) return;
    setReserving(true);
    reserveKodeMakanan().then((r) => {
      setReserving(false);
      if (r.success) setKodeUnik(r.kodeUnik!);
      else toast.error(r.message ?? "Gagal menyiapkan kode pembayaran");
    });
  }, [adaIsi, kodeUnik, reserving]);

  function ubah(menuId: string, n: number) {
    setJumlah((prev) => ({ ...prev, [menuId]: Math.max(0, Math.min(MAKS_PORSI_PER_MENU, n || 0)) }));
  }

  async function kirim(data: FormData) {
    data.set("sesiId", sesiId);
    data.set("kodeUnik", kodeUnik ?? "");
    data.set("items", JSON.stringify(baris.map((m) => ({ menuId: m.id, jumlah: jumlah[m.id] }))));
    setLoading(true);
    const toastId = toast.loading("Mengirim pesanan...");
    const r = await pesanMakanan(data);
    setLoading(false);
    if (r.success) {
      toast.success("Pesanan terkirim, menunggu verifikasi panitia", { id: toastId });
      onSelesai();
      router.refresh();
    } else {
      toast.error(r.message ?? "Gagal", { id: toastId });
      if (r.message?.includes("sudah terpakai")) setKodeUnik(null);
    }
  }

  return (
    <form action={kirim} className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Sesi makan</label>
        <select
          value={sesiId}
          onChange={(e) => {
            setSesiId(e.target.value);
            setJumlah({});
          }}
          className={inputCls}
        >
          {sesi.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nama} — {formatTanggalWib(s.waktu)}
            </option>
          ))}
        </select>
        {aktif && <p className="text-xs text-gray-400">Pemesanan sesi ini ditutup {formatTanggalWib(aktif.batasPesan)}</p>}
      </div>

      <div className="flex flex-col divide-y divide-neutral-100 border border-neutral-200 rounded-xl">
        {aktif?.menus.map((m) => (
          <div key={m.id} className="flex items-center gap-3 p-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{m.nama}</div>
              {m.deskripsi && <div className="text-xs text-gray-400">{m.deskripsi}</div>}
              <div className="text-sm text-primary-600 font-semibold">{formatRupiah(m.harga)}</div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => ubah(m.id, (jumlah[m.id] ?? 0) - 1)}
                className="w-8 h-8 rounded-lg border border-neutral-300 font-bold"
                aria-label={`Kurangi ${m.nama}`}
              >
                −
              </button>
              <input
                type="number"
                min={0}
                max={MAKS_PORSI_PER_MENU}
                value={jumlah[m.id] ?? 0}
                onChange={(e) => ubah(m.id, parseInt(e.target.value, 10))}
                className="w-14 text-center border border-neutral-300 rounded-lg py-1 text-sm"
                aria-label={`Jumlah ${m.nama}`}
              />
              <button
                type="button"
                onClick={() => ubah(m.id, (jumlah[m.id] ?? 0) + 1)}
                className="w-8 h-8 rounded-lg border border-neutral-300 font-bold"
                aria-label={`Tambah ${m.nama}`}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">
          Catatan <span className="text-xs text-gray-400 font-normal">— opsional, mis. 2 porsi tanpa sambal</span>
        </label>
        <textarea name="catatan" rows={2} maxLength={500} className={inputCls} />
      </div>

      {adaIsi &&
        (!kodeUnik ? (
          <p className="text-sm text-gray-400">Menyiapkan kode pembayaran...</p>
        ) : (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-800 flex flex-col items-center gap-3">
            <p className="font-semibold">Bayar dengan scan QRIS berikut</p>
            {qrisDinamis ? (
              // eslint-disable-next-line @next/next/no-img-element -- QRIS dinamis (data URL sekali pakai)
              <img src={qrisDinamis} alt="QRIS pembayaran makanan" className="w-52 h-52 object-contain rounded-lg border border-purple-200 bg-white" />
            ) : qrisUrl ? (
              <Image src={qrisUrl} alt="QRIS" width={208} height={208} className="w-52 h-52 object-contain rounded-lg border border-purple-200 bg-white" />
            ) : (
              <div className="w-44 h-44 bg-white border border-purple-200 rounded-lg flex items-center justify-center text-gray-400 text-xs text-center p-2">
                QRIS belum diatur panitia
              </div>
            )}
            <div className="w-full border-t border-purple-200 pt-2 flex flex-col gap-0.5">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between text-purple-600">
                <span>Kode unik</span>
                <span className="font-mono font-bold tracking-widest">+{kodeUnik}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Nominal bayar tepat</span>
                <span>{formatRupiah(totalBayar)}</span>
              </div>
            </div>
            {!qrisDinamis && (
              <p className="text-xs text-purple-700 text-center">
                Masukkan nominal <b>{formatRupiah(totalBayar)}</b> persis (termasuk kode unik) supaya pembayaran bisa dicocokkan.
              </p>
            )}
          </div>
        ))}

      {adaIsi && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">
            Bukti Pembayaran{" "}
            <span className="text-xs text-gray-400 font-normal">— opsional, panitia mencocokkan dari riwayat QRIS</span>
          </label>
          <input
            name="bukti"
            type="file"
            accept="image/*"
            className="border border-neutral-200 py-2.5 px-3 rounded-xl text-sm file:bg-primary-500 file:text-white file:rounded-md file:border-none file:py-1 file:px-3 hover:cursor-pointer"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={!adaIsi || !kodeUnik || loading}
        className="self-start bg-primary-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-600 transition-colors disabled:opacity-50"
      >
        {loading ? "Mengirim..." : "Kirim Pesanan"}
      </button>
    </form>
  );
}

export default function FormMakanan({
  aktif,
  sesi,
  qrisUrl,
  pesanan,
}: {
  aktif: boolean;
  sesi: Sesi[];
  qrisUrl: string | null;
  pesanan: Pesanan[];
}) {
  const [buka, setBuka] = useState(pesanan.length === 0);
  // Remount form setiap selesai kirim supaya jumlah & kode unik mulai dari nol.
  const [kunciForm, setKunciForm] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      {pesanan.length > 0 && <DaftarPesanan pesanan={pesanan} />}

      {aktif &&
        (sesi.length === 0 ? (
          <p className="text-sm text-gray-400">Belum ada sesi makan yang bisa dipesan saat ini.</p>
        ) : buka ? (
          <FormPesan
            key={kunciForm}
            sesi={sesi}
            qrisUrl={qrisUrl}
            onSelesai={() => {
              setKunciForm((k) => k + 1);
              setBuka(false);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setBuka(true)}
            className="self-start bg-primary-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-600 transition-colors"
          >
            + Pesan Makanan
          </button>
        ))}
    </div>
  );
}
