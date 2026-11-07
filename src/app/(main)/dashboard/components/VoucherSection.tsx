import { H2 } from "@/app/components/global/Text";
import SectionWrapper from "@/app/components/global/Wrapper";
import prisma from "@/lib/prisma";
import { labelNilai } from "@/lib/voucher";

// Voucher pribadi yang dibuat panitia untuk tim ini (Voucher.sumberTimId) —
// dipakai saat mendaftar di kegiatan berikutnya. Tidak tampil kalau tim tidak punya.
export default async function VoucherSection({ timId }: { timId: string }) {
  const vouchers = await prisma.voucher.findMany({
    where: { sumberTimId: timId },
    orderBy: { createdAt: "asc" },
  });
  if (vouchers.length === 0) return null;

  return (
    <SectionWrapper id="voucher">
      <H2 className="mb-2">Voucher Pendaftaran Berikutnya</H2>
      <div className="flex flex-col gap-3">
        {vouchers.map((v) => {
          const habis = v.kuota != null && v.jumlahDipakai >= v.kuota;
          return (
            <div
              key={v.id}
              className="bg-amber-50 border border-dashed border-amber-300 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
            >
              <div className="text-sm text-gray-700">
                <p>
                  Potongan <b>{labelNilai(v)}</b> biaya pendaftaran
                  {v.jenjang ? ` jenjang ${v.jenjang}` : ""}
                  {v.asalSekolah ? `, khusus tim dari ${v.asalSekolah}` : ""}.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {habis
                    ? "Voucher ini sudah dipakai."
                    : `Terpasang otomatis saat tim dari ${v.asalSekolah ?? "sekolah Anda"} mendaftar di kegiatan berikutnya${v.aktif ? "" : " (setelah pendaftaran dibuka)"}. Kode ini cadangan bila tidak terpasang otomatis.`}
                </p>
              </div>
              <span
                className={`shrink-0 font-mono font-bold text-lg tracking-widest px-4 py-2 rounded-lg bg-white border border-amber-300 text-center select-all ${habis ? "line-through text-gray-400" : ""}`}
              >
                {v.kode}
              </span>
            </div>
          );
        })}
      </div>
    </SectionWrapper>
  );
}
