"use client";

import { signOut, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

// Auto-logout kalau tidak ada aktivitas — supaya sesi yang lupa di-logout
// (mis. di komputer/HP bersama, warnet, dsb) tidak nganggur login selamanya.
//
// Waktu aktivitas terakhir disimpan di localStorage (dipakai bersama semua tab
// & bertahan setelah reload), BUKAN cuma timer di memori: di HP tab yang lama
// di background dibekukan/dimuat ulang browser sehingga timer mulai dari nol
// lagi, padahal cookie sesi (30 hari) masih valid → user tetap login walau sudah
// lebih dari 30 menit tidak aktif. Cek dilakukan saat halaman dibuka, saat tab
// kembali aktif, dan saat timer habis. Ini pengaman kenyamanan (client-side),
// bukan pengganti kontrol keamanan server.
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVITY_KEY = "antareja:lastActivity";
const NOTICE_KEY = "antareja:idleLogout";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"] as const;

function readLastActivity(): number {
  try {
    return Number(localStorage.getItem(ACTIVITY_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeLastActivity(t: number) {
  try {
    localStorage.setItem(ACTIVITY_KEY, String(t));
  } catch {
    // localStorage bisa diblokir (mode privat) — idle-logout jadi tidak aktif, bukan error.
  }
}

export default function IdleLogout() {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  // Pesan setelah diarahkan ke landing page karena idle (toast sebelum reload akan hilang).
  useEffect(() => {
    let flagged = false;
    try {
      flagged = !!localStorage.getItem(NOTICE_KEY);
      if (flagged) localStorage.removeItem(NOTICE_KEY);
    } catch {}
    if (!flagged) return;
    const t = setTimeout(
      () => toast.error("Sesi berakhir karena tidak ada aktivitas. Silakan login kembali.", { duration: 6000 }),
      600
    );
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // Sesi berakhir (JWT expired/dicabut, dsb) bisa terjadi kapan saja tanpa
    // lewat logout() di bawah (mis. cookie 30 hari akhirnya habis) — tanpa
    // redirect ini, user tetap di halaman admin/dashboard yang sudah
    // ter-render dengan data lama, kelihatan seperti masih login padahal
    // sesinya sudah mati di server. Cuma redirect kalau memang di halaman
    // yang butuh login, supaya pengunjung biasa di landing page tidak
    // ke-lempar ke /auth/login.
    if (status === "unauthenticated") {
      try {
        localStorage.removeItem(ACTIVITY_KEY);
      } catch {}
      if (pathname?.startsWith("/admin") || pathname?.startsWith("/dashboard")) {
        router.replace("/auth/login");
      }
      return;
    }
    if (status !== "authenticated") return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let loggingOut = false;
    let lastWrite = 0;

    const logout = () => {
      if (loggingOut) return;
      loggingOut = true;
      try {
        localStorage.setItem(NOTICE_KEY, "1");
        localStorage.removeItem(ACTIVITY_KEY);
      } catch {}
      // Redirect manual (tidak bergantung NEXTAUTH_URL), lihat useSignOut.
      signOut({ redirect: false }).finally(() => {
        window.location.href = "/";
      });
    };

    const check = () => {
      clearTimeout(timer);
      const last = readLastActivity();
      if (!last) {
        writeLastActivity(Date.now());
        timer = setTimeout(check, IDLE_TIMEOUT_MS);
        return;
      }
      const idleFor = Date.now() - last;
      if (idleFor >= IDLE_TIMEOUT_MS) return logout();
      timer = setTimeout(check, IDLE_TIMEOUT_MS - idleFor + 500);
    };

    // Throttle: mousemove/scroll bisa menembak puluhan event per detik.
    const onActivity = () => {
      const now = Date.now();
      if (now - lastWrite < 5000) return;
      lastWrite = now;
      // Aktivitas pertama setelah lewat batas idle tidak boleh menghidupkan
      // sesi lagi (mis. laptop baru bangun dari sleep).
      const last = readLastActivity();
      if (last && now - last >= IDLE_TIMEOUT_MS) return logout();
      writeLastActivity(now);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };

    check();
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", check);

    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
      window.removeEventListener("pageshow", check);
    };
    // pathname/router sengaja tidak dimasukkan — efek ini cuma perlu jalan
    // ulang saat status auth berubah, bukan tiap pindah halaman.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return null;
}
