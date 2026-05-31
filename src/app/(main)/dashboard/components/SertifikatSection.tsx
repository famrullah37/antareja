import { H2 } from "@/app/components/global/Text";
import SectionWrapper from "@/app/components/global/Wrapper";
import Image from "next/image";
import { FaDownload, FaAward } from "react-icons/fa";

type SertifikatData = {
  id: string;
  namaAnggota?: string | null;
  namaJuara: string | null;
  fileUrl: string;
};

function SertifikatCard({ s }: { s: SertifikatData }) {
  const isPdf = s.fileUrl.toLowerCase().includes(".pdf") || s.fileUrl.includes("/raw/");

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
      <div className="flex items-center justify-center bg-primary-50 rounded-xl w-[72px] h-[56px] shrink-0">
        {isPdf ? (
          <FaAward className="text-primary-500 text-3xl" />
        ) : (
          <Image
            src={s.fileUrl}
            alt="sertifikat"
            width={72}
            height={56}
            className="rounded-xl object-cover w-full h-full"
            unoptimized
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-gray-800 truncate">
          {s.namaAnggota ?? s.namaJuara ?? "Sertifikat Peserta"}
        </div>
        {s.namaJuara && s.namaAnggota && (
          <div className="text-xs text-gray-400 truncate">{s.namaJuara}</div>
        )}
      </div>

      <a
        href={s.fileUrl}
        download
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shrink-0"
      >
        <FaDownload className="text-[10px]" />
        Download
      </a>
    </div>
  );
}

export default function SertifikatSection({ sertifikat }: { sertifikat: SertifikatData[] }) {
  if (!sertifikat || sertifikat.length === 0) return null;

  return (
    <SectionWrapper id="sertifikat-saya">
      <div className="flex items-center justify-between mb-4">
        <H2>Sertifikat</H2>
        <span className="text-sm text-gray-400">{sertifikat.length} file</span>
      </div>
      <div className="flex flex-col gap-3">
        {sertifikat.map((s) => (
          <SertifikatCard key={s.id} s={s} />
        ))}
      </div>
    </SectionWrapper>
  );
}
