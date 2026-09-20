"use client";

import Image from "next/image";
import { ReactNode, useState } from "react";
import { H2, H3, P } from "@/app/components/global/Text";
import SectionWrapper from "@/app/components/global/Wrapper";
import { TimWithRelations } from "@/types/entityRelations";
import { AnggotaCard } from "./parts/AnggotaCard";
import cn from "@/lib/clsx";
import { initials } from "@/lib/initials";
import { updateTimForm } from "@/actions/Tim";
import TextField from "@/app/components/global/Input";
import Field from "../components/parts/input";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import SubmitButton from "@/app/components/global/SubmitButton";
import { downloadFormulir } from "./parts/downloadFormulir";

const rowsMapNormal = [
  ["b1s1", "b1s2", "b1s3"],
  ["b2s1", "b2s2", "b2s3"],
  ["b3s1", "b3s2", "b3s3"],
  ["b4s1", "b4s2", "b4s3"],
  ["b5s1", "b5s2", "b5s3"],
];
const rowsMapSmall = [
  ["b1s1", "b1s2", "b1s3"],
  ["b2s1", "b2s2", "b2s3"],
  ["b3s1", "b3s2", "b3s3"],
  ["b4s1", "b4s2", "b4s3"],
];
const sizeMap = {
  SMALL: 12,
  NORMAL: 15,
};

function AnggotaCardsWrapper({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <div className={cn("flex items-center justify-center gap-16 ", className)}>
      {children}
    </div>
  );
}

function TimLayout({ tim }: Readonly<{ tim: TimWithRelations }>) {
  const [anggotas] = useState(tim.anggotas);
  const [danton] = useState(
    tim.anggotas.find((value) => value.posisi === "DANTON")
  );
  const [official] = useState(
    tim.anggotas.find((value) => value.posisi === "OFFICIAL")
  );
  const [pelatih] = useState(
    tim.anggotas.find((value) => value.posisi === "PELATIH")
  );

  return (
    <div className="block">
      <H3
        className={`${anggotas.length !== sizeMap[tim.tipe_tim] ? "" : "mb-4"}`}
      >
        Anggota Tim ({sizeMap[tim.tipe_tim]} Pasukan + Danton + Official + Pelatih)
      </H3>
      {anggotas.length !== sizeMap[tim.tipe_tim] + 3 && (
        <P className="text-yellow-600 mb-4 animate-pulse">
          (Data belum lengkap)
        </P>
      )}
      <div className="py-16 px-10 bg-neutral-300 rounded-lg flex flex-col gap-12">
        <AnggotaCardsWrapper className="flex flex-wrap gap-10">
          <AnggotaCard
            href={`/dashboard/anggota/pelatih?timId=${tim.id}`}
            image={pelatih?.foto ?? "/placeholder-profile-picture.jpg"}
            name={tim.pelatih ?? "Belum diisi"}
            key={"pelatih"}
            posisi={pelatih?.posisi ?? "PELATIH"}
          />
          <AnggotaCard
            href={`/dashboard/anggota/danton?timId=${tim.id}`}
            image={danton?.foto ?? "/placeholder-profile-picture.jpg"}
            name={danton?.nama ?? "Belum diisi"}
            key={"danton"}
            posisi={danton?.posisi ?? "DANTON"}
          />
          <AnggotaCard
            href={`/dashboard/anggota/official?timId=${tim.id}`}
            image={official?.foto ?? "/placeholder-profile-picture.jpg"}
            name={official?.nama ?? "Belum diisi"}
            key={"official"}
            posisi={official?.posisi ?? "OFFICIAL"}
          />
        </AnggotaCardsWrapper>
        {tim.tipe_tim === "NORMAL"
          ? rowsMapNormal.map((row, i) => (
            <AnggotaCardsWrapper
              key={"n" + i}
              className="flex flex-wrap gap-10"
            >
              {row.map((pos, i) => {
                const anggotaInPos = anggotas.find(
                  (value) => value.posisi === pos.toUpperCase()
                );
                return (
                  <AnggotaCard
                    href={`/dashboard/anggota/${pos}?timId=${tim.id}`}
                    image={anggotaInPos?.foto ?? "/placeholder-profile-picture.jpg"}
                    name={anggotaInPos?.nama ?? "Belum diisi"}
                    posisi={"Posisi " + (anggotaInPos?.posisi ?? pos)}
                    key={anggotaInPos?.id ?? i}
                  />
                );
              })}
            </AnggotaCardsWrapper>
          ))
          : rowsMapSmall.map((row, i) => (
            <AnggotaCardsWrapper
              key={"s" + i}
              className="flex flex-wrap gap-10"
            >
              {row.map((pos, i) => {
                const anggotaInPos = anggotas.find(
                  (value) => value.posisi === pos.toUpperCase()
                );
                return (
                  <AnggotaCard
                    href={`/dashboard/anggota/${pos}?timId=${tim.id}`}
                    image={anggotaInPos?.foto ?? "/placeholder-profile-picture.jpg"}
                    name={anggotaInPos?.nama ?? "Belum diisi"}
                    posisi={anggotaInPos?.posisi ?? pos}
                    key={anggotaInPos?.id ?? i}
                  />
                );
              })}
            </AnggotaCardsWrapper>
          ))}
      </div>
    </div>
  );
}

export default function ProfileTim({
  tim,
  penilaian,
  biayaDasar,
}: {
  tim: TimWithRelations;
  penilaian?: any;
  biayaDasar?: number;
}) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const jumlahAnggotaLengkap = sizeMap[tim.tipe_tim] + 3;
  const dataLengkap = tim.anggotas.length === jumlahAnggotaLengkap;

  async function handleDownloadBerkas() {
    setDownloading(true);
    await downloadFormulir();
    setDownloading(false);
  }
  // Tim lama (daftar sebelum fitur kode unik) tidak punya totalBayar — mereka
  // transfer biaya dasar tanpa kode unik, jadi itu yang ditampilkan.
  const nominalTransfer = tim.pembayaran?.totalBayar ?? biayaDasar ?? null;

  async function submitForm(formData: FormData) {
    const toastId = toast.loading(
      !tim.link_video ? "Membuat link..." : "Memperbarui link..."
    );
    const result = await updateTimForm(tim.id, formData);

    if ("message" in result) {
      if (result.success) {
        toast.success(result.message, { id: toastId });
        router.refresh();
      } else {
        toast.error(result.message, { id: toastId });
      }
    } else {
      toast.error("An error occurred", { id: toastId });
    }
  }

  return (
    <SectionWrapper id="profile-tim">
      <H2 className="mb-2">Profil Tim Anda</H2>
      <div className="w-full bg-white rounded-lg p-5">
        {/* --- info tim --- */}
        <div className="flex flex-col gap-1 mb-4">
          <H3>Nama Tim</H3>
          <P>{tim.nama_tim}</P>
        </div>

        {tim.pembayaran && (
          <div className="flex flex-col gap-1 mb-4">
            <H3>Kuitansi Pembayaran</H3>
            {nominalTransfer !== null && (
              <P>
                Total Transfer: <span className="font-bold">Rp {nominalTransfer.toLocaleString("id-ID")}</span>
                {tim.pembayaran.kodeUnik && (
                  <>
                    {" "}(kode unik <span className="font-bold font-mono tracking-widest">#{tim.pembayaran.kodeUnik}</span>)
                  </>
                )}
                {` — ${tim.pembayaran.isDP ? "DP 50%" : "Lunas"}`}
              </P>
            )}
            {tim.pembayaran.kuitansiUrl && (
              <a
                href={tim.pembayaran.kuitansiUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary-600 hover:underline text-sm w-fit"
              >
                Download Kuitansi (PDF)
              </a>
            )}
          </div>
        )}

        {tim.confirmed ? (
          <form action={submitForm} className="mb-4">
            <H3 className="mb-4">Foto Tim</H3>
            <P className="text-sm text-gray-500 mb-2">
              Ditampilkan di halaman Vote (/vote) supaya pendukung mudah mengenali timmu.
            </P>
            <div className="flex items-center gap-4 mb-4">
              {tim.foto ? (
                <Image
                  src={tim.foto}
                  alt={tim.nama_tim}
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-full object-cover border border-neutral-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary-100 text-primary-600 font-bold flex items-center justify-center border border-neutral-200">
                  {initials(tim.nama_tim)}
                </div>
              )}
              <input
                name="foto"
                type="file"
                accept="image/*"
                className="text-sm file:bg-primary-500 file:text-white file:rounded-md file:border-none file:py-1.5 file:px-3 file:mr-3 hover:cursor-pointer"
              />
            </div>
            <H3 className="mb-4">Video Tiktok + Foto Pasukan</H3>
            <TextField
              id="link_video"
              name="link_video"
              placeholder="Masukkan link drive video tiktok + foto pasukan"
              type="url"
              className="w-full"
              value={tim.link_video ?? ""}
            />
            <div className="w-full justify-end flex mt-4">
              <SubmitButton text={"Submit"} className="float-end mt-4" />
            </div>
          </form>
        ) : null}

        {tim.confirmed && (
          <div className="flex flex-col gap-2 mb-4">
            <H3>Berkas Registrasi (PDF)</H3>
            <P className="text-sm text-gray-500">
              Berkas formulir registrasi peserta (kop surat, data tim, foto Danton & pasukan, tanda tangan
              Pelatih/Official) terisi otomatis dari data anggota — tidak perlu diisi manual di PDF/Word.
            </P>
            {dataLengkap ? (
              <button
                type="button"
                onClick={handleDownloadBerkas}
                disabled={downloading}
                className="self-start bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                {downloading ? "Menyiapkan..." : "Cetak / Unduh Berkas PDF"}
              </button>
            ) : (
              <P className="text-yellow-600 text-sm">
                Lengkapi dulu data semua anggota tim ({tim.anggotas.length}/{jumlahAnggotaLengkap} terisi)
                supaya berkas bisa dicetak.
              </P>
            )}
          </div>
        )}

        {/* hasil penilaian (legacy) */}
        {penilaian?.published === true && (
          <>
            <div className="flex flex-col gap-1 mb-4">
              <H3 className="pb-4">Hasil Penilaian</H3>
              <Field
                id="link_penilaian"
                label="Link Penilaian"
                placeholder="Masukkan link penilaian"
                type="url"
                name="link_penilaian"
                value={penilaian.detail_url}
                disabled={true}
              />
            </div>
            <div className="flex flex-col gap-1 mb-4">
              <H3 className="pb-4">Catatan Juri</H3>
              <Field
                id="note"
                label="Note"
                placeholder="Masukkan note"
                type="text"
                name="note"
                value={penilaian.note}
                disabled={true}
              />
            </div>
          </>
        )}

        {tim.confirmed ? (
          <TimLayout tim={tim} />
        ) : (
          <SectionWrapper className="!pt-[100px] flex items-center justify-center">
            <H3 className="text-center">
              Silahkan untuk menunggu konfirmasi pembayaran dari admin
            </H3>
          </SectionWrapper>
        )}
      </div>
    </SectionWrapper>
  );
}
