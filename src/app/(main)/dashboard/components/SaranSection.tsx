import { H2 } from "@/app/components/global/Text";
import SectionWrapper from "@/app/components/global/Wrapper";
import prisma from "@/lib/prisma";
import { labelKategoriSaran } from "@/lib/saranTim";
import SaranForm from "./SaranForm";

// Saran & masukan tim untuk panitia, beserta riwayat dan tanggapan panitia.
export default async function SaranSection({ timId }: { timId: string }) {
  const riwayat = await prisma.saranTim.findMany({
    where: { timId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <SectionWrapper id="saran">
      <H2 className="mb-2">Saran & Masukan</H2>
      <p className="text-sm text-gray-500 mb-5">
        Sampaikan saran, kritik, atau masukan untuk panitia LPKBB Antareja. Masukanmu dipakai untuk memperbaiki
        kegiatan berikutnya.
      </p>
      <SaranForm />

      {riwayat.length > 0 && (
        <div className="mt-8 flex flex-col gap-3">
          <h3 className="font-semibold">Masukan yang sudah dikirim</h3>
          {riwayat.map((s) => (
            <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-2">
                <span className="bg-neutral-100 rounded-full px-2.5 py-0.5 font-semibold text-gray-700">
                  {labelKategoriSaran(s.kategori)}
                </span>
                {s.rating && <span className="text-amber-500">{"★".repeat(s.rating)}{"☆".repeat(5 - s.rating)}</span>}
                <span>
                  {s.createdAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>
              <p className="whitespace-pre-line text-gray-800">{s.isi}</p>
              {s.tanggapan && (
                <div className="mt-3 bg-primary-50 border-l-4 border-primary-400 rounded-r-lg px-3 py-2">
                  <div className="text-xs font-semibold text-primary-600 mb-0.5">Tanggapan panitia</div>
                  <p className="whitespace-pre-line text-gray-700">{s.tanggapan}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionWrapper>
  );
}
