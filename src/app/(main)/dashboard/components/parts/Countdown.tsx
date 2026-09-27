"use client";

import { H2, H5 } from "@/app/components/global/Text";
import { useCountdown } from "@/app/hooks/useCountdown";

const endDate = new Date("11/8/2026");

function TimeFigure({
  time,
  title,
}: Readonly<{ time: number; title: string }>) {
  return (
    <figure className="flex flex-col items-center gap-3">
      <div className="sm:p-[30px] rounded-[14px] sm:rounded-[18px] w-[66px] h-[70px] sm:w-[108px] sm:h-[110px] bg-primary-500 drop-shadow-glow flex flex-col justify-center items-center">
        <span className="text-[28px] sm:text-[50px] text-white font-bold leading-[1]">
          {time.toString().length >= 2 ? time : "0" + time.toString()}
        </span>
      </div>
      <H5>{title}</H5>
    </figure>
  );
}

export default function Countdown() {
  const [days, hours, minutes, seconds] = useCountdown(endDate);

  return (
    <figure className="flex flex-col gap-4">
      <H2>Waktu Tersisa Sebelum Hari-H</H2>
      <div className="flex gap-2 sm:gap-[17px] w-full justify-center">
        <TimeFigure time={days} title="Hari" />
        <TimeFigure time={hours} title="Jam" />
        <TimeFigure time={minutes} title="Menit" />
        <TimeFigure time={seconds} title="Detik" />
      </div>
    </figure>
  );
}
