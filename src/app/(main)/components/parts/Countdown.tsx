"use client";

import { useCountdown } from "@/app/hooks/useCountdown";

function TimeFigure({ time, title }: { time: number; title: string }) {
  const display = time.toString().padStart(2, "0");
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-[72px] h-[72px] sm:w-[90px] sm:h-[90px] rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
        <span className="text-[32px] sm:text-[42px] font-extrabold text-white leading-none tabular-nums">
          {display}
        </span>
      </div>
      <span className="text-white/70 text-xs sm:text-sm font-medium tracking-widest uppercase">
        {title}
      </span>
    </div>
  );
}

export default function Countdown({
  endDate,
  label = "Penutupan Pendaftaran",
}: {
  endDate: Date;
  label?: string;
}) {
  const [days, hours, minutes, seconds] = useCountdown(endDate);

  return (
    <div suppressHydrationWarning className="flex flex-col items-center gap-5">
      <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-white text-xs sm:text-sm font-semibold tracking-wide">
          {label}
        </span>
      </div>
      <div className="flex gap-3 sm:gap-5">
        <TimeFigure time={days} title="Hari" />
        <div className="text-white/50 text-3xl font-bold self-start mt-4">:</div>
        <TimeFigure time={hours} title="Jam" />
        <div className="text-white/50 text-3xl font-bold self-start mt-4">:</div>
        <TimeFigure time={minutes} title="Menit" />
        <div className="text-white/50 text-3xl font-bold self-start mt-4">:</div>
        <TimeFigure time={seconds} title="Detik" />
      </div>
    </div>
  );
}
