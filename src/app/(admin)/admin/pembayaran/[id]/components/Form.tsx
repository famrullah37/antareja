"use client";

import konfirmasiPembayaran, { generateKuitansiManual, konfirmasiPelunasan } from "@/actions/pembayaran";
import { H1, P } from "@/app/components/global/Text";
import { TimWithPembayaran } from "@/types/entityRelations";
import Image from "next/image";
import { redirect, useRouter } from "next/navigation";
import { useState } from "react";
import Select from "react-select";
import { toast } from "sonner";
import SubmitButton from "./parts/Button";

function formatRupiah(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export default function PembayaranForm({
  data,
  id,
  biayaDasar,
  voucher,
}: {
  data?: TimWithPembayaran;
  id?: string;
  biayaDasar: number;
  voucher?: { kode: string; potongan: number } | null;
}) {
  // Nominal yang seharusnya masuk = total transfer yang dicadangkan saat daftar
  // (biaya saat itu + kode unik). Tim lama tanpa total: pakai biaya jenjang saat ini.
  const kodeUnik = data?.pembayaran?.kodeUnik ?? null;
  const totalBayar = data?.pembayaran?.totalBayar ?? null;
  const biayaSaatDaftar = totalBayar != null && kodeUnik ? totalBayar - parseInt(kodeUnik, 10) : biayaDasar;
  const [generating, setGenerating] = useState(false);
  const [melunasi, setMelunasi] = useState(false);
  const router = useRouter();
  const p = data?.pembayaran;

  async function handleKonfirmasiPelunasan() {
    if (!data?.id) return;
    const pesan = p?.pelunasanBukti
      ? `Konfirmasi pelunasan tim "${data.nama_tim}"?

Pastikan ${p.pelunasanTotal != null ? formatRupiah(p.pelunasanTotal) : "dana pelunasan"} sudah masuk di mutasi rekening. Status berubah jadi LUNAS, kas mencatat pelunasan, dan kuitansi lunas dikirim ke email tim.`
      : `Tim "${data?.nama_tim}" BELUM mengunggah bukti pelunasan.

Tetap konfirmasi (mis. dibayar tunai / sudah dicek di mutasi)?`;
    if (!confirm(pesan)) return;
    setMelunasi(true);
    const toastId = toast.loading("Mengkonfirmasi pelunasan & mengirim kuitansi lunas...");
    const result = await konfirmasiPelunasan(data.id);
    setMelunasi(false);
    if (result.success) {
      toast.success(result.message ?? "Pelunasan terkonfirmasi & kuitansi lunas terkirim!", { id: toastId, duration: result.message ? 8000 : 4000 });
      router.refresh();
    } else toast.error(result.message ?? "Gagal konfirmasi pelunasan", { id: toastId });
  }

  async function handleGenerateKuitansi() {
    if (!data?.id) return;
    setGenerating(true);
    const toastId = toast.loading("Membuat kuitansi & mengirim email...");
    const result = await generateKuitansiManual(data.id);
    setGenerating(false);
    if (result.success)
      toast.success(
        result.message ? `Kuitansi terkirim ke email. Catatan: ${result.message}` : "Kuitansi berhasil dibuat & dikirim!",
        { id: toastId, duration: result.message ? 8000 : 4000 }
      );
    else toast.error(result.message ?? "Gagal generate kuitansi", { id: toastId });
  }

  const options = [
    { label: "Terkonfirmasi", value: true },
    { label: "Belum Terkonfirmasi", value: false },
  ];

  const optionsPembayaran = [
    { label: "Lunas", value: "false" },
    { label: "DP 50%", value: "true" },
  ];

  async function Update(dataForm: FormData) {
    const jadiLunas = p?.isDP && dataForm.get("isDP") === "false";
    const jadiDP = p && !p.isDP && dataForm.get("isDP") === "true";
    // DP → Lunas lewat dropdown melewati pengecekan nominal & bukti; arahkan ke
    // tombol Konfirmasi Pelunasan (kasus Tim Gemilang: dilunaskan padahal dana belum masuk).
    if (
      jadiLunas &&
      !confirm(
        "Mengubah DP → Lunas berarti dana PELUNASAN SUDAH MASUK ke rekening.\n\n" +
          "Disarankan pakai tombol \"Konfirmasi Pelunasan\" di atas (menampilkan nominal & bukti, dan langsung mengirim kuitansi lunas).\n\n" +
          "Sudah cek mutasi rekening dan tetap lanjut?"
      )
    )
      return;
    if (
      jadiDP &&
      !confirm(
        "Mengembalikan Lunas → DP: kas TIDAK berubah otomatis. Kalau pelunasan sudah tercatat di kas padahal dananya belum masuk, catat koreksi manual di Kas & Laporan.\n\n" +
          "Setelah disimpan, klik \"Generate Ulang Kuitansi\" supaya tim menerima kuitansi DP pengganti, dan kabari tim bahwa kuitansi lunas sebelumnya batal.\n\nLanjut?"
      )
    )
      return;
    const toastId = toast.loading("Loading...");
    const result = await konfirmasiPembayaran(dataForm, data?.id!);
    if (!result.success) {
      toast.error(result.message, { id: toastId });
    } else {
      toast.success(result.message, { id: toastId });
      redirect("/admin/pembayaran");
    }
  }

  return (
    <form action={Update} className="sm:pb-0 pb-6">
      <div className="flex flex-col gap-5">
        <H1>
          {data?.nama_tim}
          {" - "}
          {data?.asal_sekolah}
        </H1>
        <div className="rounded-xl h-[400px] w-[250px] overflow-hidden">
          <Image
            src={data?.pembayaran?.bukti_tf!}
            height={400}
            width={250}
            alt={data?.nama_tim!}
            unoptimized
            className="object-cover"
          />
        </div>
        <div>
          <P className="font-bold text-black">
            <span className="font-normal">Yang harus dibayarkan ({data?.pembayaran?.isDP ? "DP 50%" : "Lunas"}): </span>
            {formatRupiah(totalBayar ?? biayaDasar)}
            {totalBayar != null && kodeUnik && (
              <span className="font-normal">
                {" "}(biaya {formatRupiah(biayaSaatDaftar)} + kode unik #{kodeUnik})
              </span>
            )}
          </P>
          {voucher && (
            <P className="font-bold text-black">
              <span className="font-normal">Voucher: </span>
              <span className="font-mono">{voucher.kode}</span>
              <span className="font-normal"> — potongan {formatRupiah(voucher.potongan)} dari biaya lunas</span>
            </P>
          )}
          <P className="font-bold text-black">
            <span className="font-normal">Nama Rekening Pengirim: </span>
            {data?.pembayaran?.nama_rek}
          </P>
          <P className="font-bold text-black">
            <span className="font-normal">Bank Pengirim: </span>
            {data?.pembayaran?.bank}
          </P>
        </div>

        {data?.confirmed && (p?.isDP || p?.pelunasanBukti) && (
          <div
            className={`flex flex-col gap-2 rounded-xl p-4 border ${p?.isDP ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"}`}
          >
            <P className="font-bold text-black">{p?.isDP ? "Pelunasan DP" : "Pelunasan DP — sudah lunas"}</P>
            {p?.pelunasanKodeUnik && p.pelunasanTotal != null ? (
              <P className="text-sm text-black">
                Yang harus ditransfer: <span className="font-bold">{formatRupiah(p.pelunasanTotal)}</span> (sisa{" "}
                {formatRupiah(p.pelunasanTotal - parseInt(p.pelunasanKodeUnik, 10))} + kode unik #{p.pelunasanKodeUnik})
              </P>
            ) : (
              <P className="text-sm text-gray-500">
                Nominal pelunasan belum dibuat — muncul otomatis begitu tim membuka dashboard-nya.
              </P>
            )}
            {p?.pelunasanBukti ? (
              <>
                <P className="text-sm text-black">
                  Bukti diunggah{p.pelunasanAt ? ` ${new Date(p.pelunasanAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}` : ""}
                  {p.pelunasanBank ? ` · ${p.pelunasanBank} a.n. ${p.pelunasanNamaRek}` : ""}
                </P>
                <a href={p.pelunasanBukti} target="_blank" rel="noreferrer" className="rounded-xl h-[400px] w-[250px] overflow-hidden block">
                  <Image src={p.pelunasanBukti} height={400} width={250} alt="Bukti pelunasan" unoptimized className="object-cover" />
                </a>
              </>
            ) : (
              p?.isDP && <P className="text-sm text-gray-500">Tim belum mengunggah bukti pelunasan.</P>
            )}
            {p?.isDP && (
              <button
                type="button"
                onClick={handleKonfirmasiPelunasan}
                disabled={melunasi}
                className="self-start bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors w-fit"
              >
                {melunasi ? "Memproses..." : "Konfirmasi Pelunasan"}
              </button>
            )}
          </div>
        )}

        {data?.confirmed && (
          <div className="flex flex-col gap-2 bg-neutral-50 border border-neutral-200 rounded-xl p-4">
            <P className="font-bold text-black">Kuitansi</P>
            {data?.pembayaran?.nomorKuitansi && (
              <P className="text-sm text-black">
                No. Kuitansi: <span className="font-bold">{data.pembayaran.nomorKuitansi}</span>
                {data.pembayaran.kuitansiIsDP ? " (sementara — DP)" : ""}
              </P>
            )}
            {data?.pembayaran?.kuitansiUrl ? (
              <a
                href={data.pembayaran.kuitansiUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary-600 hover:underline text-sm w-fit"
              >
                Lihat kuitansi saat ini
              </a>
            ) : (
              <P className="text-sm text-gray-400">Belum ada kuitansi.</P>
            )}
            <button
              type="button"
              onClick={handleGenerateKuitansi}
              disabled={generating}
              className="self-start bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors w-fit"
            >
              {generating ? "Memproses..." : "Generate Ulang Kuitansi"}
            </button>
            <P className="text-xs text-gray-400">
              Pakai ini setelah ubah Status Pembayaran (mis. DP → Lunas untuk pelunasan) supaya kuitansi &
              email terbaru terkirim ulang dengan nominal yang sudah sesuai. Simpan dulu perubahan Status
              Pembayaran di bawah sebelum generate ulang.
            </P>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor={"confirm"} className="text-[16px]">
            Status
          </label>
          <Select
            name="confirm"
            unstyled
            defaultValue={{
              label: data?.confirmed ? "Terkonfirmasi" : "Belum Terkonfirmasi",
              value: data?.confirmed,
            }}
            options={options}
            id="confirm"
            placeholder="Konfirmasi/Belum"
            classNames={{
              control: () =>
                "rounded-[14px] border focus:bg-[#F1F6F9] border-neutral-400 px-[18px] active:border-black hover:border-black py-[14px] text-black placeholder-neutral-500 bg-white focus:outline-none transition-all duration-500 placeholder:text-[#C8C8C8]",
              menu: () =>
                "bg-white rounded-lg px-[18px] py-[14px] border border-neutral-400",
              multiValue: () =>
                "bg-primary-400 px-4 py-2 text-white rounded-2xl",
              valueContainer: () => "flex gap-2",
              menuList: () => "text-base flex flex-col gap-1",
              option: () =>
                "hover:bg-neutral-300 hover:cursor-pointer transition-all duration-500 rounded-lg p-2",
              input: () => "focus:bg-[#F1F6F9]",
            }}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={"isDP"} className="text-[16px]">
            Status Pembayaran
          </label>
          <Select
            name="isDP"
            unstyled
            defaultValue={{
              label: data?.pembayaran?.isDP ? "DP 50%" : "Lunas",
              value: data?.pembayaran?.isDP ? "true" : "false",
            }}
            options={optionsPembayaran}
            id="isDP"
            placeholder="Lunas/DP"
            classNames={{
              control: () =>
                "rounded-[14px] border focus:bg-[#F1F6F9] border-neutral-400 px-[18px] active:border-black hover:border-black py-[14px] text-black placeholder-neutral-500 bg-white focus:outline-none transition-all duration-500 placeholder:text-[#C8C8C8]",
              menu: () =>
                "bg-white rounded-lg px-[18px] py-[14px] border border-neutral-400",
              multiValue: () =>
                "bg-primary-400 px-4 py-2 text-white rounded-2xl",
              valueContainer: () => "flex gap-2",
              menuList: () => "text-base flex flex-col gap-1",
              option: () =>
                "hover:bg-neutral-300 hover:cursor-pointer transition-all duration-500 rounded-lg p-2",
              input: () => "focus:bg-[#F1F6F9]",
            }}
          />
        </div>
      </div>
      <div className="w-full justify-end flex my-6">
        <SubmitButton />
      </div>
    </form>
  );
}
