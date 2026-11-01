import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { siteConfig } from "@/config/site";

// Link pesanan tiket untuk pembeli (cek status + upload bukti menyusul) tanpa
// login: /tiket/pesanan/<id>?t=<hmac(id)>. Hanya yang menerima link (layar
// sukses / email pesanan) yang bisa membukanya.

function tanda(id: string) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET belum diset");
  return createHmac("sha256", secret).update(`pesanan-tiket:${id}`).digest("base64url").slice(0, 22);
}

export function linkPesananTiket(id: string) {
  return `${siteConfig.url}/tiket/pesanan/${id}?t=${tanda(id)}`;
}

export function cekTandaPesanan(id: string, t: unknown) {
  if (typeof t !== "string") return false;
  const harap = Buffer.from(tanda(id));
  const dapat = Buffer.from(t);
  return harap.length === dapat.length && timingSafeEqual(harap, dapat);
}
