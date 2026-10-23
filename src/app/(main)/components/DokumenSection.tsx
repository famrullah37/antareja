import SectionWrapper from "@/app/components/global/Wrapper";
import { getKonfigUmum } from "@/queries/konfigUmum.query";
import {
  DOKUMEN_JENIS,
  DOKUMEN_JENJANG,
  dokumenUrl,
  type DokumenJenis,
  type DokumenKey,
  type DokumenPeserta,
} from "@/lib/dokumenPeserta";
import { FaDownload } from "react-icons/fa";

// Surat undangan & rekomendasi Diknas ditampilkan publik supaya sekolah bisa
// mengurus izin/dana sebelum mendaftar dan membayar. Filenya sama untuk semua
// tim per jenjang, jadi tidak ada data peserta yang terbuka.
export default async function DokumenSection() {
  const konfig = await getKonfigUmum();
  const daftarDokumen = (konfig.dokumenPeserta ?? {}) as DokumenPeserta;
  const aktif = { SMP: konfig.smpAktif, SMA: konfig.smaAktif };

  const perJenjang = DOKUMEN_JENJANG.filter((jenjang) => aktif[jenjang])
    .map((jenjang) => ({
      jenjang,
      dokumen: (Object.keys(DOKUMEN_JENIS) as DokumenJenis[]).flatMap((jenis) => {
        const key = `${jenis}-${jenjang}` as DokumenKey;
        const info = daftarDokumen[key];
        return info ? [{ jenis, label: DOKUMEN_JENIS[jenis], url: dokumenUrl(key, info) }] : [];
      }),
    }))
    .filter((j) => j.dokumen.length > 0);

  if (perJenjang.length === 0) return null;

  return (
    <SectionWrapper id="dokumen" className="mt-16">
      <div className="w-full flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <span className="inline-flex items-center gap-2 text-primary-500 font-semibold text-sm uppercase tracking-widest">
            <span className="w-8 h-px bg-primary-500" />
            Dokumen Peserta
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-black leading-tight">
            Surat Undangan <br />
            <span className="text-primary-500">& Rekomendasi</span>
          </h2>
          <p className="text-gray-500 max-w-md">
            Unduh surat undangan panitia dan surat rekomendasi Diknas untuk keperluan izin sekolah sebelum mendaftar.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {perJenjang.map((j) => (
            <div key={j.jenjang} className="bg-white rounded-3xl border border-gray-200 shadow-sm p-7 flex flex-col gap-5">
              <span className="text-xs font-bold px-3 py-1.5 rounded-full border w-fit bg-red-50 text-primary-500 border-red-200">
                Jenjang {j.jenjang}
              </span>
              <div className="flex flex-col gap-3">
                {j.dokumen.map((d) => (
                  <a
                    key={d.jenis}
                    href={d.url}
                    className="inline-flex items-center justify-between gap-3 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold px-5 py-3 rounded-xl transition-colors"
                  >
                    Unduh {d.label} <FaDownload />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
