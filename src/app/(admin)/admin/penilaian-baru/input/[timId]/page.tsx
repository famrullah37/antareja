import { findTim, findTimByNoUrutParam } from "@/queries/tim.query";
import { isUuid, makeSlug, noUrutSlug } from "@/lib/timSlug";
import { getServerSession } from "@/lib/next-auth";
import { findOrLinkJuriByUser } from "@/queries/juri.query";
import prisma from "@/lib/prisma";
import {
  findNilaiDiskritMasters,
  findPenilaianBaru,
  findPelanggarans,
  findSubKategoriMasters,
} from "@/queries/penilaianBaru.query";
import { notFound, redirect } from "next/navigation";
import InputNilaiForm from "./InputNilaiForm";
import MasukanSuaraJuri from "./MasukanSuaraJuri";
import Link from "next/link";
import { labelGugur } from "@/lib/gugurTim";

export default async function InputNilaiPage({
  params,
  searchParams,
}: {
  params: { timId: string };
  searchParams?: { juri?: string; kategori?: string };
}) {
  const timParam = await findTimByNoUrutParam(params.timId);
  if (!timParam) return notFound();

  // URL kanonis = "sma-03" (jenjang-no.urut, tanpa nama tim); UUID lama di-redirect.
  if (isUuid(params.timId)) redirect(`/admin/penilaian-baru/input/${noUrutSlug(timParam)}`);

  const session = await getServerSession();
  const isJuri = session?.user?.role === "JURI";
  // Sie Lomba/Admin memasukkan nilai ATAS NAMA juri yang dipilih (?juri=<slug>),
  // mis. dari lembar penilaian kertas. Juri selalu memakai akunnya sendiri.
  const modeStaf = !isJuri;

  // Hanya id/nama/slug — props ini terkirim ke browser.
  const daftarJuri = modeStaf
    ? (await prisma.juri.findMany({ select: { id: true, nama: true }, orderBy: { nama: "asc" } })).map((j) => ({
        ...j,
        slug: makeSlug(j.nama, j.id, "juri"),
      }))
    : [];

  // Juri pemberi nilai (lihat juriPenilai di actions/PenilaianBaru).
  const juriAktif = isJuri
    ? await (async () => {
        const j = session?.user?.id ? await findOrLinkJuriByUser(session.user.id) : null;
        return j && { id: j.id, nama: j.nama };
      })()
    : (() => {
        const j = daftarJuri.find((d) => d.slug === searchParams?.juri || d.id === searchParams?.juri);
        return j ? { id: j.id, nama: j.nama } : null;
      })();

  const [tim, subKategoris, nilaiMasters, pelanggarans, juriKategoris] =
    await Promise.all([
      findTim({ id: timParam.id }, {}),
      findSubKategoriMasters({ aktif: true }),
      findNilaiDiskritMasters(),
      findPelanggarans(),
      // Hanya kategori juri ini, tanpa relasi Juri (email/no. HP juri lain tidak ikut ke browser).
      juriAktif
        ? prisma.juriKategori.findMany({
            where: { juriId: juriAktif.id },
            select: { id: true, juriId: true, kategori: true },
          })
        : [],
    ]);

  if (!tim) return notFound();

  // Tim mundur / tidak hadir tidak dinilai (server juga menolak, lib/gugurTim.ts).
  if (!tim.confirmed || tim.gugurAt) {
    return (
      <div className="max-w-4xl mx-auto py-6 flex flex-col gap-4">
        <h1 className="text-2xl font-bold">
          {tim.noUrut != null ? `${tim.jenjang}-${String(tim.noUrut).padStart(2, "0")}` : "Belum ada No. Urut"}
        </h1>
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-5 text-sm">
          {tim.gugurAt
            ? `Tim ini ditandai "${labelGugur(tim.gugurJenis)}" — tidak dinilai.`
            : "Pembayaran tim ini belum terkonfirmasi — tidak dinilai."}{" "}
          <Link href="/admin/penilaian-baru/input" className="underline font-semibold">
            Kembali ke daftar tim
          </Link>
        </div>
      </div>
    );
  }

  const [penilaian, presensi] = await Promise.all([
    findPenilaianBaru({ timId: timParam.id }),
    // Registrasi ulang di DP: hanya jumlah (tanpa nama anggota) — tampil juga ke juri.
    prisma.presensiDP.findUnique({
      where: { timId: timParam.id },
      select: { anggota: { select: { tidakHadir: true } } },
    }),
  ]);
  const anggotaTidakHadir = presensi?.anggota.filter((a) => a.tidakHadir).length ?? 0;
  const suaraSaya = penilaian?.masukanSuara.find((m) => m.juriId === juriAktif?.id);

  // Props komponen klien ikut terkirim ke browser (terbaca di page source), jadi
  // hanya kirim yang dibutuhkan: tanpa nama/sekolah tim, tanpa nilai juri lain.
  const existing = penilaian && {
    id: penilaian.id,
    nilaiKotor: penilaian.nilaiKotor,
    totalPengurang: penilaian.totalPengurang,
    nilaiAkhir: penilaian.nilaiAkhir,
    published: penilaian.published,
    nilaiJuri: penilaian.nilaiJuri
      .filter((n) => n.juriId === juriAktif?.id)
      .map((n) => ({
        subKategoriId: n.subKategoriId,
        juriId: n.juriId,
        nilaiDipilih: n.nilaiDipilih,
        predikat: n.predikat,
        catatan: n.catatan,
      })),
    pelanggaranTim: penilaian.pelanggaranTim.map((p) => ({
      id: p.id,
      jumlahKejadian: p.jumlahKejadian,
      totalPengurang: p.totalPengurang,
      pelanggaran: { kode: p.pelanggaran.kode, nama: p.pelanggaran.nama },
    })),
  };

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {tim.noUrut != null
            ? `${tim.jenjang}-${String(tim.noUrut).padStart(2, "0")}`
            : "Belum ada No. Urut"}
        </h1>
        {/* Juri hanya melihat no. urut — nama sekolah disembunyikan supaya penilaian netral. */}
        <p className="text-gray-500">
          {isJuri ? `Jenjang ${tim.jenjang}` : `${tim.asal_sekolah} — ${tim.jenjang}`}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
          {!presensi ? (
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-600">Tim belum registrasi di DP</span>
          ) : anggotaTidakHadir > 0 ? (
            <span className="rounded-full bg-orange-100 px-2.5 py-1 text-orange-800">
              Tim hadir · {anggotaTidakHadir} anggota tidak hadir
            </span>
          ) : (
            <span className="rounded-full bg-green-100 px-2.5 py-1 text-green-800">Tim hadir di DP</span>
          )}
        </div>
      </div>
      {juriAktif && (
        <MasukanSuaraJuri
          // Ganti tim/juri = komponen baru, supaya rekaman yang berjalan selesai & tersimpan ke tim sebelumnya.
          key={`${tim.id}-${juriAktif.id}`}
          timId={tim.id}
          juriId={juriAktif.id}
          terkunci={!!penilaian?.published}
          existing={
            suaraSaya
              ? { id: suaraSaya.id, durasiDetik: suaraSaya.durasiDetik, v: suaraSaya.updatedAt.getTime() }
              : null
          }
        />
      )}
      <InputNilaiForm
        tim={{ id: tim.id }}
        juriAktif={juriAktif}
        modeStaf={modeStaf}
        daftarJuri={daftarJuri.map(({ id, nama, slug }) => ({ id, nama, slug }))}
        subKategoris={subKategoris}
        nilaiMasters={nilaiMasters as any}
        pelanggarans={pelanggarans}
        juriKategoris={juriKategoris}
        existing={existing}
        kategoriAwal={searchParams?.kategori}
      />
    </div>
  );
}
