import type { Jenjang } from "@prisma/client";

// Dokumen yang diupload admin di Pengaturan dan diunduh peserta di dashboard,
// per jenjang tim. Hanya SMP & SMA yang butuh surat undangan/rekomendasi.
export const DOKUMEN_JENIS = {
  undangan: "Surat Undangan",
  rekomendasi: "Surat Rekomendasi Diknas",
} as const;
export const DOKUMEN_JENJANG = ["SMP", "SMA"] as const satisfies readonly Jenjang[];

export type DokumenJenis = keyof typeof DOKUMEN_JENIS;
export type DokumenKey = `${DokumenJenis}-${(typeof DOKUMEN_JENJANG)[number]}`;

// Disimpan di KonfigUmum.dokumenPeserta (JSON), per key.
export type DokumenInfo = {
  file: string; // nama file di folder uploads, mis. "undangan-SMP.pdf"
  nama: string; // nama file asli dari admin, dipakai saat peserta mengunduh
  v: number; // waktu upload, untuk memotong cache browser
};
export type DokumenPeserta = Partial<Record<DokumenKey, DokumenInfo>>;

export const DOKUMEN_KEYS = (Object.keys(DOKUMEN_JENIS) as DokumenJenis[]).flatMap((jenis) =>
  DOKUMEN_JENJANG.map((jenjang) => `${jenis}-${jenjang}` as DokumenKey)
);

export function isDokumenKey(key: string): key is DokumenKey {
  return (DOKUMEN_KEYS as string[]).includes(key);
}

export function dokumenUrl(key: DokumenKey, info: DokumenInfo) {
  return `/dokumen/${key}?v=${info.v}`;
}

export const DOKUMEN_EXT = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;
