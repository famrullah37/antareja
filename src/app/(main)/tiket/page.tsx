// Data tiket (stok, harga) dari database — harus dirender per request, bukan saat build
// (saat build tidak ada DATABASE_URL). Dulu dinamis "kebetulan" karena membaca sesi.
export const dynamic = "force-dynamic";
import { findTikets, findKonfigTiket } from "@/queries/tiket.query";
import BeliTiketForm from "./BeliTiketForm";
import ShareButtons from "../components/parts/ShareButtons";
import InfoHalaman from "../components/InfoHalaman";
import { getKonfigUmum, type TimelineItem } from "@/queries/konfigUmum.query";
import { getInfoAcara } from "@/lib/acara";
import { siteConfig } from "@/config/site";
import { getServerSession } from "@/lib/next-auth";
import prisma from "@/lib/prisma";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Tiket Penonton LPKBB Antareja 2026 | Lomba Paskibra SMK Telkom Malang" },
  description:
    "Beli tiket penonton LPKBB Antareja 2026 secara online dan saksikan langsung aksi tim paskibra se-Jawa Timur di SMK Telkom Malang. Tiket berupa QR code.",
};

export default async function TiketPage({ searchParams }: { searchParams?: { pilih?: string } }) {
  const [tikets, konfig, konfigUmum, session] = await Promise.all([
    findTikets(),
    findKonfigTiket(),
    getKonfigUmum(),
    getServerSession(),
  ]);
  // Tiket wajib tim hanya bisa dipilih akun yang sudah mendaftarkan tim
  // (dicek ulang di server, actions/Tiket.ts beliTiket).
  const userId = session?.user?.id;
  const punyaTim = userId ? (await prisma.tim.count({ where: { userId } })) > 0 : false;
  // Tiket wajib yang sudah dipesan tim ini (PENDING/VERIFIED) — tidak bisa dipesan lagi.
  const sudahDipesan = punyaTim
    ? (
        await prisma.transaksiTiket.findMany({
          where: { userId, tiket: { khususTim: true }, status: { in: ["PENDING", "VERIFIED"] } },
          select: { tiketId: true },
          distinct: ["tiketId"],
        })
      ).map((t) => t.tiketId)
    : [];
  // Sisa yang ditampilkan = sisa − pesanan PENDING (sisa di DB baru dipotong saat
  // verifikasi) — sama dengan cek stok di beliTiket, supaya tiket yang sudah habis
  // oleh pesanan yang menunggu verifikasi tampil habis.
  const tertahan = await prisma.transaksiTiket.groupBy({
    by: ["tiketId"],
    where: { status: "PENDING" },
    _sum: { jumlah: true },
  });
  const tertahanPer = new Map(tertahan.map((t) => [t.tiketId, t._sum.jumlah ?? 0]));
  const tiketTersedia = tikets.map((t) => ({ ...t, sisa: Math.max(0, t.sisa - (tertahanPer.get(t.id) ?? 0)) }));
  // Akun tim: tiket wajib di depan supaya langsung terlihat.
  const tiketUrut = punyaTim ? [...tiketTersedia].sort((a, b) => Number(b.khususTim) - Number(a.khususTim)) : tiketTersedia;
  // ?pilih=<id> dari tombol "Beli Tiket Wajib" di dashboard: tiket langsung terpilih
  // (form tetap menolak kalau tiket itu tidak boleh dipilih akun ini).
  const pilihAwal = searchParams?.pilih ?? null;
  // Tanggal & jam dari tahap terakhir timeline di Pengaturan (lihat lib/acara.ts).
  const acara = getInfoAcara(konfigUmum.timeline as TimelineItem[] | null);

  return (
    <>
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
        <BeliTiketForm
          tikets={tiketUrut}
          konfig={konfig}
          punyaTim={punyaTim}
          sudahLogin={!!userId}
          sudahDipesan={sudahDipesan}
          pilihAwal={pilihAwal}
        />
      )}
      <div className="mt-10">
        <ShareButtons
          url={`${siteConfig.url}/tiket`}
          judul={`Beli tiket penonton ${siteConfig.name}${acara ? ` — ${acara.tanggalTeks}` : ""}`}
          label="Bagikan link tiket"
        />
      </div>
    </section>
    <InfoHalaman path="/tiket" label="Tiket Penonton" judul="Informasi Tiket Penonton">
      <p>
        Tiket penonton LPKBB Antareja 2026 dapat dibeli secara online di halaman ini. Setelah pembayaran
        diverifikasi panitia, tiket berupa QR code dikirim ke email pembeli dan ditunjukkan saat masuk lokasi.
      </p>
      <p>
        Lokasi acara: {siteConfig.event.venue}, {siteConfig.event.address.streetAddress},{" "}
        {siteConfig.event.address.addressLocality}, {siteConfig.event.address.addressRegion}
        {acara && `. Tanggal: ${acara.tanggalTeks}`}
        {acara?.jamTeks && `, ${acara.jamTeks}`}.
      </p>
    </InfoHalaman>
    </>
  );
}
