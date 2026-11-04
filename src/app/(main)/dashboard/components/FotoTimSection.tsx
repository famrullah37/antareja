import { H2 } from "@/app/components/global/Text";
import SectionWrapper from "@/app/components/global/Wrapper";
import prisma from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import InfoBelumDibuka from "./parts/InfoBelumDibuka";

// Foto tim di galeri (Foto.timId). Pratinjau selalu versi watermark — file asli
// foto berbayar tidak boleh terkirim ke browser (lihat galeri/page.tsx).
export default async function FotoTimSection({ timId }: { timId: string }) {
  const where = { timId, statusPublish: true, album: { statusPublish: true } };
  const [jumlah, preview] = await Promise.all([
    prisma.foto.count({ where }),
    prisma.foto.findMany({
      where,
      select: { id: true, pathWatermark: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);
  const link = `/galeri?tim=${encodeURIComponent(timId)}`;

  return (
    <SectionWrapper id="foto-tim">
      <H2 className="mb-2">Foto Tim Kamu</H2>
      {jumlah === 0 ? (
        <InfoBelumDibuka>Foto tim kamu belum tersedia di galeri. Foto akan muncul setelah diunggah fotografer.</InfoBelumDibuka>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {preview.map((f) => (
              <Link key={f.id} href={link} className="relative aspect-square rounded-xl overflow-hidden bg-neutral-100">
                <Image src={f.pathWatermark} alt="Foto tim" fill className="object-cover" sizes="(max-width: 640px) 50vw, 25vw" />
              </Link>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <p className="text-sm text-gray-600">
              Ada <b>{jumlah}</b> foto tim kamu di galeri. Bagikan link galeri tim ke pendamping & orang tua — foto bisa
              dibeli tanpa login.
            </p>
            <Link
              href={link}
              className="shrink-0 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors text-center"
            >
              Lihat Semua Foto Tim
            </Link>
          </div>
        </div>
      )}
    </SectionWrapper>
  );
}
