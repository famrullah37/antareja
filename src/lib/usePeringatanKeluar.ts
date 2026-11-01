"use client";

import { useEffect } from "react";

// Tanya dulu sebelum meninggalkan halaman yang pesanannya belum dikirim (mis.
// QRIS sudah tampil / sudah dibayar tapi tombol kirim belum ditekan).
// - beforeunload: tutup tab, refresh, ketik URL lain (browser menampilkan teks bawaannya sendiri)
// - klik <a> internal: navigasi client-side Next.js tidak memicu beforeunload
export function usePeringatanKeluar(aktif: boolean, pesan: string) {
  useEffect(() => {
    if (!aktif) return;
    const sebelumUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const klik = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || a.target === "_blank" || a.hasAttribute("download")) return;
      const tujuan = new URL(a.href, location.href);
      if (tujuan.origin !== location.origin) return;
      if (tujuan.pathname === location.pathname && tujuan.search === location.search) return;
      if (!window.confirm(pesan)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener("beforeunload", sebelumUnload);
    document.addEventListener("click", klik, true);
    return () => {
      window.removeEventListener("beforeunload", sebelumUnload);
      document.removeEventListener("click", klik, true);
    };
  }, [aktif, pesan]);
}
