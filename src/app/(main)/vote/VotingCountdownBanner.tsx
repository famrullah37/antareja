"use client";

import { useCountdown } from "@/app/hooks/useCountdown";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

// Target selalu di masa depan saat komponen ini pertama kali dirender (halaman
// server yang memutuskan kapan menampilkannya berdasarkan waktu request) — jadi
// begitu hitungan mundur habis, refresh halaman supaya server re-evaluasi status
// (voting jadi buka/tutup) tanpa user harus reload manual.
export default function VotingCountdownBanner({
  target,
  label,
  tone,
}: {
  target: Date;
  label: string;
  tone: "buka" | "tutup";
}) {
  const [days, hours, minutes, seconds] = useCountdown(target);
  const router = useRouter();
  const refreshed = useRef(false);
  const habis = days === 0 && hours === 0 && minutes === 0 && seconds === 0;

  useEffect(() => {
    if (habis && !refreshed.current) {
      refreshed.current = true;
      router.refresh();
    }
  }, [habis, router]);

  const toneClass =
    tone === "buka"
      ? "bg-blue-50 border-blue-200 text-blue-800"
      : "bg-amber-50 border-amber-200 text-amber-800";

  return (
    <div
      suppressHydrationWarning
      className={`rounded-2xl border p-4 flex flex-wrap items-center justify-center gap-3 text-sm font-semibold ${toneClass}`}
    >
      <span>{label}</span>
      <span className="font-mono text-base tabular-nums">
        {String(days).padStart(2, "0")}h : {String(hours).padStart(2, "0")}j : {String(minutes).padStart(2, "0")}m : {String(seconds).padStart(2, "0")}d
      </span>
    </div>
  );
}
