export const dynamic = "force-dynamic";

import { findBeritas } from "@/queries/berita.query";
import BeritaCard from "./BeritaCard";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Berita",
  description: "Berita dan kabar terbaru seputar LPKBB Antareja — SMK Telkom Malang.",
};

export default async function BeritaListPage() {
  const beritas = await findBeritas({ publish: true });

  return (
    <div className="min-h-screen">
      <div className="bg-primary-500 text-white px-6 py-14 lg:py-20">
        <div className="max-w-5xl mx-auto flex flex-col gap-4">
          <div className="text-xs font-semibold tracking-widest uppercase opacity-70">
            LPKBB Antareja 2026 — SMK Telkom Malang
          </div>
          <h1 className="text-3xl lg:text-5xl font-bold leading-tight">Berita</h1>
          <p className="text-white/80 max-w-xl text-sm lg:text-base">
            Kabar terbaru seputar LPKBB Antareja 2026.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {beritas.length === 0 ? (
          <p className="text-center text-gray-400 py-16">Belum ada berita.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {beritas.map((b) => (
              <BeritaCard key={b.id} berita={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
