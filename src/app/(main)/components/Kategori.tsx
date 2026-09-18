import SectionWrapper from "@/app/components/global/Wrapper";
import { getKonfigUmum } from "@/queries/konfigUmum.query";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

const JENJANG_META = [
  {
    color: "from-blue-500 to-blue-600",
    badge: "bg-blue-50 text-blue-600 border-blue-200",
    accent: "text-blue-600",
    dpBg: "bg-blue-50",
  },
  {
    color: "from-violet-500 to-violet-600",
    badge: "bg-violet-50 text-violet-600 border-violet-200",
    accent: "text-violet-600",
    dpBg: "bg-violet-50",
  },
  {
    color: "from-primary-500 to-primary-600",
    badge: "bg-red-50 text-primary-500 border-red-200",
    accent: "text-primary-500",
    dpBg: "bg-red-50",
  },
  {
    color: "from-emerald-500 to-emerald-600",
    badge: "bg-emerald-50 text-emerald-600 border-emerald-200",
    accent: "text-emerald-600",
    dpBg: "bg-emerald-50",
  },
];

export default async function Kategori() {
  const konfig = await getKonfigUmum();

  // Urutan & warna tetap (SD-SMP-SMA-Purna) supaya kartu tidak loncat-loncat
  // posisi/warna cuma karena admin toggle jenjang lain — jenjang yang mati
  // difilter belakangan, bukan dihapus dari susunan dasarnya.
  const jenjangList = [
    { label: "SD", full: "Jenjang SD", harga: konfig.biayaSD, dp: konfig.biayaSDDP, aktif: konfig.sdAktif },
    { label: "SMP", full: "Jenjang SMP", harga: konfig.biayaSMP, dp: konfig.biayaSMPDP, aktif: konfig.smpAktif },
    { label: "SMA", full: "Jenjang SMA", harga: konfig.biayaSMA, dp: konfig.biayaSMADP, aktif: konfig.smaAktif },
    { label: "Purna", full: "Jenjang Purna", harga: konfig.biayaPurna, dp: konfig.biayaPurnaDP, aktif: konfig.purnaAktif },
  ]
    .map((j, i) => ({ ...j, meta: JENJANG_META[i] }))
    .filter((j) => j.aktif);

  if (jenjangList.length === 0) return null;

  return (
    <SectionWrapper id="Kategori" className="mt-16">
      <div className="w-full flex flex-col gap-12">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <span className="inline-flex items-center gap-2 text-primary-500 font-semibold text-sm uppercase tracking-widest">
            <span className="w-8 h-px bg-primary-500" />
            Kategori Lomba
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-black leading-tight">
            Jenjang Perlombaan <br />
            <span className="text-primary-500">Antareja 2026</span>
          </h2>
          <p className="text-gray-500 max-w-md">
            Antareja hadir untuk {jenjangList.length} jenjang perlombaan. Daftarkan tim terbaik Anda sekarang.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {jenjangList.map((j) => {
            const meta = j.meta;
            return (
              <div
                key={j.label}
                className="group bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                {/* Top gradient bar */}
                <div className={`h-2 w-full bg-gradient-to-r ${meta.color}`} />

                <div className="p-7 flex flex-col gap-6">
                  {/* Badge */}
                  <span className={`inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-full border w-fit ${meta.badge}`}>
                    Paskibra {j.full}
                  </span>

                  {/* Price */}
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Biaya Pendaftaran</span>
                    <span className={`text-4xl font-extrabold leading-none ${meta.accent}`}>
                      {formatRupiah(j.harga)}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gray-100" />

                  {/* DP / Lunas */}
                  <div className={`rounded-2xl ${meta.dpBg} p-4 flex flex-col gap-3`}>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">DP 50%</span>
                        <span className="text-sm text-gray-400">Bayar sebagian dulu</span>
                      </div>
                      <span className="text-base font-extrabold text-gray-800">{formatRupiah(j.dp)}</span>
                    </div>
                    <div className="h-px bg-gray-200" />
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Lunas</span>
                        <span className="text-sm text-gray-400">Bayar penuh sekarang</span>
                      </div>
                      <span className="text-base font-extrabold text-gray-800">{formatRupiah(j.harga)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SectionWrapper>
  );
}
