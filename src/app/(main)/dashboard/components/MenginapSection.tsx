import { H2 } from "@/app/components/global/Text";
import SectionWrapper from "@/app/components/global/Wrapper";
import { findPengajuanMenginapByTim } from "@/queries/menginap.query";
import FormMenginap from "./parts/FormMenginap";

// Pengajuan menginap: tampil kalau panitia membuka pengajuan (KonfigUmum.menginapAktif)
// atau tim sudah pernah mengajukan (statusnya tetap terlihat).
export default async function MenginapSection({
  timId,
  confirmed,
  aktif,
  info,
}: {
  timId: string;
  confirmed: boolean;
  aktif: boolean;
  info: string | null;
}) {
  const pengajuan = await findPengajuanMenginapByTim(timId);
  if (!aktif && !pengajuan) return null;

  return (
    <SectionWrapper id="menginap">
      <H2 className="mb-2">Pengajuan Menginap</H2>
      {!confirmed ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-4 text-sm">
          Pengajuan menginap dibuka setelah pembayaran tim diverifikasi panitia.
        </div>
      ) : (
        <>
          {info && <p className="text-sm text-gray-500 mb-4 whitespace-pre-line">{info}</p>}
          <FormMenginap pengajuan={pengajuan} aktif={aktif} />
        </>
      )}
    </SectionWrapper>
  );
}
