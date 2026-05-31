export const dynamic = "force-dynamic";
import { H1 } from "@/app/components/global/Text";
import { findTims } from "@/queries/tim.query";
import { findSertifikats } from "@/queries/sertifikat.query";
import { findKonfigJuaras, getRankingPerJenjang } from "@/queries/penghargaan.query";
import SertifikatForm from "./components/SertifikatForm";

const JENJANG_LIST = ["SD", "SMP", "SMA"] as const;

export default async function SertifikatPage() {
  const [tims, sertifikats, konfigs] = await Promise.all([
    findTims(),
    findSertifikats(),
    findKonfigJuaras({ jenisJuara: "PERINGKAT" }),
  ]);

  type KonfigJuaraItem = (typeof konfigs)[number];

  const juaraLabelMap: Record<string, string> = {};
  for (const jenjang of JENJANG_LIST) {
    const ranking = await getRankingPerJenjang(jenjang, []);
    const konfigsInJenjang = (konfigs as KonfigJuaraItem[])
      .filter((k) => k.jenjang === jenjang)
      .sort((a, b) => (a.urutan ?? 99) - (b.urutan ?? 99));

    ranking.forEach((r, idx) => {
      const label = konfigsInJenjang[idx]?.namaJuara ?? `Peringkat ${idx + 1} ${jenjang}`;
      juaraLabelMap[r.timId] = label;
    });
  }

  // Group sertifikat by timId
  const sertifikatMap: Record<string, { id: string; fileUrl: string; namaAnggota: string | null; namaJuara: string | null }[]> = {};
  for (const s of sertifikats) {
    if (!sertifikatMap[s.timId]) sertifikatMap[s.timId] = [];
    sertifikatMap[s.timId].push({
      id: s.id,
      fileUrl: s.fileUrl,
      namaAnggota: (s as any).namaAnggota ?? null,
      namaJuara: s.namaJuara ?? null,
    });
  }

  const totalFile = sertifikats.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <H1>Sertifikat</H1>
        <span className="text-sm text-gray-500">
          {totalFile} file · {Object.keys(sertifikatMap).length} tim
        </span>
      </div>

      {JENJANG_LIST.map((jenjang) => {
        const timsInJenjang = tims.filter((t) => t.jenjang === jenjang);
        if (timsInJenjang.length === 0) return null;

        const ranked = timsInJenjang.filter((t) => juaraLabelMap[t.id]);
        const unranked = timsInJenjang.filter((t) => !juaraLabelMap[t.id]);
        const sorted = [...ranked, ...unranked];

        return (
          <section key={jenjang} className="flex flex-col gap-4">
            <h2 className="font-semibold text-base text-gray-700 border-b border-gray-200 pb-2">
              Jenjang {jenjang} — {timsInJenjang.length} Tim
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sorted.map((tim) => (
                <SertifikatForm
                  key={tim.id}
                  tim={{ id: tim.id, nama_tim: tim.nama_tim, jenjang: tim.jenjang, asal_sekolah: tim.asal_sekolah }}
                  sertifikats={sertifikatMap[tim.id] ?? []}
                  juaraLabel={juaraLabelMap[tim.id] ?? null}
                />
              ))}
            </div>
          </section>
        );
      })}

      {tims.length === 0 && (
        <p className="text-gray-500 text-sm">Belum ada tim yang terdaftar.</p>
      )}
    </div>
  );
}
