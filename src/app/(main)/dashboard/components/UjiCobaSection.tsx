import { H2 } from "@/app/components/global/Text";
import SectionWrapper from "@/app/components/global/Wrapper";
import { findSesiUjiCobaPublik } from "@/queries/ujiCoba.query";
import { formatTanggalWib, formatJamWib, ujiCobaTerkunci } from "@/lib/ujiCoba";
import PilihSlotUjiCoba from "./parts/PilihSlotUjiCoba";

// Pendaftaran uji coba lapangan: tampil begitu admin membuat sesi. Tim yang
// pembayarannya sudah diverifikasi memilih satu slot (lihat actions/UjiCoba.ts).
export default async function UjiCobaSection({
  timId,
  confirmed,
  batas,
}: {
  timId: string;
  confirmed: boolean;
  batas: Date | null;
}) {
  const sesiDb = await findSesiUjiCobaPublik();
  if (sesiDb.length === 0) return null;

  // Ke browser hanya dikirim "terisi atau tidak" — siapa pengisinya tidak.
  const sesi = sesiDb.map(({ bookings, ...s }) => ({
    ...s,
    terisi: bookings.filter((b) => b.timId !== timId).map((b) => b.mulai.toISOString()),
  }));
  const milikku = sesiDb.flatMap((s) =>
    s.bookings.filter((b) => b.timId === timId).map((b) => ({ sesiId: s.id, mulai: b.mulai.toISOString() }))
  )[0] ?? null;

  return (
    <SectionWrapper id="uji-coba">
      <H2 className="mb-2">Uji Coba Lapangan</H2>
      {!confirmed ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-4 text-sm">
          Pendaftaran uji coba lapangan dibuka setelah pembayaran tim diverifikasi panitia.
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            Pilih satu slot untuk tim kamu. Satu slot hanya untuk satu tim — siapa cepat dia dapat.
            {batas &&
              ` Slot bisa diganti atau dibatalkan sampai ${formatTanggalWib(batas)} pukul ${formatJamWib(batas)} WIB.`}
          </p>
          <PilihSlotUjiCoba sesi={sesi} milikku={milikku} terkunci={ujiCobaTerkunci(batas)} />
        </>
      )}
    </SectionWrapper>
  );
}
