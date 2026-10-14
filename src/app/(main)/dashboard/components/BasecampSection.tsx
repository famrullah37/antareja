import { H2 } from "@/app/components/global/Text";
import SectionWrapper from "@/app/components/global/Wrapper";
import { findRuanganTim } from "@/queries/ruangan.query";

// Ruangan basecamp tim, ditempatkan panitia di /admin/basecamp. Tidak tampil
// sebelum tim ditempatkan. Ikut menampilkan tim lain yang satu ruangan.
export default async function BasecampSection({ timId, ruanganId }: { timId: string; ruanganId: string | null }) {
  if (!ruanganId) return null;
  const ruangan = await findRuanganTim(ruanganId);
  if (!ruangan) return null;
  const timLain = ruangan.tims.filter((t) => t.id !== timId);

  return (
    <SectionWrapper id="basecamp">
      <H2 className="mb-2">Basecamp</H2>
      <div className="bg-primary-50 border border-primary-200 rounded-xl px-5 py-4 flex flex-col gap-3">
        <div>
          <div className="text-xs font-semibold text-primary-700 uppercase tracking-wide">Ruangan tim kamu</div>
          <div className="font-bold text-gray-900 text-xl">{ruangan.nama}</div>
          {ruangan.keterangan && <div className="text-sm text-gray-600 whitespace-pre-line">{ruangan.keterangan}</div>}
        </div>
        {timLain.length > 0 && (
          <div className="text-sm text-gray-700">
            <div className="text-xs text-gray-500 mb-1">Berbagi ruangan dengan</div>
            <ul className="list-disc pl-5">
              {timLain.map((t) => (
                <li key={t.id}>
                  {t.nama_tim} <span className="text-gray-500">({t.asal_sekolah})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
