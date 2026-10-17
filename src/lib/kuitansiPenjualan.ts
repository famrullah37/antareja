import "server-only";
import prisma from "@/lib/prisma";
import { buildKuitansiUmumPdf } from "@/lib/kuitansi";
import { ensureNomorKuitansiFoto, ensureNomorKuitansiTiket } from "@/lib/nomorKuitansi";
import { getKonfigUmum } from "@/queries/konfigUmum.query";

// Kuitansi PDF tiket penonton & foto premium (online, sudah VERIFIED).
// Nominal di kuitansi = harga tanpa kode unik — sama dengan aturan kuitansi
// pendaftaran (kode unik hanya alat mencocokkan transfer, bukan biaya).

export type HasilKuitansi = { pdf: Buffer; nomor: string; filename: string };

const metode = (m: string) => (m === "QRIS" ? "QRIS" : "Transfer Bank");
const namaFile = (nomor: string) => `Kuitansi-${nomor.replace(/[^A-Za-z0-9]+/g, "-")}.pdf`;

export async function buatKuitansiTiket(id: string): Promise<HasilKuitansi | null> {
  const tr = await prisma.transaksiTiket.findUnique({ where: { id }, include: { tiket: true } });
  if (!tr || tr.status !== "VERIFIED" || tr.jenisJual !== "ONLINE") return null;
  const terbit = await ensureNomorKuitansiTiket(id);
  if (!terbit) return null;
  const konfig = await getKonfigUmum();
  const pdf = await buildKuitansiUmumPdf({
    nomor: terbit.nomor,
    judul: "KUITANSI PEMBELIAN TIKET",
    baris: [
      ["Diterima dari", tr.nama],
      ["Pembelian", `Tiket ${tr.tiket.jenis} × ${tr.jumlah}`],
      ...(tr.bundleJumlah > 0 ? [["Bundling", `${tr.bundleIsi ?? "Bundling"} × ${tr.bundleJumlah}`] as [string, string]] : []),
      ["Pembayaran", `${metode(tr.metodePembayaran)} — Lunas`],
    ],
    total: tr.tiket.harga * tr.jumlah + tr.bundleHarga * tr.bundleJumlah,
    tanggal: terbit.tanggal,
    catatan:
      "Kuitansi ini digenerate otomatis oleh sistem setelah pembayaran diverifikasi. " +
      "QR code tiket dikirim terpisah lewat email dan ditunjukkan saat masuk lokasi.",
    bendaharaNama: konfig.bendaharaNama,
    bendaharaTtdUrl: konfig.bendaharaTtdUrl,
  });
  return { pdf, nomor: terbit.nomor, filename: namaFile(terbit.nomor) };
}

export async function buatKuitansiFoto(id: string): Promise<HasilKuitansi | null> {
  const tr = await prisma.transaksiFoto.findUnique({ where: { id } });
  if (!tr || tr.status !== "VERIFIED") return null;
  const terbit = await ensureNomorKuitansiFoto(id);
  if (!terbit) return null;
  const konfig = await getKonfigUmum();
  const jumlahFoto = Array.isArray(tr.fotoList) ? tr.fotoList.length : 0;
  const pdf = await buildKuitansiUmumPdf({
    nomor: terbit.nomor,
    judul: "KUITANSI PEMBELIAN FOTO",
    baris: [
      ["Diterima dari", tr.namaPembeli || tr.email || "Pembeli"],
      ["Pembelian", `Foto Premium (${jumlahFoto} foto)`],
      ["Pembayaran", `${metode(tr.metodePembayaran)} — Lunas`],
    ],
    total: tr.harga - (tr.kodeUnik ? parseInt(tr.kodeUnik, 10) : 0),
    tanggal: terbit.tanggal,
    catatan:
      "Kuitansi ini digenerate otomatis oleh sistem setelah pembayaran diverifikasi. " +
      "Link unduhan foto dikirim terpisah lewat email.",
    bendaharaNama: konfig.bendaharaNama,
    bendaharaTtdUrl: konfig.bendaharaTtdUrl,
  });
  return { pdf, nomor: terbit.nomor, filename: namaFile(terbit.nomor) };
}
