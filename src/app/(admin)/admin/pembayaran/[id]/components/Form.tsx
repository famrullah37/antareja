"use client";

import konfirmasiPembayaran, { generateKuitansiManual } from "@/actions/pembayaran";
import { H1, P } from "@/app/components/global/Text";
import { TimWithPembayaran } from "@/types/entityRelations";
import Image from "next/image";
import { redirect } from "next/navigation";
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
}: {
  data?: TimWithPembayaran;
  id?: string;
  biayaDasar: number;
}) {
  // Nominal yang seharusnya masuk = total transfer yang dicadangkan saat daftar
  // (biaya saat itu + kode unik). Tim lama tanpa total: pakai biaya jenjang saat ini.
  const kodeUnik = data?.pembayaran?.kodeUnik ?? null;
  const totalBayar = data?.pembayaran?.totalBayar ?? null;
  const biayaSaatDaftar = totalBayar != null && kodeUnik ? totalBayar - parseInt(kodeUnik, 10) : biayaDasar;
  const [generating, setGenerating] = useState(false);

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
          <P className="font-bold text-black">
            <span className="font-normal">Nama Rekening Pengirim: </span>
            {data?.pembayaran?.nama_rek}
          </P>
          <P className="font-bold text-black">
            <span className="font-normal">Bank Pengirim: </span>
            {data?.pembayaran?.bank}
          </P>
        </div>

        {data?.confirmed && (
          <div className="flex flex-col gap-2 bg-neutral-50 border border-neutral-200 rounded-xl p-4">
            <P className="font-bold text-black">Kuitansi</P>
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
