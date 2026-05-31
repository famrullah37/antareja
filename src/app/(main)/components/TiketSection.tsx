import { findTikets } from "@/queries/tiket.query";
import { PrimaryLinkButton } from "@/app/components/global/LinkButton";
import SectionWrapper from "@/app/components/global/Wrapper";
import { RightArrow } from "@/app/components/global/Icons";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

export default async function TiketSection() {
  const tikets = await findTikets();
  const available = tikets.filter((t) => t.sisa > 0);

  return (
    <SectionWrapper id="tiket">
      <div className="w-full flex flex-col gap-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex flex-col gap-3">
            <span className="inline-flex items-center gap-2 text-primary-500 font-semibold text-sm uppercase tracking-widest">
              <span className="w-8 h-px bg-primary-500" />
              Tiket Penonton
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-black leading-tight">
              Tiket LKBB <span className="text-primary-500">Antareja</span>
            </h2>
            <p className="text-gray-500 max-w-md">
              Saksikan kemegahan LKBB Antareja Season 4 — SMK Telkom Malang.
            </p>
          </div>
          {available.length > 0 && (
            <PrimaryLinkButton href="/tiket" className="flex items-center gap-2 group px-6 py-3 shrink-0">
              Lihat Semua Tiket
              <RightArrow className="group-hover:translate-x-1 transition-transform" />
            </PrimaryLinkButton>
          )}
        </div>

        {tikets.length === 0 ? (
          <div className="bg-gray-50 rounded-3xl border border-gray-100 p-14 text-center flex flex-col items-center gap-3">
            <span className="text-4xl">🎟️</span>
            <p className="font-semibold text-gray-700">Penjualan tiket segera dibuka</p>
            <p className="text-gray-400 text-sm">Pantau terus website ini untuk update terbaru.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {tikets.map((tiket) => {
              const habis = tiket.sisa <= 0;
              const pct = tiket.kuota > 0 ? Math.round((tiket.sisa / tiket.kuota) * 100) : 0;
              return (
                <div
                  key={tiket.id}
                  className={`group relative bg-white rounded-3xl border overflow-hidden flex flex-col transition-all duration-300 ${
                    habis
                      ? "border-gray-200 opacity-60"
                      : "border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1"
                  }`}
                >
                  {/* Top accent */}
                  <div className={`h-1.5 w-full ${habis ? "bg-gray-200" : "bg-gradient-to-r from-primary-500 to-primary-700"}`} />

                  <div className="p-7 flex flex-col gap-5 flex-1">
                    <div className="flex flex-col gap-1">
                      <span className={`text-xs font-bold uppercase tracking-widest ${habis ? "text-gray-400" : "text-primary-500"}`}>
                        {tiket.jenis}
                      </span>
                      <span className="text-3xl font-extrabold text-black leading-none">
                        {formatRupiah(tiket.harga)}
                      </span>
                    </div>

                    {/* Stock bar */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${habis ? "bg-red-400" : "bg-green-500"}`} />
                          {habis ? "Habis terjual" : `${tiket.sisa} tiket tersisa`}
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${habis ? "bg-red-300" : "bg-gradient-to-r from-green-400 to-green-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-auto">
                      {habis ? (
                        <div className="text-center py-3 text-sm text-gray-400 border border-gray-200 rounded-2xl font-medium">
                          Tiket Habis
                        </div>
                      ) : (
                        <PrimaryLinkButton href="/tiket" className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold group/btn rounded-2xl">
                          Beli Tiket
                          <RightArrow className="group-hover/btn:translate-x-1 transition-transform" />
                        </PrimaryLinkButton>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
