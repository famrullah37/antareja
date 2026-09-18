"use client";

import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

// Auto-logout kalau tidak ada aktivitas — supaya sesi yang lupa di-logout
// (mis. di komputer/HP bersama, warnet, dsb) tidak nganggur login selamanya.
// 30 menit idle → tampilkan peringatan 1 menit terakhir → logout otomatis.
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_BEFORE_MS = 60 * 1000;

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"] as const;

export default function IdleLogout() {
  const { status } = useSession();
  const warningTimer = useRef<ReturnType<typeof setTimeout>>();
  const logoutTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastReset = useRef(0);

  useEffect(() => {
    if (status !== "authenticated") return;

    function clearTimers() {
      clearTimeout(warningTimer.current);
      clearTimeout(logoutTimer.current);
    }

    function scheduleTimers() {
      clearTimers();
      warningTimer.current = setTimeout(() => {
        toast.warning("Sesi akan berakhir karena tidak ada aktivitas dalam 1 menit.", {
          duration: WARNING_BEFORE_MS,
        });
      }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);
      logoutTimer.current = setTimeout(() => {
        toast.error("Sesi berakhir karena tidak ada aktivitas. Silakan login kembali.");
        signOut({ callbackUrl: "/auth/login" });
      }, IDLE_TIMEOUT_MS);
    }

    // Throttle reset ke maksimal sekali per 5 detik — mousemove/scroll bisa
    // menembak puluhan event per detik, tidak perlu reset timer sesering itu.
    function handleActivity() {
      const now = Date.now();
      if (now - lastReset.current < 5000) return;
      lastReset.current = now;
      scheduleTimers();
    }

    scheduleTimers();
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, handleActivity));
    };
  }, [status]);

  return null;
}
