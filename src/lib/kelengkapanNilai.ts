import prisma from "@/lib/prisma";

// Nilai 0 adalah nilai SAH (peserta tidak melakukan perintah — sesuai aturan lomba),
// sedangkan sub-kategori yang belum diisi juri = KOSONG. Keduanya sama-sama
// menyumbang 0 ke total, jadi tanpa pengecekan ini nilai yang lupa diisi tidak
// kelihatan. "Diharapkan" = setiap juri × setiap sub-kategori AKTIF pada kategori
// yang ditugaskan kepadanya (JuriKategori).

export const PREDIKAT_TIDAK_DILAKUKAN = "TIDAK_DILAKUKAN";

export type KelengkapanTim = {
  timId: string;
  namaTim: string;
  asalSekolah: string;
  jenjang: string;
  noUrut: number | null;
  diharapkan: number;
  terisi: number;
  kosong: number;
  perJuri: { juri: string; kosong: number }[];
};

export async function hitungKelengkapanNilai(): Promise<Record<string, KelengkapanTim>> {
  const [tims, penugasan, subs, nilai] = await Promise.all([
    prisma.tim.findMany({
      where: { confirmed: true },
      select: { id: true, nama_tim: true, asal_sekolah: true, jenjang: true, noUrut: true },
    }),
    prisma.juriKategori.findMany({ select: { juriId: true, kategori: true, juri: { select: { nama: true } } } }),
    prisma.subKategoriMaster.findMany({ where: { aktif: true }, select: { id: true, kategori: true } }),
    prisma.nilaiJuri.findMany({ select: { juriId: true, subKategoriId: true, penilaian: { select: { timId: true } } } }),
  ]);

  // Pasangan (juri, sub-kategori) yang wajib diisi untuk setiap tim.
  const wajib = penugasan.flatMap((jk) =>
    subs
      .filter((s) => s.kategori.toLowerCase() === jk.kategori.toLowerCase())
      .map((s) => ({ juriId: jk.juriId, juri: jk.juri.nama, subId: s.id }))
  );
  const terisi = new Set(nilai.map((n) => `${n.penilaian.timId}|${n.juriId}|${n.subKategoriId}`));

  const hasil: Record<string, KelengkapanTim> = {};
  for (const t of tims) {
    const kosongPerJuri = new Map<string, number>();
    let kosong = 0;
    for (const w of wajib) {
      if (terisi.has(`${t.id}|${w.juriId}|${w.subId}`)) continue;
      kosong++;
      kosongPerJuri.set(w.juri, (kosongPerJuri.get(w.juri) ?? 0) + 1);
    }
    hasil[t.id] = {
      timId: t.id,
      namaTim: t.nama_tim,
      asalSekolah: t.asal_sekolah,
      jenjang: t.jenjang,
      noUrut: t.noUrut,
      diharapkan: wajib.length,
      terisi: wajib.length - kosong,
      kosong,
      perJuri: Array.from(kosongPerJuri, ([juri, n]) => ({ juri, kosong: n })),
    };
  }
  return hasil;
}

export function ringkasKosong(k: KelengkapanTim) {
  return k.perJuri.map((p) => `${p.juri}: ${p.kosong} kosong`).join(", ");
}
