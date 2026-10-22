import { H2 } from "@/app/components/global/Text";
import SectionWrapper from "@/app/components/global/Wrapper";

// Grup WhatsApp peserta (KonfigUmum.grupWaUrl). Link hanya dirender untuk tim
// yang pembayarannya sudah diverifikasi — tim lain hanya melihat keterangan.
export default function GrupWaSection({ confirmed, url }: { confirmed: boolean; url: string | null }) {
  if (!url) return null;

  return (
    <SectionWrapper id="grup-wa">
      <H2 className="mb-2">Grup WhatsApp Peserta</H2>
      {!confirmed ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-4 text-sm">
          Link grup WhatsApp peserta tersedia setelah pembayaran tim diverifikasi panitia.
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <p className="text-sm text-gray-700">
            Pembayaran tim sudah terverifikasi. Bergabunglah ke grup WhatsApp peserta untuk informasi terbaru dari panitia.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors text-center"
          >
            Gabung Grup WhatsApp
          </a>
        </div>
      )}
    </SectionWrapper>
  );
}
