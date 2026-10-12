// Data tiket (stok, harga) dari database — harus dirender per request, bukan saat build
// (saat build tidak ada DATABASE_URL). Dulu dinamis "kebetulan" karena membaca sesi.
export const dynamic = "force-dynamic";
import { findTikets, findKonfigTiket } from "@/queries/tiket.query";
import BeliTiketForm from "./BeliTiketForm";
import { getKonfigUmum, type TimelineItem } from "@/queries/konfigUmum.query";
import { getInfoAcara } from "@/lib/acara";
import { siteConfig } from "@/config/site";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tiket Penonton Lomba Paskibra",
  description: "Beli tiket penonton LPKBB Antareja 2026 dan saksikan langsung aksi tim-tim terbaik se-Jawa Timur.",
};

export default async function TiketPage() {
  const [tikets, konfig, konfigUmum] = await Promise.all([
    findTikets(),
    findKonfigTiket(),
    getKonfigUmum(),
  ]);
  // Tanggal & jam dari tahap terakhir timeline di Pengaturan (lihat lib/acara.ts).
  const acara = getInfoAcara(konfigUmum.timeline as TimelineItem[] | null);

  return (
    <section className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-2">Beli Tiket</h1>
      <p className="text-gray-500 mb-8">
        Tiket {siteConfig.name} — {siteConfig.event.venue}
        {acara && `, ${acara.tanggalTeks}`}
        {acara?.jamTeks && ` · ${acara.jamTeks}`}
      </p>

      {tikets.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-400">
          Penjualan tiket belum dibuka. Pantau terus website ini.
        </div>
      ) : (
        <BeliTiketForm tikets={tikets} konfig={konfig} />
      )}
    </section>
  );
}
