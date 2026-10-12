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

export default async function InputNilaiPage({
  params,
  searchParams,
}: {
  params: { timId: string };
  searchParams?: { juri?: string };
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

  const penilaian = await findPenilaianBaru({ timId: timParam.id });

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
      </div>
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
      />
    </div>
  );
}
