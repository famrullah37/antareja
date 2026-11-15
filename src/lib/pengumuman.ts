// Dua tipe pengumuman:
// - SEBELUM: info persiapan lomba — tampil ke semua tim yang sudah daftar,
//   termasuk yang kemudian mundur / tidak hadir (supaya tidak ketinggalan info).
// - SESUDAH: info pasca lomba (sertifikat, voucher, dll) — hanya tim yang
//   benar-benar ikut lomba (terkonfirmasi & tidak mundur, lihat TIM_IKUT_LOMBA).
export const TIPE_PENGUMUMAN = [
  { key: "SEBELUM", label: "Sebelum Lomba", keterangan: "Tampil ke semua tim yang sudah daftar" },
  {
    key: "SESUDAH",
    label: "Setelah Lomba",
    keterangan: "Hanya tim yang ikut lomba — tim mundur / tidak hadir tidak melihat",
  },
] as const;

export type TipePengumuman = (typeof TIPE_PENGUMUMAN)[number]["key"];

export function isTipePengumuman(v: unknown): v is TipePengumuman {
  return TIPE_PENGUMUMAN.some((t) => t.key === v);
}

export function labelTipePengumuman(v: string) {
  return TIPE_PENGUMUMAN.find((t) => t.key === v)?.label ?? v;
}
