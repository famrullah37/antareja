import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { BERLAKU_KODE_MENIT, BERLAKU_KODE_MS } from "@/lib/kodeUnik";

// Kode unik hanya angka yang dikirim balik oleh browser, jadi waktu pencadangannya
// ditandatangani server: token = "<diterbitkan ms>.<hmac(kode.diterbitkan)>".
// Tanpa tabel tambahan — cukup dicek saat pesanan QRIS dikirim.

// Kelonggaran setelah QRIS hilang dari layar: pembeli yang membayar di menit
// terakhir masih sempat mengirim pesanan/bukti.
const TOLERANSI_KIRIM_MS = 10 * 60 * 1000;

function tanda(kode: string, diterbitkan: number) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET belum diset");
  return createHmac("sha256", secret).update(`kode-unik:${kode}.${diterbitkan}`).digest("base64url");
}

export function terbitkanTokenKode(kode: string) {
  const diterbitkan = Date.now();
  return { kodeToken: `${diterbitkan}.${tanda(kode, diterbitkan)}`, berlakuSampai: diterbitkan + BERLAKU_KODE_MS };
}

// null = token sah & masih berlaku; selain itu pesan error untuk pembeli.
export function cekTokenKode(token: unknown, kode: string): string | null {
  const [ts, sig] = typeof token === "string" ? token.split(".") : [];
  const diterbitkan = Number(ts);
  if (!sig || !Number.isSafeInteger(diterbitkan)) return "Kode pembayaran tidak valid, silakan buat kode baru";
  const harap = Buffer.from(tanda(kode, diterbitkan));
  const dapat = Buffer.from(sig);
  if (harap.length !== dapat.length || !timingSafeEqual(harap, dapat))
    return "Kode pembayaran tidak valid, silakan buat kode baru";
  if (Date.now() > diterbitkan + BERLAKU_KODE_MS + TOLERANSI_KIRIM_MS)
    return `Kode pembayaran sudah kedaluwarsa (lebih dari ${BERLAKU_KODE_MENIT} menit) — QRIS lama tidak berlaku, silakan buat kode baru`;
  return null;
}
