export const dynamic = "force-dynamic";
import { findTims } from "@/queries/tim.query";
import { findJuris } from "@/queries/juri.query";
import { findJuriKategoris, findKategoriLombas } from "@/queries/penilaianBaru.query";
import Link from "next/link";
import InputNilaiFilter from "./InputNilaiFilter";

export default async function InputNilaiIndexPage({
  searchParams,
}: {
  searchParams?: { jenjang?: string; sekolah?: string; juriId?: string; kategori?: string };
}) {
  const [tims, juris, juriKategoris, kategoriLombas] = await Promise.all([
    findTims({ confirmed: true }),
    findJuris(),
    findJuriKategoris(),
    findKategoriLombas(),
  ]);

  const jenjangList = [...new Set((tims as any[]).map((t) => t.jenjang))].sort();

  const filtered = (tims as any[]).filter((t) => {
    if (searchParams?.jenjang && t.jenjang !== searchParams.jenjang) return false;
    if (searchParams?.sekolah && !t.asal_sekolah.toLowerCase().includes(searchParams.sekolah.toLowerCase())) return false;
    if (searchParams?.juriId) {
      const kats = juriKategoris.filter((jk) => jk.juriId === searchParams.juriId).map((jk) => jk.kategori);
      if (searchParams?.kategori && !kats.includes(searchParams.kategori)) return false;
    }
    if (searchParams?.kategori && !searchParams?.juriId) {
      // filter kategori tanpa juri tidak mempengaruhi tim, hanya ditampilkan di form input
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Input Nilai per Tim</h1>
      </div>

      <InputNilaiFilter
        jenjangList={jenjangList}
        juris={juris as any[]}
        juriKategoris={juriKategoris as any[]}
        kategoriLombas={kategoriLombas}
        defaultValues={searchParams ?? {}}
      />

      <div>
        <p className="text-sm text-gray-500 mb-3">
          {filtered.length} tim ditemukan
          {searchParams?.juriId && ` · Juri: ${juris.find((j) => j.id === searchParams.juriId)?.nama ?? ""}`}
          {searchParams?.kategori && ` · Kategori: ${searchParams.kategori}`}
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((tim) => {
            const params = new URLSearchParams();
            if (searchParams?.juriId) params.set("juriId", searchParams.juriId);
            if (searchParams?.kategori) params.set("kategori", searchParams.kategori);
            const qs = params.toString();
            return (
              <Link
                key={tim.id}
                href={`/admin/penilaian-baru/input/${tim.id}${qs ? `?${qs}` : ""}`}
                className="bg-white border border-neutral-200 rounded-xl p-4 hover:border-primary-400 transition-colors"
              >
                <div className="font-bold text-lg">
                  {tim.noUrut != null
                    ? `${tim.jenjang}-${String(tim.noUrut).padStart(2, "0")}`
                    : "Belum ada No. Urut"}
                </div>
                <div className="text-sm text-gray-400">
                  {tim.asal_sekolah} — {tim.jenjang}
                </div>
              </Link>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-gray-400 text-sm col-span-3 py-8 text-center">
              Tidak ada tim yang sesuai filter.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
