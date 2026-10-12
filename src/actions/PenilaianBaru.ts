"use server";

import { getServerSession } from "@/lib/next-auth";
import { revalidatePath } from "next/cache";
import {
  createPelanggaran,
  createPelanggaranTim,
  createSubKategoriMaster,
  deletePelanggaran,
  deleteSubKategoriMaster,
  recalcPenilaianBaru,
  upsertJuriKategori,
  upsertNilaiDiskritMaster,
  upsertPenilaianBaru,
} from "@/queries/penilaianBaru.query";
import prisma from "@/lib/prisma";
import { catatLog } from "@/lib/activityLog";
import { findOrLinkJuriByUser } from "@/queries/juri.query";

async function requireAdmin() {
  const session = await getServerSession();
  if (!["ADMIN", "SIE_LOMBA"].includes(session?.user?.role ?? "")) throw new Error("Forbidden");
}

export async function saveMasterNilaiDiskrit(data: FormData) {
  await requireAdmin();
  const kategori = data.get("kategori") as string;
  const predikat = data.get("predikat") as string;
  const warna = data.get("warna") as string;
  const nilaiRaw = data.get("nilai") as string;
  const urutan = parseInt(data.get("urutan") as string);
  try {
    const nilai = nilaiRaw.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));
    await upsertNilaiDiskritMaster(kategori, predikat, { kategori, predikat, warna, nilai, urutan });
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch { return { success: false }; }
}

export async function deleteMasterNilaiDiskrit(id: string) {
  await requireAdmin();
  try {
    await prisma.nilaiDiskritMaster.delete({ where: { id } });
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch { return { success: false }; }
}

export async function saveSubKategori(data: FormData) {
  await requireAdmin();
  const kode = data.get("kode") as string;
  const nama = data.get("nama") as string;
  const kategori = data.get("kategori") as string;
  const maxNilai = parseInt(data.get("maxNilai") as string);
  const urutan = parseInt(data.get("urutan") as string);
  try {
    await createSubKategoriMaster({ kode, nama, kategori, maxNilai, urutan });
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch { return { success: false }; }
}

export async function removeSubKategori(id: string) {
  await requireAdmin();
  try {
    await deleteSubKategoriMaster(id);
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch { return { success: false }; }
}

export async function savePelanggaran(data: FormData) {
  await requireAdmin();
  const kode = data.get("kode") as string;
  const nama = data.get("nama") as string;
  const kategori = data.get("kategori") as string;
  const poinPengurangan = parseInt(data.get("poin") as string);
  try {
    await createPelanggaran({ kode, nama, kategori, poinPengurangan });
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch { return { success: false }; }
}

export async function removePelanggaran(id: string) {
  await requireAdmin();
  try {
    await deletePelanggaran(id);
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch { return { success: false }; }
}

export async function tugaskanJuriKategori(juriId: string, kategori: string) {
  await requireAdmin();
  try {
    await upsertJuriKategori(juriId, kategori);
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch { return { success: false }; }
}

// Siapa juri pemberi nilai:
// - JURI: selalu juri milik akun yang login (Juri.userId) — pilihan dari klien
//   diabaikan, jadi juri tidak bisa mengisi atas nama juri lain.
// - ADMIN / SIE_LOMBA: memasukkan nilai ATAS NAMA juri yang dipilih (mis. dari
//   lembar penilaian kertas); `oleh` = nama petugas, dicatat di log aktivitas.
async function juriPenilai(juriIdDipilih?: string) {
  const session = await getServerSession();
  const role = session?.user?.role ?? "";
  if (!["ADMIN", "SIE_LOMBA", "JURI"].includes(role)) throw new Error("Forbidden");

  if (role === "JURI") {
    const juri = await findOrLinkJuriByUser(session!.user!.id);
    return juri ? { juri, oleh: null } : { error: "Akun tidak terhubung ke data Juri" };
  }
  if (!juriIdDipilih) return { error: "Pilih juri yang nilainya akan dimasukkan" };
  const juri = await prisma.juri.findUnique({ where: { id: juriIdDipilih }, include: { juriKategori: true } });
  return juri ? { juri, oleh: session!.user!.nama } : { error: "Juri tidak ditemukan" };
}

// Tim harus terkonfirmasi & nilainya belum dipublish (FINAL) — setelah publish,
// nilai tidak boleh berubah diam-diam dari sisi juri.
async function cekTimBisaDinilai(timId: string) {
  const tim = await prisma.tim.findUnique({ where: { id: timId }, select: { confirmed: true } });
  if (!tim || !tim.confirmed) return "Tim tidak ditemukan";
  const penilaian = await prisma.penilaianBaru.findUnique({ where: { timId }, select: { published: true } });
  if (penilaian?.published) return "Nilai tim ini sudah dipublish, hubungi admin untuk membuka kembali";
  return null;
}

const MAKS_CATATAN = 500;

export async function inputNilaiJuri(
  timId: string,
  scores: { subKategoriId: string; nilai: number; catatan?: string }[],
  juriIdDipilih?: string
) {
  const penilai = await juriPenilai(juriIdDipilih);
  if (!penilai.juri) return { success: false, message: penilai.error };
  const { juri, oleh } = penilai;
  if (!Array.isArray(scores) || scores.length === 0 || scores.length > 200)
    return { success: false, message: "Data nilai tidak valid" };

  const tolak = await cekTimBisaDinilai(timId);
  if (tolak) return { success: false, message: tolak };

  // Validasi tiap nilai terhadap master di database: sub-kategori aktif, kategorinya
  // memang ditugaskan ke juri ini, dan angka termasuk pilihan nilai diskrit kategori
  // itu. Predikat diturunkan di server, bukan dipercaya dari klien.
  const kategoriJuri = new Set(juri.juriKategori.map((jk) => jk.kategori.toLowerCase()));
  const [subs, masters] = await Promise.all([
    prisma.subKategoriMaster.findMany({
      where: { id: { in: scores.map((s) => s.subKategoriId) }, aktif: true },
    }),
    prisma.nilaiDiskritMaster.findMany(),
  ]);

  const valid: { subKategoriId: string; nilai: number; predikat: string; catatan: string | null }[] = [];
  for (const s of scores) {
    const sub = subs.find((x) => x.id === s.subKategoriId);
    if (!sub || !kategoriJuri.has(sub.kategori.toLowerCase()))
      return { success: false, message: "Ada sub-kategori yang bukan tugas juri ini" };
    const nilai = Number(s.nilai);
    const master = masters.find(
      (m) => m.kategori.toLowerCase() === sub.kategori.toLowerCase() && (m.nilai as number[]).includes(nilai)
    );
    if (!Number.isInteger(nilai) || !master)
      return { success: false, message: `Nilai ${s.nilai} tidak valid untuk ${sub.nama}` };
    const catatan = (s.catatan ?? "").toString().trim().slice(0, MAKS_CATATAN) || null;
    valid.push({ subKategoriId: sub.id, nilai, predikat: master.predikat, catatan });
  }

  try {
    const penilaian = await upsertPenilaianBaru(timId);
    await prisma.$transaction(
      valid.map((v) =>
        prisma.nilaiJuri.upsert({
          where: {
            penilaianId_juriId_subKategoriId: {
              penilaianId: penilaian.id,
              juriId: juri.id,
              subKategoriId: v.subKategoriId,
            },
          },
          create: { penilaianId: penilaian.id, juriId: juri.id, subKategoriId: v.subKategoriId, nilaiDipilih: v.nilai, predikat: v.predikat, catatan: v.catatan },
          update: { nilaiDipilih: v.nilai, predikat: v.predikat, catatan: v.catatan },
        })
      )
    );
    await recalcPenilaianBaru(penilaian.id);
    await catatLog(
      "INPUT_NILAI",
      `${juri.nama}${oleh ? ` (dimasukkan oleh ${oleh})` : ""}: ${valid.length} sub-kategori (tim ${timId.slice(0, 8)})`
    );
    revalidatePath("/admin/penilaian-baru", "layout");
    return { success: true };
  } catch (e) {
    console.error("inputNilaiJuri error:", e);
    return { success: false, message: "Gagal menyimpan nilai" };
  }
}

const MAKS_KEJADIAN = 50;

// Poin pengurangan diambil dari master pelanggaran di database — dulu dikirim
// klien, sehingga bisa dimanipulasi (dan jumlah kejadian negatif malah MENAMBAH nilai).
// Pelanggaran dicatat per tim (bukan per juri): JURI wajib akun terhubung,
// ADMIN/SIE_LOMBA boleh langsung (pelaku tercatat di log aktivitas).
export async function inputPelanggaranTim(timId: string, pelanggaranId: string, jumlahKejadian: number) {
  const session = await getServerSession();
  const role = session?.user?.role ?? "";
  if (!["ADMIN", "SIE_LOMBA", "JURI"].includes(role)) throw new Error("Forbidden");
  let pelaku = session!.user!.nama;
  if (role === "JURI") {
    const juri = await findOrLinkJuriByUser(session!.user!.id);
    if (!juri) return { success: false, message: "Akun tidak terhubung ke data Juri" };
    pelaku = juri.nama;
  }

  const jumlah = Number(jumlahKejadian);
  if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > MAKS_KEJADIAN)
    return { success: false, message: `Jumlah kejadian harus 1–${MAKS_KEJADIAN}` };

  const tolak = await cekTimBisaDinilai(timId);
  if (tolak) return { success: false, message: tolak };

  const pelanggaran = await prisma.pelanggaran.findUnique({ where: { id: pelanggaranId } });
  if (!pelanggaran) return { success: false, message: "Jenis pelanggaran tidak ditemukan" };

  try {
    const penilaian = await upsertPenilaianBaru(timId);
    await createPelanggaranTim(penilaian.id, pelanggaran.id, jumlah, pelanggaran.poinPengurangan);
    await recalcPenilaianBaru(penilaian.id);
    await catatLog("INPUT_PELANGGARAN", `${pelaku}: [${pelanggaran.kode}] × ${jumlah} (tim ${timId.slice(0, 8)})`);
    revalidatePath("/admin/penilaian-baru", "layout");
    return { success: true };
  } catch (e) {
    console.error("inputPelanggaranTim error:", e);
    return { success: false, message: "Gagal menambah pelanggaran" };
  }
}

// Koreksi pelanggaran yang salah input. Boleh juri mana pun (pelanggaran dicatat
// per tim, bukan per juri) atau admin/Sie Lomba, selama nilai belum dipublish.
export async function hapusPelanggaranTim(pelanggaranTimId: string) {
  const session = await getServerSession();
  const role = session?.user?.role ?? "";
  if (!["ADMIN", "SIE_LOMBA", "JURI"].includes(role)) throw new Error("Forbidden");
  if (role === "JURI") {
    const juri = await findOrLinkJuriByUser(session!.user!.id);
    if (!juri) return { success: false, message: "Akun tidak terhubung ke data Juri" };
  }

  const pt = await prisma.pelanggaranTim.findUnique({
    where: { id: pelanggaranTimId },
    include: { penilaian: { select: { id: true, published: true, timId: true } }, pelanggaran: true },
  });
  if (!pt) return { success: false, message: "Pelanggaran tidak ditemukan" };
  if (pt.penilaian.published)
    return { success: false, message: "Nilai tim ini sudah dipublish, hubungi admin untuk membuka kembali" };

  try {
    await prisma.pelanggaranTim.delete({ where: { id: pt.id } });
    await recalcPenilaianBaru(pt.penilaian.id);
    await catatLog(
      "HAPUS_PELANGGARAN",
      `[${pt.pelanggaran.kode}] × ${pt.jumlahKejadian} (tim ${pt.penilaian.timId.slice(0, 8)})`
    );
    revalidatePath("/admin/penilaian-baru", "layout");
    return { success: true };
  } catch (e) {
    console.error("hapusPelanggaranTim error:", e);
    return { success: false, message: "Gagal menghapus pelanggaran" };
  }
}

export async function saveKategoriLomba(data: FormData) {
  await requireAdmin();
  const nama = (data.get("nama") as string).trim().toUpperCase();
  try {
    await prisma.kategoriLomba.upsert({ where: { nama }, create: { nama }, update: {} });
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch { return { success: false }; }
}

export async function removeKategoriLomba(id: string) {
  await requireAdmin();
  try {
    await prisma.kategoriLomba.delete({ where: { id } });
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch { return { success: false }; }
}

export async function publishNilaiBaru(penilaianId: string, publish: boolean) {
  await requireAdmin();
  try {
    await prisma.penilaianBaru.update({
      where: { id: penilaianId },
      data: { published: publish, publishedAt: publish ? new Date() : null, status: publish ? "FINAL" : "DRAFT" },
    });
    revalidatePath("/", "layout");
    return { success: true };
  } catch { return { success: false }; }
}
