export const dynamic = "force-dynamic";
import { findTims } from "@/queries/tim.query";
import { findJuris, findOrLinkJuriByUser } from "@/queries/juri.query";
import { findJuriKategoris, findKategoriLombas } from "@/queries/penilaianBaru.query";
import Link from "next/link";
import { makeSlug, noUrutSlug } from "@/lib/timSlug";
import InputNilaiFilter from "./InputNilaiFilter";
import { getServerSession } from "@/lib/next-auth";
import prisma from "@/lib/prisma";
import { TIM_IKUT_LOMBA } from "@/lib/gugurTim";

const JENJANG_ORDER = ["SD", "SMP", "SMA", "PURNA"];

type ProgresKategori = { kategori: string; terisi: number; total: number };

export default async function InputNilaiIndexPage({
  searchParams,
}: {
  searchParams?: { jenjang?: string; sekolah?: string; juri?: string; juriId?: string; kategori?: string; status?: string };
}) {
  const session = await getServerSession();
  // Juri tidak boleh melihat/mencari nama sekolah — penilaian netral berdasarkan no. urut.
  const isJuri = session?.user?.role === "JURI";
  const [tims, juris, juriKategoris, kategoriLombas, hadirDp, juriLogin] = await Promise.all([
    // Tim mundur / tidak hadir (lib/gugurTim.ts) tidak dinilai, jadi tidak ditampilkan.
    findTims(TIM_IKUT_LOMBA),
    findJuris(),
    findJuriKategoris(),
    findKategoriLombas(),
    prisma.presensiDP.findMany({ select: { timId: true } }),
    isJuri && session?.user?.id ? findOrLinkJuriByUser(session.user.id) : null,
  ]);
  const sudahHadir = new Set(hadirDp.map((h) => h.timId));

  // Filter juri di URL memakai slug "nama-<8 hex id>" (?juri=), bukan UUID; ?juriId= (lama) tetap dikenali.
  const juriParam = searchParams?.juri ?? searchParams?.juriId;
  const juriIdDipilih = juriParam
    ? juris.find((j) => j.id === juriParam || makeSlug(j.nama, j.id, "juri") === juriParam)?.id
    : undefined;

  // Juri yang dipilih di filter ikut dibawa ke form (Sie Lomba input atas nama juri itu).
  const juriDipilih = juris.find((j) => j.id === juriIdDipilih);
  const juriSlug = juriDipilih ? makeSlug(juriDipilih.nama, juriDipilih.id, "juri") : "";

  // Juri yang progresnya ditampilkan: akun juri sendiri, atau juri yang dipilih staf.
  const juriProgresId = isJuri ? juriLogin?.id : juriIdDipilih;
  const kategoriJuri = juriProgresId
    ? Array.from(
        new Map(
          juriKategoris
            .filter((jk) => jk.juriId === juriProgresId)
            .map((jk) => [jk.kategori.toLowerCase(), jk.kategori] as const)
        ).values()
      )
    : [];
  const kategoriTampil = searchParams?.kategori
    ? kategoriJuri.filter((k) => k.toLowerCase() === searchParams.kategori!.toLowerCase())
    : kategoriJuri;

  // Progres juri per tim per kategori: berapa sub-kategori aktif yang sudah dinilai.
  const [subAktif, nilaiJuri] = juriProgresId
    ? await Promise.all([
        prisma.subKategoriMaster.findMany({ where: { aktif: true }, select: { id: true, kategori: true } }),
        prisma.nilaiJuri.findMany({
          where: { juriId: juriProgresId, subKategori: { aktif: true } },
          select: { subKategoriId: true, penilaian: { select: { timId: true } } },
        }),
      ])
    : [[], []];
  const terisiSet = new Set(nilaiJuri.map((n) => `${n.penilaian.timId}|${n.subKategoriId}`));
  function progresTim(timId: string): ProgresKategori[] {
    return kategoriTampil.map((k) => {
      const subs = subAktif.filter((s) => s.kategori.toLowerCase() === k.toLowerCase());
      return { kategori: k, total: subs.length, terisi: subs.filter((s) => terisiSet.has(`${timId}|${s.id}`)).length };
    });
  }
  const statusTim = (p: ProgresKategori[]) => {
    const total = p.reduce((s, x) => s + x.total, 0);
    const terisi = p.reduce((s, x) => s + x.terisi, 0);
    return total === 0 ? "KOSONG" : terisi === total ? "SELESAI" : terisi === 0 ? "BELUM" : "SEBAGIAN";
  };

  const jenjangList = JENJANG_ORDER.filter((j) => (tims as any[]).some((t) => t.jenjang === j));

  const filtered = (tims as any[])
    .filter((t) => {
      if (searchParams?.jenjang && t.jenjang !== searchParams.jenjang) return false;
      if (!isJuri && searchParams?.sekolah && !t.asal_sekolah.toLowerCase().includes(searchParams.sekolah.toLowerCase()))
        return false;
      if (juriProgresId && searchParams?.status === "belum" && statusTim(progresTim(t.id)) === "SELESAI") return false;
      return true;
    })
    // Urut jenjang lalu no. urut tampil — sama dengan urutan tim turun lapangan.
    .sort(
      (a, b) =>
        JENJANG_ORDER.indexOf(a.jenjang) - JENJANG_ORDER.indexOf(b.jenjang) ||
        (a.noUrut ?? 9999) - (b.noUrut ?? 9999)
    );

  const ringkas = juriProgresId
    ? (() => {
        const st = filtered.map((t) => statusTim(progresTim(t.id)));
        return { selesai: st.filter((s) => s === "SELESAI").length, total: st.length };
      })()
    : null;

  // Tautan ke form membawa juri (staf) & kategori pilihan, supaya form langsung membuka tab kategori itu.
  function hrefTim(tim: any) {
    const qs = new URLSearchParams();
    if (juriSlug && !isJuri) qs.set("juri", juriSlug);
    if (searchParams?.kategori) qs.set("kategori", searchParams.kategori);
    const s = qs.toString();
    return `/admin/penilaian-baru/input/${noUrutSlug(tim)}${s ? `?${s}` : ""}`;
  }

  const warnaStatus: Record<string, string> = {
    SELESAI: "border-green-400 bg-green-50",
    SEBAGIAN: "border-amber-300 bg-amber-50",
    BELUM: "border-neutral-200 bg-white",
    KOSONG: "border-neutral-200 bg-white",
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Input Nilai per Tim</h1>
        {isJuri && juriLogin && (
          <div className="text-sm text-gray-600">
            Juri: <b>{juriLogin.nama}</b>
            {kategoriJuri.length > 0 && ` · Kategori: ${kategoriJuri.join(", ")}`}
          </div>
        )}
      </div>

      <InputNilaiFilter
        jenjangList={jenjangList}
        // Hanya id/nama/kategori — props ini terkirim ke browser (tanpa email & no. HP juri).
        juris={juris.map((j) => ({ id: j.id, nama: j.nama }))}
        juriKategoris={juriKategoris.map((jk) => ({ id: jk.id, juriId: jk.juriId, kategori: jk.kategori }))}
        kategoriLombas={kategoriLombas}
        defaultValues={{ ...searchParams, juriId: juriIdDipilih }}
        sembunyikanSekolah={isJuri}
        juriLoginId={isJuri ? juriLogin?.id : undefined}
      />

      <div className="flex flex-col gap-6">
        <p className="text-sm text-gray-500">
          {filtered.length} tim
          {juriDipilih && ` · Juri: ${juriDipilih.nama}`}
          {searchParams?.kategori && ` · Kategori: ${searchParams.kategori}`}
          {ringkas && (
            <>
              {" "}
              · Selesai dinilai{" "}
              <b className={ringkas.selesai === ringkas.total ? "text-green-700" : "text-black"}>
                {ringkas.selesai}/{ringkas.total}
              </b>
            </>
          )}
        </p>

        {JENJANG_ORDER.map((jenjang) => {
          const daftar = filtered.filter((t) => t.jenjang === jenjang);
          if (daftar.length === 0) return null;
          return (
            <section key={jenjang} className="flex flex-col gap-3">
              <h2 className="font-semibold text-neutral-600 border-b border-neutral-200 pb-1">
                Jenjang {jenjang} <span className="text-xs font-normal text-gray-400">({daftar.length} tim)</span>
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {daftar.map((tim) => {
                  const progres = juriProgresId ? progresTim(tim.id) : [];
                  const st = juriProgresId ? statusTim(progres) : "KOSONG";
                  return (
                    <Link
                      key={tim.id}
                      href={hrefTim(tim)}
                      className={`border-2 rounded-xl p-4 hover:border-primary-400 transition-colors flex flex-col gap-2 ${warnaStatus[st]}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-lg">
                          {tim.noUrut != null
                            ? `${tim.jenjang}-${String(tim.noUrut).padStart(2, "0")}`
                            : "Belum ada No. Urut"}
                        </div>
                        <div className="flex flex-wrap justify-end gap-1">
                          {st === "SELESAI" && (
                            <span className="whitespace-nowrap rounded-full bg-green-600 px-2 py-0.5 text-xs font-semibold text-white">
                              ✓ Selesai
                            </span>
                          )}
                          {/* Pengingat saja — tim tetap bisa dinilai. */}
                          {!sudahHadir.has(tim.id) && (
                            <span className="whitespace-nowrap rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600">
                              Belum presensi
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-400">
                        {isJuri ? `Jenjang ${tim.jenjang}` : `${tim.asal_sekolah} — ${tim.jenjang}`}
                      </div>
                      {/* Juri dengan lebih dari satu kategori: progres terlihat per kategori. */}
                      {progres.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {progres.map((p) => (
                            <span
                              key={p.kategori}
                              className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                                p.total > 0 && p.terisi === p.total
                                  ? "bg-green-100 text-green-800"
                                  : p.terisi > 0
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-neutral-100 text-neutral-600"
                              }`}
                            >
                              {p.kategori} {p.terisi}/{p.total}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-gray-400 text-sm py-8 text-center">Tidak ada tim yang sesuai filter.</p>
        )}
      </div>
    </div>
  );
}
