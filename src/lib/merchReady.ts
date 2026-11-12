import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import prisma from "@/lib/prisma";
import type { ItemPesanan } from "@/lib/merchandise";
import { incrementCounterUrutMerch } from "@/queries/merchandise.query";

// Helper penjualan merchandise READY STOCK (setelah PO ditutup).

export const BATAS_BAYAR_JAM = 48;

// Klien transaksi minimal (prisma di repo ini memakai extension, jadi tipe
// Prisma.TransactionClient bawaan tidak cocok).
type Tx = { pesananMerch: typeof prisma.pesananMerch; stokMerch: typeof prisma.stokMerch };

// Status yang memegang kode unik — kode yang sama tidak boleh dipakai dua
// pesanan sekaligus, supaya transfer bisa dicocokkan.
export const STATUS_KODE_AKTIF = ["MENUNGGU_BAYAR", "PENDING", "VERIFIED"];

export function batasBayarDariSekarang(now = new Date()) {
  return new Date(now.getTime() + BATAS_BAYAR_JAM * 60 * 60 * 1000);
}

export function buatAksesToken() {
  return randomBytes(24).toString("hex");
}

export function tokenCocok(simpan: string | null, dari: string | null | undefined) {
  if (!simpan || !dari || simpan.length !== dari.length) return false;
  return timingSafeEqual(Buffer.from(simpan), Buffer.from(dari));
}

export function linkPesananMerch(id: string, token: string) {
  const base = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/merchandise/pesanan/${id}?t=${token}`;
}

// Kode unik 3 digit yang sedang tidak dipakai pesanan lain (maks. 20 percobaan).
export async function terbitkanKodeUnikMerch(tx: Tx = prisma) {
  for (let i = 0; i < 20; i++) {
    const { counterUrut } = await incrementCounterUrutMerch();
    const kode = String(counterUrut % 1000).padStart(3, "0");
    const dipakai = await tx.pesananMerch.findFirst({
      where: { kodeUnik: kode, status: { in: STATUS_KODE_AKTIF } },
      select: { id: true },
    });
    if (!dipakai) return kode;
  }
  throw new Error("KODE_UNIK_HABIS");
}

export async function kembalikanStokMerch(tx: Tx, items: ItemPesanan[]) {
  for (const i of items) {
    await tx.stokMerch.updateMany({
      where: { merchId: i.merchId, ukuran: i.ukuran ?? "" },
      data: { stok: { increment: i.jumlah } },
    });
  }
}

// Pesanan READY yang lewat batas bayar → BATAL & stok kembali. Dipanggil saat
// halaman merchandise (publik/admin) dibuka & sebelum pesanan baru — tanpa cron.
export async function kedaluwarsakanPesananReady() {
  const lewat = await prisma.pesananMerch.findMany({
    where: { jenis: "READY", status: "MENUNGGU_BAYAR", batasBayar: { lt: new Date() } },
    select: { id: true },
  });
  for (const { id } of lewat) {
    try {
      await prisma.$transaction(async (tx) => {
        const klaim = await tx.pesananMerch.updateMany({
          where: { id, status: "MENUNGGU_BAYAR" },
          data: { status: "BATAL", catatanAdmin: "Otomatis batal: lewat batas bayar" },
        });
        if (klaim.count === 0) return;
        const p = await tx.pesananMerch.findUniqueOrThrow({ where: { id } });
        await kembalikanStokMerch(tx, p.items as ItemPesanan[]);
      });
    } catch (e) {
      console.error("kedaluwarsakanPesananReady error:", e);
    }
  }
  return lewat.length;
}
