"use client";

import { H2, P } from "@/app/components/global/Text";
import SectionWrapper from "@/app/components/global/Wrapper";
import { kirimBuktiPelunasan } from "@/actions/Pelunasan";
import { compressFormDataImage } from "@/lib/compressImageClient";
import type { InfoPelunasan } from "@/lib/pelunasan";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const rp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

// Tagihan pelunasan untuk tim yang mendaftar dengan DP (sudah dikonfirmasi):
// nominal + kode unik, rekening tujuan, dan form unggah bukti transfer.
export default function PelunasanSection({
  info,
  rekening,
  terkirim,
}: {
  info: InfoPelunasan;
  rekening: { noRek?: string | null; bank?: string | null; atasNama?: string | null };
  terkirim: { bukti: string; bank: string | null; namaRek: string | null; at: string | null } | null;
}) {
  const router = useRouter();
  const [mengirim, setMengirim] = useState(false);
  const [unggahUlang, setUnggahUlang] = useState(false);

  async function submit(data: FormData) {
    setMengirim(true);
    const toastId = toast.loading("Mengirim bukti pelunasan...");
    await compressFormDataImage(data, "buktiPelunasan");
    const result = await kirimBuktiPelunasan(data);
    setMengirim(false);
    if (result.success) {
      toast.success("Bukti pelunasan terkirim! Menunggu verifikasi panitia.", { id: toastId, duration: 6000 });
      setUnggahUlang(false);
      router.refresh();
    } else toast.error(result.message ?? "Gagal mengirim bukti", { id: toastId });
  }

  const adaRekening = rekening.noRek || rekening.bank || rekening.atasNama;

  return (
    <SectionWrapper id="pelunasan">
      <H2 className="mb-2">Pelunasan Pendaftaran</H2>

      {terkirim && !unggahUlang ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800 flex flex-col gap-2">
          <p>
            Bukti pelunasan <b>{rp(info.total)}</b> sudah dikirim
            {terkirim.at ? ` pada ${new Date(terkirim.at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}` : ""}
            {terkirim.bank ? ` (${terkirim.bank} a.n. ${terkirim.namaRek})` : ""} dan sedang menunggu verifikasi panitia.
            Kuitansi lunas akan dikirim ke email setelah diverifikasi.
          </p>
          <div className="flex flex-wrap gap-4">
            <a href={terkirim.bukti} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">
              Lihat bukti yang dikirim
            </a>
            <button type="button" onClick={() => setUnggahUlang(true)} className="text-primary-600 hover:underline">
              Salah bukti? Unggah ulang
            </button>
          </div>
        </div>
      ) : (
        <form action={submit} className="flex flex-col gap-4">
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
            <P>
              Tim Anda terdaftar dengan <b>DP 50%</b>. Untuk melunasi, transfer <span className="text-black font-bold">tepat</span>{" "}
              sejumlah:
            </P>
            <p className="text-black font-extrabold text-2xl mt-1">{rp(info.total)}</p>
            <P className="text-xs text-gray-400 mt-1">
              {rp(info.sisa)} sisa pelunasan + kode unik {info.kodeUnik}. Nominal harus persis (termasuk 3 digit kode unik)
              supaya mudah dicocokkan bendahara.
            </P>
            <P className="mt-2">ke:</P>
            {adaRekening ? (
              <P className="text-black">
                {rekening.noRek} <br />
                {rekening.bank} <br /> a.n {rekening.atasNama}
              </P>
            ) : (
              <P className="text-black">Rekening pembayaran belum diatur, hubungi panitia sebelum transfer.</P>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2 text-[16px] sm:col-span-2">
              Bukti Transfer Pelunasan
              <input
                type="file"
                name="buktiPelunasan"
                accept="image/*"
                required
                className="border border-neutral-200 py-4 px-3 rounded-xl file:bg-primary-500 file:text-white file:rounded-md file:border-none file:py-1 hover:cursor-pointer file:hover:cursor-pointer"
              />
            </label>
            <label className="flex flex-col gap-2 text-[16px]">
              Nama Bank Pengirim
              <input
                name="bankPelunasan"
                required
                maxLength={100}
                defaultValue={terkirim?.bank ?? ""}
                placeholder="Ex: BCA"
                className="border border-neutral-400 rounded-[14px] px-[18px] py-[14px] focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-2 text-[16px]">
              Nama Pemilik Rekening
              <input
                name="namaRekPelunasan"
                required
                maxLength={100}
                defaultValue={terkirim?.namaRek ?? ""}
                className="border border-neutral-400 rounded-[14px] px-[18px] py-[14px] focus:outline-none"
              />
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={mengirim}
              className="bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              {mengirim ? "Mengirim..." : "Kirim Bukti Pelunasan"}
            </button>
            {unggahUlang && (
              <button
                type="button"
                onClick={() => setUnggahUlang(false)}
                disabled={mengirim}
                className="border border-neutral-300 hover:bg-neutral-100 text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                Batal
              </button>
            )}
          </div>
        </form>
      )}
    </SectionWrapper>
  );
}
