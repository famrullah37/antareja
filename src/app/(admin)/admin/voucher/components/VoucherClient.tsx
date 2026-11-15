"use client";

import {
  buatVoucher,
  buatVoucherMassal,
  hapusVoucher,
  hapusVoucherMassal,
  kirimEmailVoucher,
  setAktifVoucher,
  ubahSekolahVoucher,
} from "@/actions/Voucher";
import cn from "@/lib/clsx";
import { useRouter } from "next-nprogress-bar";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Voucher = {
  id: string;
  kode: string;
  keterangan: string | null;
  persen: boolean;
  nilai: number;
  maksPotongan: number | null;
  jenjang: string | null;
  asalSekolah: string | null;
  kuota: number | null;
  aktif: boolean;
  pribadi: boolean;
  sumberTim: string | null;
  penerimaEmail: string | null;
  penerimaTelp: string | null;
  emailTerkirimAt: string | null;
  terpakai: number; // jumlahDipakai — bertahan walau data tim direset
  dirujukPembayaran: number; // pembayaran tim kegiatan ini (0 setelah reset)
  dipakaiOleh: string[];
};

type Tim = {
  id: string;
  nama_tim: string;
  asal_sekolah: string;
  jenjang: string;
  confirmed: boolean;
  // Voucher pribadi yang sudah dimiliki tim (maks. satu per tim).
  voucher: { persen: boolean; nilai: number; maksPotongan: number | null; terpakai: boolean } | null;
  peringkat: number | null; // urutan nilai akhir di jenjangnya, sama dengan /admin/penghargaan
  juara: ("UTAMA" | "UMUM")[]; // Juara Utama 1 / Juara Umum jenjangnya
};

// Hadiah voucher sesuai juklak. Memilih preset juara langsung mencentang tim
// juaranya (dihitung sama dengan /admin/penghargaan); panitia tetap bisa
// mengubah centang sebelum membuat. Aturan berlaku sama di SETIAP jenjang:
// satu Juara Utama 1 dan satu Juara Umum per jenjang. Satu tim hanya satu
// voucher — tim juara ganda mendapat yang terbesar (server menaikkan voucher
// yang lebih kecil bila belum terpakai, dan melewati bila sudah lebih besar).
const PRESET_JUKLAK = [
  { label: "Juara Utama 1 — 50%", persen: true, nilai: 50, keterangan: "Hadiah Juara Utama 1", perJenjang: true, pilih: "UTAMA" },
  { label: "Juara Umum — 25%", persen: true, nilai: 25, keterangan: "Hadiah Juara Umum", perJenjang: true, pilih: "UMUM" },
  { label: "Peserta lainnya — 5%", persen: true, nilai: 5, keterangan: "Voucher peserta", perJenjang: false, pilih: "SEMUA" },
] as const;

const inputCls =
  "border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400";
const labelCls = "text-xs text-gray-500";
const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const JENJANG = ["SD", "SMP", "SMA", "PURNA"];

function labelNilai(v: Pick<Voucher, "persen" | "nilai" | "maksPotongan">) {
  if (!v.persen) return rupiah(v.nilai);
  return v.maksPotongan != null ? `${v.nilai}% (maks ${rupiah(v.maksPotongan)})` : `${v.nilai}%`;
}

// Jenis (Rp/%) + besar potongan + maksimal — dipakai kedua form. Nilai awal
// bisa diisi preset (komponen di-remount lewat `key` saat preset dipilih).
function FieldPotongan({ awal }: { awal?: { persen: boolean; nilai: number } }) {
  const [persen, setPersen] = useState(awal?.persen ?? false);
  return (
    <>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Jenis potongan</label>
        <select
          name="jenis"
          className={inputCls}
          defaultValue={awal?.persen ? "PERSEN" : "NOMINAL"}
          onChange={(e) => setPersen(e.target.value === "PERSEN")}
        >
          <option value="NOMINAL">Nominal (Rp)</option>
          <option value="PERSEN">Persen (%)</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>{persen ? "Besar potongan (%)" : "Besar potongan (Rp)"}</label>
        <input
          name="nilai"
          type="number"
          min="1"
          max={persen ? 100 : undefined}
          step="1"
          required
          defaultValue={awal?.nilai}
          className={inputCls}
        />
      </div>
      {persen && (
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Maksimal potongan (Rp, opsional)</label>
          <input name="maksPotongan" type="number" min="1" step="1" className={inputCls} />
        </div>
      )}
    </>
  );
}

// Kalimat ringkas dari isi form, supaya admin yakin voucher yang dibuat sesuai maksud.
function ringkasVoucherUmum(f: Record<string, string>) {
  const nilai = Number(f.nilai);
  if (!nilai) return null;
  const persen = f.jenis === "PERSEN";
  const maks = Number(f.maksPotongan);
  const potongan = persen
    ? `potongan ${nilai}%${maks ? ` (paling banyak ${rupiah(maks)})` : ""}`
    : `potongan ${rupiah(nilai)}`;
  const kode = f.kode?.trim() ? f.kode.trim().toUpperCase() : "(kode acak)";
  const siapa = [
    f.jenjang ? `tim ${f.jenjang}` : "tim semua jenjang",
    f.asalSekolah?.trim() ? `khusus dari ${f.asalSekolah.trim()}` : "dari sekolah mana pun",
  ].join(" ");
  const kuota = Number(f.kuota) ? `Maksimal dipakai ${Number(f.kuota)} tim.` : "Tanpa batas jumlah tim.";
  return `Kode ${kode} memberi ${potongan} biaya pendaftaran untuk ${siapa}. ${kuota} Tim mengetik kode ini saat mendaftar.`;
}

function FormVoucherUmum() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [isian, setIsian] = useState<Record<string, string>>({});
  const ringkasan = ringkasVoucherUmum(isian);

  async function kirim(data: FormData) {
    setLoading(true);
    const r = await buatVoucher(data);
    setLoading(false);
    if (!r.success) {
      toast.error(r.message ?? "Gagal membuat voucher");
      return;
    }
    toast.success(r.message ?? "Voucher dibuat");
    formRef.current?.reset();
    setIsian({});
    router.refresh();
  }

  return (
    <form
      ref={formRef}
      action={kirim}
      onChange={(e) => {
        const el = e.target as HTMLInputElement;
        if (el.name) setIsian((s) => ({ ...s, [el.name]: el.value }));
      }}
      className="bg-white rounded-2xl border border-neutral-200 p-6 grid grid-cols-1 sm:grid-cols-3 gap-4"
    >
      <div className="sm:col-span-3">
        <h2 className="font-bold text-lg">Kode Voucher Umum</h2>
        <p className="text-xs text-gray-500">
          Kode promo yang diketik tim saat mendaftar, mis. EARLYBIRD atau ALUMNI. Siapa pun yang tahu kodenya dan
          memenuhi syarat bisa memakainya.
        </p>
        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-2">
          Voucher hadiah juklak (Juara Utama 50%, Juara Umum 25%, Peserta 5%) <b>jangan dibuat di sini</b> — pakai
          form &quot;Voucher Pribadi untuk Kegiatan Berikutnya&quot; di bawah, supaya voucher terkunci ke sekolah peserta dan berlaku otomatis.
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Kode (kosongkan = acak)</label>
        <input name="kode" maxLength={40} placeholder="EARLYBIRD" className={cn(inputCls, "font-mono uppercase")} />
      </div>
      <FieldPotongan />
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Jenjang</label>
        <select name="jenjang" className={inputCls} defaultValue="">
          <option value="">Semua jenjang</option>
          {JENJANG.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Kuota pemakaian (kosong = tanpa batas)</label>
        <input name="kuota" type="number" min="1" step="1" className={inputCls} />
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Khusus sekolah (kosongkan = semua sekolah)</label>
        <input name="asalSekolah" maxLength={150} placeholder="mis. SMP Negeri 1 Malang" className={inputCls} />
      </div>
      <div className="flex flex-col gap-1 sm:col-span-2">
        <label className={labelCls}>Keterangan (opsional)</label>
        <input name="keterangan" maxLength={200} className={inputCls} />
      </div>
      <label className="flex items-center gap-2 text-sm self-end pb-2">
        <input type="checkbox" name="aktif" defaultChecked /> Langsung aktif
      </label>
      {ringkasan && (
        <p className="sm:col-span-3 text-sm bg-primary-50 border border-primary-200 rounded-lg px-3 py-2 text-gray-700">
          {ringkasan}
        </p>
      )}
      <div className="sm:col-span-3 flex justify-end">
        <button
          disabled={loading}
          className="bg-primary-500 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? "Menyimpan..." : "Buat Voucher"}
        </button>
      </div>
    </form>
  );
}

function FormVoucherMassal({ tims, seriJuara }: { tims: Tim[]; seriJuara: string[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [hanyaKonfirmasi, setHanyaKonfirmasi] = useState(true);
  const [dipilih, setDipilih] = useState<Set<string>>(new Set());
  const [preset, setPreset] = useState<number | null>(null);
  const awal = preset != null ? PRESET_JUKLAK[preset] : undefined;
  // Mode manual: juara dihitung panitia di luar sistem (penilaian sistem tidak
  // dipakai), jadi hasil/peringkat sistem disembunyikan dan tim dicentang sendiri.
  // Default manual kalau sistem belum menemukan juara atau hasilnya seri.
  const [manual, setManual] = useState(() => seriJuara.length > 0 || tims.every((t) => t.juara.length === 0));
  const [cari, setCari] = useState("");
  const [filterJenjang, setFilterJenjang] = useState("");

  const q = cari.trim().toLowerCase();
  const tampil = tims.filter(
    (t) =>
      (!hanyaKonfirmasi || t.confirmed) &&
      (!filterJenjang || t.jenjang === filterJenjang) &&
      (!q || `${t.nama_tim} ${t.asal_sekolah}`.toLowerCase().includes(q))
  );

  // Jumlah tim terpilih per jenjang — untuk preset juara (1 tim per jenjang).
  const perJenjang: Record<string, number> = {};
  tims.forEach((t) => {
    if (dipilih.has(t.id)) perJenjang[t.jenjang] = (perJenjang[t.jenjang] ?? 0) + 1;
  });
  const jenjangGanda = Object.entries(perJenjang)
    .filter(([, n]) => n > 1)
    .map(([j]) => j);
  const bisaDipilih = tampil.filter((t) => !t.voucher);

  function pilihPreset(i: number) {
    setPreset(i);
    const p = PRESET_JUKLAK[i];
    if (p.pilih === "SEMUA") {
      // Semua tim tanpa voucher, tidak terpengaruh kotak cari / filter jenjang.
      setDipilih(new Set(tims.filter((t) => (!hanyaKonfirmasi || t.confirmed) && !t.voucher).map((t) => t.id)));
    } else if (manual) {
      // Hanya mengisi besar potongan & keterangan; tim juara dicentang panitia.
      setDipilih(new Set());
    } else {
      // Tim juara yang sudah punya voucher sama/lebih besar tidak perlu dicentang.
      setDipilih(
        new Set(
          tims
            .filter((t) => t.juara.includes(p.pilih) && !(t.voucher && (t.voucher.terpakai || (t.voucher.persen && t.voucher.nilai >= p.nilai))))
            .map((t) => t.id)
        )
      );
    }
  }

  function toggle(id: string) {
    setDipilih((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function kirim(data: FormData) {
    dipilih.forEach((id) => data.append("timId", id));
    setLoading(true);
    const r = await buatVoucherMassal(data);
    setLoading(false);
    if (!r.success) {
      toast.error(r.message ?? "Gagal membuat voucher");
      return;
    }
    toast.success(r.message ?? "Voucher dibuat");
    setDipilih(new Set());
    router.refresh();
  }

  return (
    <form action={kirim} className="bg-white rounded-2xl border border-neutral-200 p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="sm:col-span-3">
        <h2 className="font-bold text-lg">Voucher Pribadi untuk Kegiatan Berikutnya</h2>
        <p className="text-xs text-gray-500">
          Satu voucher per tim, sekali pakai, dikunci ke nama sekolah <b>dan jenjang</b> tim (voucher tim SMP hanya
          berlaku untuk tim SMP sekolah itu). Tahun depan voucher{" "}
          <b>terpasang otomatis</b> saat tim dari sekolah itu mendaftar, tanpa perlu kode dan tanpa bergantung pada
          official/email lama. Biarkan nonaktif dulu, lalu aktifkan saat pendaftaran kegiatan berikutnya dibuka.
        </p>
      </div>
      <label className="sm:col-span-3 flex items-start gap-2 text-sm bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2">
        <input
          type="checkbox"
          className="mt-1"
          checked={manual}
          onChange={(e) => {
            setManual(e.target.checked);
            setDipilih(new Set());
            setPreset(null);
          }}
        />
        <span>
          <b>Juara ditentukan manual</b> (penilaian dihitung di luar sistem). Hasil &amp; peringkat dari sistem
          disembunyikan; preset juara hanya mengisi besar potongan, lalu centang sendiri tim juaranya.
        </span>
      </label>
      <div className="sm:col-span-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-gray-500">Preset juklak:</span>
        {PRESET_JUKLAK.map((p, i) => (
          <button
            key={p.label}
            type="button"
            onClick={() => pilihPreset(i)}
            className={cn(
              "px-3 py-1.5 rounded-full border",
              preset === i ? "bg-amber-100 border-amber-400 text-amber-800" : "border-neutral-300"
            )}
          >
            {p.label}
          </button>
        ))}
        {manual ? (
          <span className="basis-full text-xs text-gray-500">
            Langkah: (1) klik <b>Juara Utama 1 — 50%</b>, cari &amp; centang tim Juara Utama 1 tiap jenjang, ubah
            keterangan bila perlu, klik Buat. (2) Ulangi dengan <b>Juara Umum — 25%</b>. (3) Terakhir{" "}
            <b>Peserta lainnya — 5%</b> otomatis mencentang semua tim yang belum punya voucher. Tim juara ganda
            otomatis mendapat yang terbesar.
          </span>
        ) : (
        <span className="basis-full text-xs text-gray-500">
          Memilih preset langsung mencentang tim yang berhak (Juara Utama 1 / Juara Umum diambil dari hasil
          Penghargaan; Peserta lainnya = semua tim yang belum punya voucher). Periksa centangnya, lalu buat. Urutan
          disarankan: Juara Utama 1 → Juara Umum → Peserta lainnya. Tim juara ganda otomatis mendapat yang terbesar.
        </span>
        )}
        {!manual && seriJuara.length > 0 && (
          <span className="basis-full text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            ⚠ Nilai SERI pada {seriJuara.join(", ")} — juara belum pasti, putuskan dulu di Penghargaan sesuai juklak
            lalu centang tim yang benar secara manual.
          </span>
        )}
      </div>
      <FieldPotongan key={`potongan-${preset}`} awal={awal} />
      <div className="flex flex-col gap-1 sm:col-span-2">
        <label className={labelCls}>Keterangan (opsional, mis. &quot;Juara Utama 1 SMP&quot;)</label>
        <input key={`ket-${preset}`} name="keterangan" maxLength={200} defaultValue={awal?.keterangan} className={inputCls} />
      </div>
      <div className="flex flex-col gap-2 justify-end pb-1 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="aktif" /> Langsung aktif
        </label>
      </div>

      <div className="sm:col-span-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-semibold">
            Pilih tim ({dipilih.size} dipilih
            {Object.keys(perJenjang).length > 0 &&
              ` — ${Object.entries(perJenjang)
                .map(([j, n]) => `${j}: ${n}`)
                .join(", ")}`}
            )
          </span>
          <label className="flex items-center gap-1 text-gray-600">
            <input type="checkbox" checked={hanyaKonfirmasi} onChange={(e) => setHanyaKonfirmasi(e.target.checked)} />
            Hanya tim terkonfirmasi
          </label>
          <button type="button" className="text-primary-600 underline" onClick={() => setDipilih(new Set(bisaDipilih.map((t) => t.id)))}>
            Pilih semua
          </button>
          <button type="button" className="text-gray-500 underline" onClick={() => setDipilih(new Set())}>
            Kosongkan
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama tim / sekolah..."
            className={cn(inputCls, "flex-1 min-w-[180px]")}
          />
          <select value={filterJenjang} onChange={(e) => setFilterJenjang(e.target.value)} className={inputCls}>
            <option value="">Semua jenjang</option>
            {JENJANG.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
        </div>
        {awal?.perJenjang && jenjangGanda.length > 0 && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Preset {awal.label.split(" — ")[0]} biasanya 1 tim per jenjang, tapi jenjang {jenjangGanda.join(", ")}{" "}
            dipilih lebih dari satu tim. Periksa lagi sebelum membuat voucher.
          </p>
        )}
        <div className="max-h-72 overflow-y-auto border border-neutral-200 rounded-lg divide-y">
          {tampil.length === 0 && (
            <p className="p-3 text-sm text-gray-500">{tims.length === 0 ? "Belum ada tim." : "Tidak ada tim yang cocok."}</p>
          )}
          {tampil.map((t) => (
            <label
              key={t.id}
              className={cn("flex items-center gap-3 px-3 py-2 text-sm", t.voucher?.terpakai ? "text-gray-400" : "hover:bg-neutral-50 cursor-pointer")}
            >
              <input type="checkbox" disabled={!!t.voucher?.terpakai} checked={dipilih.has(t.id)} onChange={() => toggle(t.id)} />
              <span className="w-14 shrink-0 text-xs font-semibold">{t.jenjang}</span>
              <span className="flex-1 min-w-0 truncate">
                {t.nama_tim} — {t.asal_sekolah}
              </span>
              {!manual && t.peringkat != null && (
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full shrink-0",
                    t.peringkat <= 3 ? "bg-yellow-100 text-yellow-800" : "bg-neutral-100 text-gray-500"
                  )}
                >
                  Peringkat {t.peringkat}
                </span>
              )}
              {!manual && t.juara.includes("UTAMA") && (
                <span className="text-xs px-2 py-0.5 rounded-full shrink-0 bg-amber-200 text-amber-900 font-semibold">🏆 Juara Utama 1</span>
              )}
              {!manual && t.juara.includes("UMUM") && (
                <span className="text-xs px-2 py-0.5 rounded-full shrink-0 bg-amber-200 text-amber-900 font-semibold">🏆 Juara Umum</span>
              )}
              {t.voucher && (
                <span className="text-xs shrink-0">
                  {t.voucher.terpakai ? "voucher sudah terpakai" : `punya voucher ${labelNilai(t.voucher)}`}
                </span>
              )}
            </label>
          ))}
        </div>
      </div>
      <div className="sm:col-span-3 flex justify-end">
        <button
          disabled={loading || dipilih.size === 0}
          className="bg-primary-500 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? "Membuat..." : `Buat ${dipilih.size} Voucher`}
        </button>
      </div>
    </form>
  );
}

function DaftarVoucher({ vouchers }: { vouchers: Voucher[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"umum" | "pribadi">("umum");
  const [cari, setCari] = useState("");

  const daftar = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return vouchers
      .filter((v) => (tab === "pribadi" ? v.pribadi : !v.pribadi))
      .filter(
        (v) =>
          !q ||
          v.kode.toLowerCase().includes(q) ||
          (v.asalSekolah ?? "").toLowerCase().includes(q) ||
          (v.sumberTim ?? "").toLowerCase().includes(q) ||
          (v.keterangan ?? "").toLowerCase().includes(q)
      );
  }, [vouchers, tab, cari]);

  async function ubahAktif(ids: string[], aktif: boolean) {
    const r = await setAktifVoucher(ids, aktif);
    if (!r.success) return toast.error(r.message ?? "Gagal");
    toast.success(r.message ?? "Tersimpan");
    router.refresh();
  }

  async function hapus(v: Voucher) {
    if (!confirm(`Hapus voucher ${v.kode}?`)) return;
    const r = await hapusVoucher(v.id);
    if (!r.success) return toast.error(r.message ?? "Gagal menghapus");
    toast.success("Voucher dihapus");
    router.refresh();
  }

  async function hapusMassal(ids: string[]) {
    const ketik = prompt(
      `Hapus ${ids.length} voucher yang tampil? Tidak bisa dibatalkan.\nKetik HAPUS untuk melanjutkan.`
    );
    if (ketik?.trim().toUpperCase() !== "HAPUS") return;
    const r = await hapusVoucherMassal(ids);
    if (!r.success) return toast.error(r.message ?? "Gagal menghapus");
    toast.success(r.message ?? "Voucher dihapus");
    router.refresh();
  }

  async function ubahSekolah(v: Voucher) {
    const nama = prompt(`Nama sekolah untuk voucher ${v.kode}:`, v.asalSekolah ?? "");
    if (nama == null || nama.trim() === (v.asalSekolah ?? "")) return;
    const r = await ubahSekolahVoucher(v.id, nama);
    if (!r.success) {
      toast.error(r.message ?? "Gagal");
      return;
    }
    toast.success(r.message ?? "Tersimpan");
    router.refresh();
  }

  const [mengirim, setMengirim] = useState(false);
  async function kirimEmail(ids: string[]) {
    if (!confirm(`Kirim kode voucher ke ${ids.length} email penerima?`)) return;
    setMengirim(true);
    const toastId = toast.loading("Mengirim email...");
    const r = await kirimEmailVoucher(ids);
    setMengirim(false);
    if (r.success) toast.success(r.message ?? "Terkirim", { id: toastId });
    else toast.error(r.message ?? "Gagal mengirim", { id: toastId });
    router.refresh();
  }

  function salinCsv() {
    const baris = [
      ["Kode", "Penerima", "Email", "No. Telp", "Asal Sekolah", "Potongan", "Status", "Terpakai"],
      ...daftar.map((v) => [
        v.kode,
        v.sumberTim ?? "",
        v.penerimaEmail ?? "",
        v.penerimaTelp ?? "",
        v.asalSekolah ?? "",
        labelNilai(v),
        v.aktif ? "Aktif" : "Nonaktif",
        `${v.terpakai}${v.kuota != null ? `/${v.kuota}` : ""}`,
      ]),
    ];
    navigator.clipboard
      .writeText(baris.map((b) => b.join("\t")).join("\n"))
      .then(() => toast.success("Disalin — tempel ke spreadsheet"))
      .catch(() => toast.error("Gagal menyalin"));
  }

  const nonaktif = daftar.filter((v) => !v.aktif).map((v) => v.id);
  const aktif = daftar.filter((v) => v.aktif).map((v) => v.id);
  const bisaDihapus = daftar.filter((v) => v.dirujukPembayaran === 0).map((v) => v.id);
  const belumEmail = daftar.filter((v) => v.pribadi && v.penerimaEmail && !v.emailTerkirimAt).map((v) => v.id);

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["umum", "pribadi"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-semibold",
              tab === t ? "bg-primary-500 text-white" : "bg-neutral-100 text-gray-600"
            )}
          >
            {t === "umum" ? "Kode Umum" : "Voucher Pribadi"} ({vouchers.filter((v) => (t === "pribadi") === v.pribadi).length})
          </button>
        ))}
        <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari kode / sekolah / tim" className={cn(inputCls, "ml-auto w-full sm:w-64")} />
      </div>

      {daftar.length > 0 && (
        <div className="flex flex-wrap gap-2 text-sm">
          {nonaktif.length > 0 && (
            <button onClick={() => ubahAktif(nonaktif, true)} className="px-3 py-1.5 rounded-lg bg-green-600 text-white">
              Aktifkan {nonaktif.length} voucher yang tampil
            </button>
          )}
          {aktif.length > 0 && (
            <button onClick={() => ubahAktif(aktif, false)} className="px-3 py-1.5 rounded-lg border border-neutral-300">
              Nonaktifkan {aktif.length} voucher yang tampil
            </button>
          )}
          {belumEmail.length > 0 && (
            <button
              onClick={() => kirimEmail(belumEmail)}
              disabled={mengirim}
              className="px-3 py-1.5 rounded-lg bg-primary-500 text-white disabled:opacity-50"
            >
              Kirim kode via email ke {belumEmail.length} penerima yang belum dikirimi
            </button>
          )}
          <button onClick={salinCsv} className="px-3 py-1.5 rounded-lg border border-neutral-300">
            Salin daftar
          </button>
          {bisaDihapus.length > 0 && (
            <button
              onClick={() => hapusMassal(bisaDihapus)}
              className="px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 sm:ml-auto"
              title="Pakai kotak cari untuk menyaring dulu; voucher yang sudah dipakai tim tidak ikut terhapus"
            >
              Hapus {bisaDihapus.length} voucher yang tampil
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b">
              <th className="py-2 pr-3">Kode</th>
              <th className="py-2 pr-3">Potongan</th>
              <th className="py-2 pr-3">Syarat</th>
              <th className="py-2 pr-3">Terpakai</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {daftar.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-500">
                  Belum ada voucher.
                </td>
              </tr>
            )}
            {daftar.map((v) => (
              <tr key={v.id} className="border-b last:border-0 align-top">
                <td className="py-2 pr-3">
                  <div className="font-mono font-bold">{v.kode}</div>
                  {v.sumberTim && <div className="text-xs text-gray-500">untuk {v.sumberTim}</div>}
                  {v.pribadi && (
                    <div className="text-xs text-gray-400">
                      {[v.penerimaEmail, v.penerimaTelp].filter(Boolean).join(" · ") || "tanpa kontak"}
                      {v.penerimaEmail && (
                        <span className={v.emailTerkirimAt ? "text-green-600" : "text-amber-600"}>
                          {" "}
                          · {v.emailTerkirimAt ? "email terkirim" : "email belum dikirim"}
                        </span>
                      )}
                    </div>
                  )}
                  {v.keterangan && <div className="text-xs text-gray-400">{v.keterangan}</div>}
                </td>
                <td className="py-2 pr-3 whitespace-nowrap">{labelNilai(v)}</td>
                <td className="py-2 pr-3 text-xs text-gray-600">
                  <div>{v.jenjang ? `Jenjang ${v.jenjang}` : "Semua jenjang"}</div>
                  <div>
                    {v.asalSekolah ? `Khusus ${v.asalSekolah}` : "Semua sekolah"}{" "}
                    {v.asalSekolah && (
                      <button onClick={() => ubahSekolah(v)} className="text-primary-600 hover:underline">
                        ubah
                      </button>
                    )}
                  </div>
                </td>
                <td className="py-2 pr-3" title={v.dipakaiOleh.join("\n")}>
                  {v.terpakai}
                  {v.kuota != null ? ` / ${v.kuota}` : ""}
                  {v.dipakaiOleh.length > 0 && <div className="text-xs text-gray-500 max-w-[200px] truncate">{v.dipakaiOleh[0]}</div>}
                </td>
                <td className="py-2 pr-3">
                  <button
                    onClick={() => ubahAktif([v.id], !v.aktif)}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-semibold",
                      v.aktif ? "bg-green-100 text-green-700" : "bg-neutral-200 text-gray-600"
                    )}
                    title="Klik untuk mengubah"
                  >
                    {v.aktif ? "Aktif" : "Nonaktif"}
                  </button>
                </td>
                <td className="py-2 text-right">
                  {v.dirujukPembayaran === 0 && (
                    <button onClick={() => hapus(v)} className="text-xs text-red-600 hover:underline">
                      Hapus
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function VoucherClient({
  vouchers,
  tims,
  seriJuara,
}: {
  vouchers: Voucher[];
  tims: Tim[];
  seriJuara: string[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <DaftarVoucher vouchers={vouchers} />
      <FormVoucherUmum />
      <FormVoucherMassal tims={tims} seriJuara={seriJuara} />
    </div>
  );
}
