"use client";

import submitFormRegistrasi, { reserveKodePendaftaran } from "@/actions/registrationForm";
import TextField from "@/app/components/global/Input";
import SubmitButton from "@/app/components/global/SubmitButton";
import { H2, H3, P } from "@/app/components/global/Text";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Select from "react-select";
import { toast } from "sonner";

// Jenjang mana yang ditampilkan diatur admin lewat toggle "Jenjang Aktif" di
// /admin/pengaturan (KonfigUmum.sdAktif/smpAktif/smaAktif/purnaAktif) —
// konsisten dengan Kategori.tsx di landing page.
const ALL_JENJANG = [
  { label: "SD/Sederajat", value: "SD", aktifKey: "sdAktif" },
  { label: "SMP/Sederajat", value: "SMP", aktifKey: "smpAktif" },
  { label: "SMA/Sederajat", value: "SMA", aktifKey: "smaAktif" },
  { label: "Purna", value: "PURNA", aktifKey: "purnaAktif" },
] as const;

const size = [
  { label: "12 Pasukan", value: "SMALL" },
  { label: "15 Pasukan", value: "NORMAL" },
];

const paymentType = [
  { label: "DP 50%", value: "TRUE" },
  { label: "Full", value: "FALSE" },
];

type KonfigUmum = {
  biayaSD: number;
  biayaSDDP: number;
  biayaSMP: number;
  biayaSMPDP: number;
  biayaSMA: number;
  biayaSMADP: number;
  biayaPurna: number;
  biayaPurnaDP: number;
  sdAktif: boolean;
  smpAktif: boolean;
  smaAktif: boolean;
  purnaAktif: boolean;
  bankNama: string | null;
  bankNoRek: string | null;
  bankAtasNama: string | null;
};

// Format sama dengan formatRupiah di VoteForm.tsx/BeliTiketForm.tsx dkk —
// "Rp375.000" tanpa ",00" manual, biar konsisten di seluruh halaman publik.
function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

export default function FormComponent({
  konfigUmum,
  daftarSekolah,
}: {
  konfigUmum: KonfigUmum;
  daftarSekolah: string[];
}) {
  const [tipeValue, setTipeValue] = useState<"TRUE" | "FALSE" | null>(null);
  const [selectedJenjang, setSelectedJenjang] = useState<string | null>(null);
  const [reserved, setReserved] = useState<{ kodeUnik: string; hargaDasar: number; totalBayar: number } | null>(null);
  const [loadingReserve, setLoadingReserve] = useState(false);
  const router = useRouter();

  const jenjangOptions = ALL_JENJANG.filter((j) => konfigUmum[j.aktifKey]).map((j) => ({
    label: j.label,
    value: j.value,
  }));

  // Kode unik dicadangkan begitu jenjang & tipe pembayaran sudah dipilih
  // keduanya — supaya nominal (biaya + kode unik) sudah pasti SEBELUM user
  // transfer, konsisten dengan pola reserveKodeVoting di halaman Vote.
  useEffect(() => {
    if (!selectedJenjang || !tipeValue) {
      setReserved(null);
      return;
    }
    let cancelled = false;
    setLoadingReserve(true);
    reserveKodePendaftaran(selectedJenjang as any, tipeValue === "TRUE").then((result) => {
      if (cancelled) return;
      setLoadingReserve(false);
      if (result.success) {
        setReserved({ kodeUnik: result.kodeUnik!, hargaDasar: result.hargaDasar!, totalBayar: result.totalBayar! });
      } else {
        toast.error(result.message ?? "Gagal menyiapkan kode pembayaran");
        setReserved(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedJenjang, tipeValue]);

  async function submitForm(data: FormData) {
    const toastId = toast.loading("Membuat tim....");
    const result = await submitFormRegistrasi(data);

    if (result.success) {
      toast.success(result.message, { id: toastId });
      router.refresh();
    } else {
      toast.error(result.message, { id: toastId });
      if (result.message?.includes("pilih ulang jenjang")) setReserved(null);
    }
  }

  const selectClassNames = {
    placeholder: () => "text-[#C8C8C8]",
    control: () =>
      "rounded-[14px] border focus:bg-[#F1F6F9] border-neutral-400 px-[18px] active:border-black hover:border-black py-[14px] text-black placeholder-neutral-500 bg-white focus:outline-none transition-all duration-500 placeholder:text-[#C8C8C8]",
    menu: () =>
      "bg-white rounded-lg px-[18px] py-[14px] border border-neutral-400",
    multiValue: () => "bg-primary-400 px-4 py-2 text-white rounded-2xl",
    valueContainer: () => "flex gap-2",
    menuList: () => "text-base flex flex-col gap-1",
    option: () =>
      "hover:bg-neutral-300 hover:cursor-pointer transition-all duration-500 rounded-lg p-2",
    input: () => "focus:bg-[#F1F6F9]",
  };

  return (
    <form className="mx-6 sm:mx-[100px] my-[24px]" action={submitForm}>
      <H2>Form Pendaftaran</H2>
      <div className="flex flex-col gap-4 mt-4">
        <TextField
          id="nama-tim"
          name="namatim"
          placeholder="Masukkan nama Tim"
          type="text"
          className="w-full"
          label="Nama Tim"
          required
        />
        <TextField
          id="nama-pelatih"
          name="pelatih"
          placeholder="Masukkan nama Pelatih"
          type="text"
          className="w-full"
          label="Nama Pelatih"
          required
        />
        <TextField
          id="no-pelatih"
          name="no-pelatih"
          placeholder="Masukkan Nomor Telepon Pelatih"
          type="text"
          className="w-full"
          label="No.Telp Pelatih"
          required
        />
        <TextField
          id="sekolah"
          name="asal"
          placeholder="Masukkan nama Sekolah"
          type="text"
          className="w-full"
          label="Asal Sekolah"
          list="daftar-sekolah"
          required
        />
        {/* Autocomplete dari nama sekolah yang sudah pernah dipakai tim lain —
            supaya PIC berbeda dari sekolah yang sama tidak mengetik nama yang
            beda-beda. Tetap teks bebas, sekolah baru tetap bisa mengetik nama sendiri. */}
        <datalist id="daftar-sekolah">
          {daftarSekolah.map((nama) => (
            <option key={nama} value={nama} />
          ))}
        </datalist>
        <div className="flex flex-col gap-2">
          <label htmlFor={"jenjang"} className="text-[16px]">
            Jenjang
          </label>
          <Select
            name="jenjang"
            unstyled
            required
            options={jenjangOptions}
            id="jenjang"
            placeholder="Pilih Jenjang"
            onChange={(e) => setSelectedJenjang(e?.value ?? null)}
            classNames={selectClassNames}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={"size"} className="text-[16px]">
            Jumlah Pasukan
          </label>
          <Select
            name="size"
            unstyled
            required
            options={size}
            id="size"
            placeholder="Pilih Jumlah Pasukan"
            classNames={selectClassNames}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={"tipe"} className="text-[16px]">
            Tipe Pembayaran
          </label>
          <Select
            name="tipe-pembayaran"
            unstyled
            required
            onChange={(e) => setTipeValue((e?.value as "TRUE" | "FALSE") ?? null)}
            options={paymentType}
            id="tipe"
            placeholder="Pilih Tipe Pembayaran"
            classNames={selectClassNames}
          />
        </div>
        <input type="hidden" name="kodeUnik" value={reserved?.kodeUnik ?? ""} />
        <div>
          <div>
            <H3>Pembayaran</H3>
            {!selectedJenjang || !tipeValue ? (
              <P>Pilih jenjang & tipe pembayaran dulu untuk melihat nominal yang harus ditransfer.</P>
            ) : loadingReserve ? (
              <P>Menyiapkan kode pembayaran...</P>
            ) : reserved ? (
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 my-2">
                <P>
                  Transfer <span className="text-black font-bold">tepat</span> sejumlah:
                </P>
                <p className="text-black font-extrabold text-2xl mt-1">{formatRupiah(reserved.totalBayar)}</p>
                <P className="text-xs text-gray-400 mt-1">
                  {formatRupiah(reserved.hargaDasar)} biaya pendaftaran + kode unik {reserved.kodeUnik}
                </P>
                <P className="text-xs text-gray-400">
                  Nominal harus persis (termasuk 3 digit kode unik) supaya pembayaran gampang dicocokkan bendahara.
                </P>
              </div>
            ) : (
              <P className="text-red-500">Gagal menyiapkan kode pembayaran, coba pilih ulang jenjang/tipe pembayaran.</P>
            )}
            <P>ke:</P>
            {konfigUmum.bankNoRek || konfigUmum.bankNama || konfigUmum.bankAtasNama ? (
              <P className="text-black">
                {konfigUmum.bankNoRek} <br />
                {konfigUmum.bankNama} <br /> a.n {konfigUmum.bankAtasNama}
              </P>
            ) : (
              <P className="text-black">
                Rekening pembayaran belum diatur, hubungi panitia sebelum transfer.
              </P>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="bukti" className="text-[16px]">
              Bukti Transfer
            </label>
            <input
              id="bukti"
              type="file"
              className="border border-neutral-200 py-4 px-3 rounded-xl file:bg-primary-500 file:text-white file:rounded-md file:border-none file:py-1 file:hover:bg-opacity-85 file:transition-all file:duration-300 hover:cursor-pointer file:hover:cursor-pointer"
              title="Pilih bukti transfer"
              accept="image/*"
              name="bukti"
              placeholder="Pilih bukti transfer"
              required
            />
          </div>
          <TextField
            id="bank"
            name="namabank"
            placeholder="Masukkan nama Bank Pengirim Ex: BCA"
            type="text"
            className="w-full"
            label="Nama Bank Pengirim"
            required
          />
          <TextField
            id="namarek"
            name="namarek"
            placeholder="Masukkan nama pemilik rekening"
            type="text"
            className="w-full"
            label="Nama pemilik rekening"
            required
          />
        </div>
      </div>
      <div className="w-full justify-end flex mt-4">
        <SubmitButton text="Kirim" className="float-end mt-4" />
      </div>
    </form>
  );
}
