import SectionWrapper from "@/app/components/global/Wrapper";

const timelineData = [
  {
    step: "01",
    title: "Pendaftaran Peserta",
    dateString: "1 Sep – 8 Nov 2026",
    description: "Pendaftaran melalui website antareja.smktelkom-mlg.sch.id",
    icon: "📋",
  },
  {
    step: "02",
    title: "Technical Meeting",
    dateString: "11 Oktober 2026",
    description: "Dilaksanakan di SMK Telkom Malang",
    icon: "🤝",
  },
  {
    step: "03",
    title: "Uji Coba Lapangan",
    dateString: "14 November 2026",
    description: "15.00–18.00 WIB (Malang) · 19.00–22.30 WIB (Luar Malang)",
    icon: "🏃",
  },
  {
    step: "04",
    title: "Pelaksanaan Lomba",
    dateString: "15 November 2026",
    description: "06.00 WIB – selesai di SMK Telkom Malang",
    icon: "🏆",
  },
];

export default function Timeline() {
  return (
    <SectionWrapper id="timeline">
      <div className="w-full flex flex-col gap-12">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <span className="inline-flex items-center gap-2 text-primary-500 font-semibold text-sm uppercase tracking-widest">
            <span className="w-8 h-px bg-primary-500" />
            Jadwal Kegiatan
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 leading-tight">
            <span className="text-primary-500">Timeline</span> Perlombaan
          </h2>
          <p className="text-gray-500">Rangkaian kegiatan Antareja 2026 dari awal hingga akhir.</p>
        </div>

        {/* Timeline — mobile vertical */}
        <div className="flex flex-col gap-0 lg:hidden">
          {timelineData.map((item, idx) => (
            <div key={item.step} className="flex gap-5">
              {/* Dot & line */}
              <div className="flex flex-col items-center shrink-0 pt-1">
                <div className="w-10 h-10 rounded-2xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/30 shrink-0">
                  <span className="text-white font-extrabold text-xs">{item.step}</span>
                </div>
                {idx < timelineData.length - 1 && (
                  <div className="w-0.5 flex-1 bg-gradient-to-b from-primary-300 to-primary-100 my-2" />
                )}
              </div>
              {/* Content */}
              <div className="pb-8 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-bold text-gray-800">{item.title}</span>
                </div>
                <span className="text-primary-500 font-semibold text-sm">{item.dateString}</span>
                <span className="text-gray-500 text-sm leading-relaxed">{item.description}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline — desktop horizontal */}
        <div className="hidden lg:flex items-start justify-between relative gap-4">
          {/* Connector line */}
          <div className="absolute top-5 left-0 right-0 h-[3px] bg-primary-500 opacity-20 mx-8 rounded-full" />
          <div className="absolute top-5 left-0 right-0 h-[3px] bg-gradient-to-r from-primary-500 via-primary-300 to-primary-500 mx-8 rounded-full" />

          {timelineData.map((item) => (
            <div key={item.step} className="relative flex-1 flex flex-col items-center gap-4">
              {/* Step bubble */}
              <div className="relative z-10 w-10 h-10 rounded-2xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
                <span className="text-white font-extrabold text-xs">{item.step}</span>
              </div>

              {/* Card */}
              <div className="group w-full bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 p-5 flex flex-col gap-2">
                <span className="text-2xl">{item.icon}</span>
                <div className="inline-flex px-2.5 py-1 bg-primary-50 text-primary-600 text-xs font-bold rounded-lg w-fit">
                  {item.dateString}
                </div>
                <p className="font-bold text-gray-800 text-sm leading-snug">{item.title}</p>
                <p className="text-gray-500 text-xs leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
