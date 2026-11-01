"use client";

import Image from "next/image";
import { ReactNode, useRef, useState } from "react";
import { H2, H3, P } from "@/app/components/global/Text";
import SectionWrapper from "@/app/components/global/Wrapper";
import { TimWithRelations } from "@/types/entityRelations";
import { AnggotaCard } from "./parts/AnggotaCard";
import cn from "@/lib/clsx";
import { initials } from "@/lib/initials";
import { updateLinkPoster, updateLinkRekomendasi, updateNamaTim, updateTimForm } from "@/actions/Tim";
import Field from "../components/parts/input";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FaDownload } from "react-icons/fa";
import SubmitButton from "@/app/components/global/SubmitButton";
import { downloadFormulir, downloadKuitansi } from "./parts/downloadFormulir";
import { compressFormDataImage } from "@/lib/compressImageClient";

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
type JenisLink = "rekomendasi" | "poster";

// Nama file yang diminta panitia: <KODE>_<NamaSekolah>_<NamaTim>, tanpa spasi & tanda baca.
const namaFileDokumen = (kode: string, sekolah: string, namaTim: string) =>
  [kode, sekolah, namaTim].map((s) => s.replace(/[^A-Za-z0-9]/g, "")).join("_");

// Form link Google Drive/cloud untuk dokumen tim (folder surat rekomendasi & kartu pelajar, poster).
function FormLinkDokumen({
  judul,
  deskripsi,
  link,
  name,
  berkas,
  menyimpan,
  disabled,
  onSubmit,
}: {
  judul: string;
  deskripsi: string;
  link: string | null;
  name: string;
  berkas?: { isi: string; pola: string; namaFile: string }[];
  menyimpan: boolean;
  disabled: boolean;
  onSubmit: (fd: FormData) => void;
}) {
  return (
    <form action={onSubmit} className="flex flex-col gap-2 mb-4">
      <H3>{judul}</H3>
      {berkas && (
        <div className="text-sm flex flex-col gap-1">
          <span>Isi folder & format nama file:</span>
          <ol className="list-decimal pl-5 flex flex-col gap-1">
            {berkas.map((b) => (
              <li key={b.pola}>
                {b.isi}: <span className="font-mono font-semibold">{b.pola}</span> — untuk timmu:{" "}
                <span className="font-mono font-semibold text-primary-600 break-all">{b.namaFile}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      <P className="text-sm text-gray-500">
        Tempel link Google Drive (atau cloud lain) {deskripsi} — pastikan link bisa dibuka siapa saja yang punya
        link (share: &quot;Siapa saja yang memiliki link&quot;).
      </P>
      {link && (
        <a href={link} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline text-sm break-all">
          {link}
        </a>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          name={name}
          type="url"
          placeholder="https://drive.google.com/..."
          defaultValue={link ?? ""}
          required
          className="flex-1 border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
        <button
          type="submit"
          disabled={disabled}
          className="bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors shrink-0"
        >
          {menyimpan ? "Menyimpan..." : link ? "Ganti Link" : "Simpan Link"}
        </button>
      </div>
    </form>
  );
}

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
            href={`/dashboard/anggota/pelatih`}
            image={pelatih?.foto ?? "/placeholder-profile-picture.jpg"}
            name={tim.pelatih ?? "Belum diisi"}
            key={"pelatih"}
            posisi={pelatih?.posisi ?? "PELATIH"}
          />
          <AnggotaCard
            href={`/dashboard/anggota/danton`}
            image={danton?.foto ?? "/placeholder-profile-picture.jpg"}
            name={danton?.nama ?? "Belum diisi"}
            key={"danton"}
            posisi={danton?.posisi ?? "DANTON"}
          />
          <AnggotaCard
            href={`/dashboard/anggota/official`}
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
                    href={`/dashboard/anggota/${pos}`}
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
                    href={`/dashboard/anggota/${pos}`}
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
  dokumen = [],
}: {
  tim: TimWithRelations;
  penilaian?: any;
  biayaDasar?: number;
  // Surat undangan & surat rekomendasi Diknas untuk jenjang tim ini (diupload admin).
  dokumen?: { jenis: string; label: string; url: string }[];
}) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [downloadingKuitansi, setDownloadingKuitansi] = useState(false);
  const jumlahAnggotaLengkap = sizeMap[tim.tipe_tim] + 3;
  const dataLengkap = tim.anggotas.length === jumlahAnggotaLengkap;

  async function handleDownloadKuitansi() {
    setDownloadingKuitansi(true);
    await downloadKuitansi();
    setDownloadingKuitansi(false);
  }

  async function handleDownloadBerkas() {
    setDownloading(true);
    await downloadFormulir();
    setDownloading(false);
  }
  // Tim lama (daftar sebelum fitur kode unik) tidak punya totalBayar — mereka
  // transfer biaya dasar tanpa kode unik, jadi itu yang ditampilkan.
  const nominalTransfer = tim.pembayaran?.totalBayar ?? biayaDasar ?? null;

  // Pratinjau foto yang baru dipilih (belum disimpan) supaya bisa di-review dulu.
  const [preview, setPreview] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (preview) URL.revokeObjectURL(preview);
    if (!file) return setPreview(null);
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran foto maksimal 10MB");
      e.target.value = "";
      return setPreview(null);
    }
    setPreview(URL.createObjectURL(file));
  }

  async function submitForm(formData: FormData) {
    const toastId = toast.loading("Menyimpan foto tim...");
    await compressFormDataImage(formData, "foto");
    const result = await updateTimForm(tim.id, formData);

    if ("message" in result) {
      if (result.success) {
        toast.success(result.message, { id: toastId });
        if (preview) URL.revokeObjectURL(preview);
        setPreview(null);
        formRef.current?.reset();
        router.refresh();
      } else {
        toast.error(result.message, { id: toastId });
      }
    } else {
      toast.error("An error occurred", { id: toastId });
    }
  }

  const [editNama, setEditNama] = useState(false);
  const [savingNama, setSavingNama] = useState(false);
  async function submitNama(formData: FormData) {
    setSavingNama(true);
    const toastId = toast.loading("Menyimpan nama tim...");
    const result = await updateNamaTim(tim.id, formData);
    setSavingNama(false);
    if (result.success) {
      toast.success(result.message, { id: toastId });
      setEditNama(false);
      router.refresh();
    } else {
      toast.error(result.message, { id: toastId });
    }
  }

  const [savingLink, setSavingLink] = useState<JenisLink | null>(null);
  async function submitLink(
    kind: JenisLink,
    action: typeof updateLinkRekomendasi,
    formData: FormData
  ) {
    setSavingLink(kind);
    const toastId = toast.loading("Menyimpan link...");
    const result = await action(tim.id, formData);
    setSavingLink(null);
    if (result.success) {
      toast.success(result.message, { id: toastId });
      router.refresh();
    } else {
      toast.error(result.message, { id: toastId });
    }
  }

  return (
    <SectionWrapper id="profile-tim">
      <H2 className="mb-2">Profil Tim Anda</H2>
      <div className="w-full bg-white rounded-lg p-5">
        {/* --- info tim --- */}
        <div className="flex flex-col gap-1 mb-4">
          <H3>Nama Tim</H3>
          {editNama ? (
            <form action={submitNama} className="flex flex-col sm:flex-row gap-2">
              <input
                name="nama_tim"
                defaultValue={tim.nama_tim}
                required
                maxLength={100}
                autoFocus
                className="flex-1 border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <div className="flex gap-2 shrink-0">
                <button
                  type="submit"
                  disabled={savingNama}
                  className="bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
                >
                  {savingNama ? "Menyimpan..." : "Simpan"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditNama(false)}
                  disabled={savingNama}
                  className="border border-neutral-300 hover:bg-neutral-100 text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
                >
                  Batal
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-3">
              <P>{tim.nama_tim}</P>
              <button
                type="button"
                onClick={() => setEditNama(true)}
                className="text-primary-600 hover:underline text-sm"
              >
                Ubah
              </button>
            </div>
          )}
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
            {tim.pembayaran.nomorKuitansi && (
              <P className="text-sm">
                No. Kuitansi: <span className="font-bold text-black">{tim.pembayaran.nomorKuitansi}</span>
                {tim.pembayaran.kuitansiIsDP ? " — kuitansi sementara (DP), akan diganti setelah pelunasan" : ""}
              </P>
            )}
            {tim.confirmed && (
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <button
                  type="button"
                  onClick={handleDownloadKuitansi}
                  disabled={downloadingKuitansi}
                  className="bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
                >
                  {downloadingKuitansi ? "Menyiapkan..." : "Unduh Kuitansi (PDF)"}
                </button>
                {tim.pembayaran.kuitansiUrl && (
                  <a
                    href={tim.pembayaran.kuitansiUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary-600 hover:underline text-sm"
                  >
                    Lihat kuitansi yang dikirim ke email
                  </a>
                )}
              </div>
            )}
            {!tim.confirmed && (
              <P className="text-sm text-gray-400">Kuitansi tersedia setelah pembayaran dikonfirmasi admin.</P>
            )}
          </div>
        )}

        {dokumen.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            <H3>Surat Undangan & Rekomendasi</H3>
            <P className="text-sm text-gray-500">
              Unduh surat undangan dari panitia dan surat rekomendasi dari Diknas untuk jenjang {tim.jenjang}.
            </P>
            <div className="flex flex-wrap gap-3">
              {dokumen.map((d) => (
                <a
                  key={d.jenis}
                  href={d.url}
                  className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
                >
                  Unduh {d.label} <FaDownload />
                </a>
              ))}
            </div>
          </div>
        )}

        <FormLinkDokumen
          judul="Surat Rekomendasi Kepala Sekolah & Kartu Pelajar"
          deskripsi="folder yang berisi kedua file di atas"
          link={tim.linkRekomendasi}
          berkas={[
            {
              isi: "Surat rekomendasi kepala sekolah",
              pola: "SR_Namasekolah_NamaTIM",
              namaFile: namaFileDokumen("SR", tim.asal_sekolah, tim.nama_tim),
            },
            {
              isi: "Scan kartu pelajar seluruh anggota tim, digabung dalam 1 file PDF",
              pola: "KP_Namasekolah_NamaTIM",
              namaFile: namaFileDokumen("KP", tim.asal_sekolah, tim.nama_tim),
            },
          ]}
          menyimpan={savingLink === "rekomendasi"}
          disabled={savingLink !== null}
          onSubmit={(fd) => submitLink("rekomendasi", updateLinkRekomendasi, fd)}
          name="linkRekomendasi"
        />
        <FormLinkDokumen
          judul="Poster"
          deskripsi="poster tim"
          link={tim.linkPoster}
          menyimpan={savingLink === "poster"}
          disabled={savingLink !== null}
          onSubmit={(fd) => submitLink("poster", updateLinkPoster, fd)}
          name="linkPoster"
        />

        {tim.confirmed ? (
          <form ref={formRef} action={submitForm} className="mb-4">
            <H3 className="mb-4">Foto Tim</H3>
            <P className="text-sm text-gray-500 mb-2">
              Ditampilkan di halaman Vote (/vote) supaya pendukung mudah mengenali timmu.
            </P>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
              <div className="flex flex-col items-center gap-1 shrink-0">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- blob URL pratinjau lokal
                  <img
                    src={preview}
                    alt="Pratinjau foto tim"
                    className="w-40 h-40 rounded-xl object-cover border-2 border-primary-500"
                  />
                ) : tim.foto ? (
                  <Image
                    src={tim.foto}
                    alt={tim.nama_tim}
                    width={160}
                    height={160}
                    className="w-40 h-40 rounded-xl object-cover border border-neutral-200"
                  />
                ) : (
                  <div className="w-40 h-40 rounded-xl bg-primary-100 text-primary-600 text-2xl font-bold flex items-center justify-center border border-neutral-200">
                    {initials(tim.nama_tim)}
                  </div>
                )}
                <span className={`text-xs ${preview ? "text-primary-600 font-semibold" : "text-gray-400"}`}>
                  {preview ? "Pratinjau (belum disimpan)" : tim.foto ? "Foto saat ini" : "Belum ada foto"}
                </span>
              </div>
              <input
                name="foto"
                type="file"
                accept="image/*"
                onChange={handleFotoChange}
                className="text-sm file:bg-primary-500 file:text-white file:rounded-md file:border-none file:py-1.5 file:px-3 file:mr-3 hover:cursor-pointer"
              />
            </div>
            {preview && (
              <div className="w-full justify-end flex">
                <SubmitButton text={"Simpan Foto"} className="float-end" />
              </div>
            )}
          </form>
        ) : null}

        {tim.confirmed && (
          <div className="flex flex-col gap-2 mb-4">
            <H3>Berkas Registrasi (PDF)</H3>
            <P className="text-sm text-gray-500">
              Berkas formulir registrasi peserta (kop surat, data tim, foto Pelatih, Official, Danton & pasukan,
              tanda tangan Pelatih/Official) terisi otomatis dari data anggota — tidak perlu diisi manual di PDF/Word.
              Cetak di kertas A4 (portrait) lalu bawa pada hari pelaksanaan untuk diserahkan ke panitia saat registrasi ulang.
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
