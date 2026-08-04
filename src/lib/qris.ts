import "server-only";
import { Jimp } from "jimp";
import jsQR from "jsqr";
import QRCode from "qrcode";

// ─── EMVCo / QRIS payload helpers ─────────────────────────────────────────────
// Referensi: QRIS Merchant Presented Mode (spesifikasi Bank Indonesia, berbasis EMVCo QR).

type QrisTag = { id: string; value: string };

const POINT_OF_INITIATION_TAG = "01";
const AMOUNT_TAG = "54";
const CRC_TAG = "63";
// Tag yang harus muncul setelah Transaction Amount (54) sesuai urutan EMVCo.
const TAGS_AFTER_AMOUNT = ["55", "57", "58", "59", "60", "61", "62", "63", "64"];

function parseQrisTags(payload: string): QrisTag[] {
  const tags: QrisTag[] = [];
  let i = 0;
  while (i < payload.length) {
    const id = payload.slice(i, i + 2);
    const len = parseInt(payload.slice(i + 2, i + 4), 10);
    if (id.length < 2 || Number.isNaN(len)) break;
    const value = payload.slice(i + 4, i + 4 + len);
    tags.push({ id, value });
    i += 4 + len;
  }
  return tags;
}

function serializeQrisTags(tags: QrisTag[]): string {
  return tags
    .map((t) => `${t.id}${String(t.value.length).padStart(2, "0")}${t.value}`)
    .join("");
}

// CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) — sesuai spesifikasi tag 63 QRIS.
function crc16ccitt(str: string): string {
  let crc = 0xffff;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Ubah payload QRIS statis menjadi QRIS dinamis dengan nominal yang sudah terisi.
 * - Set Point of Initiation Method (01) ke "12" (dinamis).
 * - Sisipkan/replace Transaction Amount (54) dengan nominal transaksi.
 * - Hitung ulang CRC (63).
 */
export function buildDynamicQris(staticPayload: string, amountRupiah: number): string {
  const trimmed = staticPayload.trim();
  const tags = parseQrisTags(trimmed).filter((t) => t.id !== CRC_TAG);

  const poiIndex = tags.findIndex((t) => t.id === POINT_OF_INITIATION_TAG);
  if (poiIndex >= 0) tags[poiIndex] = { id: POINT_OF_INITIATION_TAG, value: "12" };

  const amountTag: QrisTag = { id: AMOUNT_TAG, value: String(Math.round(amountRupiah)) };
  const withoutAmount = tags.filter((t) => t.id !== AMOUNT_TAG);
  const insertAt = withoutAmount.findIndex((t) => TAGS_AFTER_AMOUNT.includes(t.id));
  const finalTags =
    insertAt >= 0
      ? [...withoutAmount.slice(0, insertAt), amountTag, ...withoutAmount.slice(insertAt)]
      : [...withoutAmount, amountTag];

  const withoutCrc = serializeQrisTags(finalTags) + `${CRC_TAG}04`;
  return withoutCrc + crc16ccitt(withoutCrc);
}

/** Baca payload QRIS mentah dari gambar (hasil decode QR pada gambar QRIS statis). */
export async function decodeQrisFromImage(buffer: Buffer): Promise<string | null> {
  try {
    const image = await Jimp.read(buffer);
    const { data, width, height } = image.bitmap;
    const result = jsQR(new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength), width, height);
    return result?.data ?? null;
  } catch {
    return null;
  }
}

/** Generate gambar QR (data URL) dari payload QRIS dinamis. */
export async function generateQrisImageDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, { width: 320, margin: 1 });
}

/**
 * Dari payload statis + nominal, langsung hasilkan data URL QRIS dinamis siap-scan.
 * Mengembalikan null bila payload statis tidak tersedia/tidak valid.
 */
export async function buildDynamicQrisImage(
  staticPayload: string | null | undefined,
  amountRupiah: number
): Promise<string | null> {
  if (!staticPayload || amountRupiah <= 0) return null;
  try {
    const dynamicPayload = buildDynamicQris(staticPayload, amountRupiah);
    return await generateQrisImageDataUrl(dynamicPayload);
  } catch {
    return null;
  }
}
