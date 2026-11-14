"use client";

import { useEffect, useState } from "react";
import type { ProtectedRoutes } from "@/utils/protectedRoutes";

type Kelompok = { group: string; items: ProtectedRoutes[] }[];

const KUNCI = "admin-menu-folder-terbuka";

// Kelompok menu admin tampil sebagai folder yang bisa dibuka-tutup. Folder
// berisi halaman aktif selalu terbuka; folder lain yang dibuka pengguna
// diingat per browser. Role dengan satu kelompok saja tidak perlu dilipat.
export function useMenuFolder(kelompok: Kelompok, pathname: string) {
  // Menu aktif = rute terpanjang yang cocok dengan URL, supaya /admin/tiket/pos
  // tidak ikut menyalakan "Tiket" & "Scanner Tiket".
  const activePath = kelompok
    .flatMap((k) => k.items.map((i) => i.path))
    .filter((p) => pathname === p || pathname.startsWith(p + "/"))
    .sort((a, b) => b.length - a.length)[0];
  const activeGroup = kelompok.find((k) => k.items.some((i) => i.path === activePath))?.group;

  const [terbuka, setTerbuka] = useState<string[]>([]);

  useEffect(() => {
    try {
      const simpan = JSON.parse(localStorage.getItem(KUNCI) ?? "[]");
      if (Array.isArray(simpan)) setTerbuka(simpan.filter((g) => typeof g === "string"));
    } catch {
      // penyimpanan tidak tersedia — mulai dengan folder tertutup
    }
  }, []);

  const lipat = kelompok.length > 1;
  const isOpen = (group: string) => !lipat || group === activeGroup || terbuka.includes(group);
  const isAktif = (group: string) => group === activeGroup;

  function toggle(group: string) {
    if (!lipat || group === activeGroup) return;
    const next = terbuka.includes(group) ? terbuka.filter((g) => g !== group) : [...terbuka, group];
    setTerbuka(next);
    try {
      localStorage.setItem(KUNCI, JSON.stringify(next));
    } catch {
      // abaikan
    }
  }

  return { activePath, lipat, isOpen, isAktif, toggle };
}
