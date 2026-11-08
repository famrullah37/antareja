"use server";

import { getServerSession } from "@/lib/next-auth";
import { revalidatePath } from "next/cache";
import {
  createPelanggaran,
  jumlahNilaiJuriDiKategori,
  createSubKategoriMaster,
  deletePelanggaran,
  deleteSubKategoriMaster,
  NilaiSudahDipublish,
  recalcPenilaianBaru,
  ubahPenilaianTerkunci,
  upsertJuriKategori,
  upsertNilaiDiskritMaster,
  upsertPenilaianBaru,
} from "@/queries/penilaianBaru.query";

const PESAN_SUDAH_PUBLISH = "Nilai tim ini sudah dipublish, hubungi admin untuk membuka kembali";
import prisma from "@/lib/prisma";
import { catatLog } from "@/lib/activityLog";
import { findOrLinkJuriByUser } from "@/queries/juri.query";
import { deleteUploadFile, saveUploadFile } from "@/lib/localUpload";
import { PREDIKAT_TIDAK_DILAKUKAN } from "@/lib/kelengkapanNilai";
import { Jenjang } from "@prisma/client";
import { labelGugur, TIM_IKUT_LOMBA } from "@/lib/gugurTim";

async function requireAdmin() {
  const session = await getServerSession();
  if (!["ADMIN", "SIE_LOMBA"].includes(session?.user?.role ?? "")) throw new Error("Forbidden");
}

// Angka bulat dalam rentang — master penilaian dulu menerima NaN/negatif apa adanya.
function angka(v: FormDataEntryValue | null, min: number, max: number) {
  const n = Number(String(v ?? "").trim());
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}
const teks = (v: FormDataEntryValue | null, maks = 100) => String(v ?? "").trim().slice(0, maks);

// Kategori harus ada di master Kategori Lomba (ejaan resmi dari master) — kalau teks
// bebas, beda huruf/ejaan membuat sub-kategori tidak pernah muncul di form juri.
async function kategoriResmi(nama: string) {
  if (!nama) return null;
  const k = await prisma.kategoriLomba.findFirst({ where: { nama: { equals: nama.trim(), mode: "insensitive" } } });
  return k?.nama ?? null;
}

export async function saveMasterNilaiDiskrit(data: FormData) {
  await requireAdmin();
  const kategori = await kategoriResmi(teks(data.get("kategori")));
  const predikat = teks(data.get("predikat")).toUpperCase().replace(/\s+/g, "_");
  const warna = teks(data.get("warna"), 20);
  const urutan = angka(data.get("urutan"), 0, 999);
  const nilai = Array.from(
    new Set(String(data.get("nilai") ?? "").split(",").map((s) => Number(s.trim())))
  ).filter((n) => Number.isInteger(n) && n >= 0 && n <= 1000);
  if (!kategori) return { success: false, message: "Pilih kategori lomba yang terdaftar" };
  if (!predikat) return { success: false, message: "Predikat wajib diisi" };
  if (!/^#[0-9a-fA-F]{3,8}$/.test(warna)) return { success: false, message: "Warna tidak valid" };
  if (urutan === null) return { success: false, message: "Urutan harus angka 0–999" };
  if (nilai.length === 0 || nilai.length > 30)
    return { success: false, message: "Isi 1–30 nilai (angka bulat 0–1000, pisahkan dengan koma)" };
  // Satu angka hanya boleh punya satu predikat per kategori — kalau tidak, predikat
  // yang tersimpan untuk nilai itu jadi acak. Data lama bisa beda huruf kategorinya.
  const sekategori = await prisma.nilaiDiskritMaster.findMany({
    where: { kategori: { equals: kategori, mode: "insensitive" } },
  });
  const ini = sekategori.find((m) => m.predikat === predikat);
  const bentrok = nilai.filter((n) => sekategori.some((m) => m.id !== ini?.id && (m.nilai as number[]).includes(n)));
  if (bentrok.length)
    return { success: false, message: `Nilai ${bentrok.join(", ")} sudah dipakai predikat lain di kategori ${kategori}` };
  try {
    if (ini) await prisma.nilaiDiskritMaster.update({ where: { id: ini.id }, data: { nilai, warna, urutan } });
    else await upsertNilaiDiskritMaster(kategori, predikat, { kategori, predikat, warna, nilai, urutan });
    await catatLog("SIMPAN_MASTER_NILAI", `${kategori} ${predikat}: ${nilai.join(",")}`);
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch { return { success: false, message: "Gagal menyimpan master nilai" }; }
}

export async function deleteMasterNilaiDiskrit(id: string) {
  await requireAdmin();
  try {
    const m = await prisma.nilaiDiskritMaster.findUnique({ where: { id } });
    if (m?.dikunci) return { success: false, message: "Master nilai ini dikunci" };
    await prisma.nilaiDiskritMaster.delete({ where: { id } });
    if (m) await catatLog("HAPUS_MASTER_NILAI", `${m.kategori} ${m.predikat}`);
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch { return { success: false }; }
}

export async function saveSubKategori(data: FormData) {
  await requireAdmin();
  const kode = teks(data.get("kode"), 30).toUpperCase();
  const nama = teks(data.get("nama"), 150);
  const kategori = await kategoriResmi(teks(data.get("kategori")));
  const maxNilai = angka(data.get("maxNilai"), 1, 1000);
  const urutan = angka(data.get("urutan"), 0, 999);
  if (!kode || !nama) return { success: false, message: "Kode & nama wajib diisi" };
  if (!kategori) return { success: false, message: "Pilih kategori lomba yang terdaftar" };
  if (maxNilai === null) return { success: false, message: "Nilai maks harus angka 1–1000" };
  if (urutan === null) return { success: false, message: "Urutan harus angka 0–999" };
  try {
    await createSubKategoriMaster({ kode, nama, kategori, maxNilai, urutan });
    await catatLog("TAMBAH_SUB_KATEGORI", `${kategori}: [${kode}] ${nama} (maks ${maxNilai})`);
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch (e: any) {
    if (e?.code === "P2002") return { success: false, message: "Kode sub-kategori sudah ada" };
    return { success: false, message: "Gagal menyimpan sub-kategori" };
  }
}

// Sub-kategori yang sudah dinilai tidak boleh dihapus — nilainya ikut total tim.
export async function removeSubKategori(id: string) {
  await requireAdmin();
  const dipakai = await prisma.nilaiJuri.count({ where: { subKategoriId: id } });
  if (dipakai > 0)
    return { success: false, message: `Sub-kategori ini sudah dinilai (${dipakai} nilai) — tidak bisa dihapus` };
  try {
    const sub = await deleteSubKategoriMaster(id);
    await catatLog("HAPUS_SUB_KATEGORI", `${sub.kategori}: [${sub.kode}] ${sub.nama}`);
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch { return { success: false, message: "Gagal menghapus sub-kategori" }; }
}

export async function savePelanggaran(data: FormData) {
  await requireAdmin();
  const kode = teks(data.get("kode"), 30).toUpperCase();
  const nama = teks(data.get("nama"), 150);
  const kategori = teks(data.get("kategori"), 50);
  // Disimpan positif; pengurangan selalu memakai nilai mutlaknya.
  const poin = angka(String(data.get("poin") ?? "").replace("-", ""), 1, 1000);
  if (!kode || !nama) return { success: false, message: "Kode & nama pelanggaran wajib diisi" };
  if (poin === null) return { success: false, message: "Poin pengurangan harus angka 1–1000" };
  try {
    await createPelanggaran({ kode, nama, kategori, poinPengurangan: poin });
    await catatLog("TAMBAH_MASTER_PELANGGARAN", `[${kode}] ${nama} (−${poin})`);
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch (e: any) {
    if (e?.code === "P2002") return { success: false, message: "Kode pelanggaran sudah ada" };
    return { success: false, message: "Gagal menyimpan pelanggaran" };
  }
}

export async function removePelanggaran(id: string) {
  await requireAdmin();
  const dipakai = await prisma.pelanggaranTim.count({ where: { pelanggaranId: id } });
  if (dipakai > 0)
    return { success: false, message: `Pelanggaran ini sudah dicatat di ${dipakai} tim — hapus catatannya di tim dulu` };
  try {
    const p = await deletePelanggaran(id);
    await catatLog("HAPUS_MASTER_PELANGGARAN", `[${p.kode}] ${p.nama}`);
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch { return { success: false, message: "Gagal menghapus pelanggaran" }; }
}


export async function tugaskanJuriKategori(juriId: string, kategori: string) {
  await requireAdmin();
  const resmi = await kategoriResmi(String(kategori ?? ""));
  if (!resmi) return { success: false, message: "Pilih kategori lomba yang terdaftar" };
  const juri = typeof juriId === "string" && juriId ? await prisma.juri.findUnique({ where: { id: juriId } }) : null;
  if (!juri) return { success: false, message: "Pilih juri" };
  const sudah = await prisma.juriKategori.count({
    where: { juriId: juri.id, kategori: { equals: resmi, mode: "insensitive" } },
  });
  if (sudah) return { success: false, message: "Juri ini sudah ditugaskan di kategori tersebut" };
  try {
    await upsertJuriKategori(juri.id, resmi);
    await catatLog("TUGASKAN_JURI", `${juri.nama} → ${resmi}`);
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch { return { success: false, message: "Gagal menugaskan juri" }; }
}

// Ganti kategori sebuah penugasan. Nilai yang sudah diinput juri tidak ikut
// berubah/hilang — penugasan hanya menentukan kategori mana yang bisa dia isi.
export async function ubahJuriKategori(id: string, kategoriInput: string) {
  await requireAdmin();
  const kategori = await kategoriResmi(String(kategoriInput ?? ""));
  if (!kategori) return { success: false, message: "Pilih kategori lomba yang terdaftar" };
  const lama = await prisma.juriKategori.findUnique({ where: { id }, include: { juri: { select: { nama: true } } } });
  if (!lama) return { success: false, message: "Penugasan tidak ditemukan" };
  if (lama.kategori.toLowerCase() !== kategori.toLowerCase()) {
    const n = await jumlahNilaiJuriDiKategori(lama.juriId, lama.kategori);
    if (n > 0)
      return {
        success: false,
        message: `${lama.juri.nama} sudah memberi ${n} nilai di kategori ${lama.kategori} — penugasan tidak bisa dipindah. Tambahkan penugasan baru saja.`,
      };
  }
  try {
    const jk = await prisma.juriKategori.update({ where: { id }, data: { kategori }, include: { juri: true } });
    await catatLog("UBAH_PENUGASAN_JURI", `${jk.juri.nama} → ${kategori}`);
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch (e: any) {
    if (e?.code === "P2002") return { success: false, message: "Juri ini sudah ditugaskan di kategori tersebut" };
    return { success: false, message: "Gagal mengubah penugasan" };
  }
}

export async function hapusJuriKategori(id: string) {
  await requireAdmin();
  const lama = await prisma.juriKategori.findUnique({ where: { id }, include: { juri: { select: { nama: true } } } });
  if (!lama) return { success: true };
  const n = await jumlahNilaiJuriDiKategori(lama.juriId, lama.kategori);
  if (n > 0)
    return {
      success: false,
      message: `${lama.juri.nama} sudah memberi ${n} nilai di kategori ${lama.kategori} — penugasan tidak bisa dihapus (nilainya ikut total tim)`,
    };
  try {
    const jk = await prisma.juriKategori.delete({ where: { id }, include: { juri: true } });
    await catatLog("HAPUS_PENUGASAN_JURI", `${jk.juri.nama} — ${jk.kategori}`);
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch {
    return { success: false, message: "Gagal menghapus penugasan" };
  }
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
  if (!juriIdDipilih || typeof juriIdDipilih !== "string") return { error: "Pilih juri yang nilainya akan dimasukkan" };
  const juri = await prisma.juri.findUnique({ where: { id: juriIdDipilih }, include: { juriKategori: true } });
  return juri ? { juri, oleh: session!.user!.nama } : { error: "Juri tidak ditemukan" };
}

// Tim harus terkonfirmasi, tidak mundur/tidak hadir (lib/gugurTim.ts), & nilainya
// belum dipublish (FINAL) — setelah publish, nilai tidak boleh berubah diam-diam.
async function cekTimBisaDinilai(timId: string) {
  if (typeof timId !== "string" || !timId) return "Tim tidak ditemukan";
  const tim = await prisma.tim.findUnique({ where: { id: timId }, select: { confirmed: true, gugurAt: true, gugurJenis: true } });
  if (!tim || !tim.confirmed) return "Tim tidak ditemukan";
  if (tim.gugurAt) return `Tim ini ditandai "${labelGugur(tim.gugurJenis)}" — tidak dinilai`;
  const penilaian = await prisma.penilaianBaru.findUnique({ where: { timId }, select: { published: true } });
  if (penilaian?.published) return "Nilai tim ini sudah dipublish, hubungi admin untuk membuka kembali";
  return null;
}

const MAKS_CATATAN = 500;
const TIM_SELECT_IKUT = { confirmed: true, gugurAt: true } as const;

export async function inputNilaiJuri(
  timId: string,
  scores: { subKategoriId: string; nilai: number; catatan?: string }[],
  juriIdDipilih?: string
) {
  const penilai = await juriPenilai(juriIdDipilih);
  if (!penilai.juri) return { success: false, message: penilai.error };
  const { juri, oleh } = penilai;
  // Argumen server action bisa dikirim siapa saja — periksa bentuknya sebelum ke database.
  if (
    !Array.isArray(scores) ||
    scores.length === 0 ||
    scores.length > 200 ||
    scores.some((s) => !s || typeof s.subKategoriId !== "string" || (s.catatan != null && typeof s.catatan !== "string"))
  )
    return { success: false, message: "Data nilai tidak valid" };
  if (new Set(scores.map((s) => s.subKategoriId)).size !== scores.length)
    return { success: false, message: "Data nilai ganda" };

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
    // Aturan lomba: peserta yang tidak melakukan perintah mendapat nilai 0 — selalu
    // boleh walau 0 tidak tercantum di master nilai diskrit kategori itu.
    const predikat = master?.predikat ?? (nilai === 0 ? PREDIKAT_TIDAK_DILAKUKAN : null);
    if (!Number.isInteger(nilai) || !predikat)
      return { success: false, message: `Nilai ${s.nilai} tidak valid untuk ${sub.nama}` };
    // Master nilai diskrit berlaku per KATEGORI; sub-kategori bisa punya maks lebih kecil.
    if (nilai < 0 || nilai > sub.maxNilai)
      return { success: false, message: `Nilai ${nilai} melebihi maks ${sub.maxNilai} untuk ${sub.nama}` };
    const catatan = (s.catatan ?? "").toString().trim().slice(0, MAKS_CATATAN) || null;
    valid.push({ subKategoriId: sub.id, nilai, predikat, catatan });
  }

  try {
    const penilaian = await upsertPenilaianBaru(timId);
    // Simpan nilai + hitung total dalam satu transaksi terkunci (lihat ubahPenilaianTerkunci).
    await ubahPenilaianTerkunci(penilaian.id, async (tx) => {
      for (const v of valid) {
        await tx.nilaiJuri.upsert({
          where: {
            penilaianId_juriId_subKategoriId: {
              penilaianId: penilaian.id,
              juriId: juri.id,
              subKategoriId: v.subKategoriId,
            },
          },
          create: { penilaianId: penilaian.id, juriId: juri.id, subKategoriId: v.subKategoriId, nilaiDipilih: v.nilai, predikat: v.predikat, catatan: v.catatan },
          update: { nilaiDipilih: v.nilai, predikat: v.predikat, catatan: v.catatan },
        });
      }
    });
    await catatLog(
      "INPUT_NILAI",
      `${juri.nama}${oleh ? ` (dimasukkan oleh ${oleh})` : ""}: ${valid.length} sub-kategori (tim ${timId.slice(0, 8)})`
    );
    revalidatePath("/admin/penilaian-baru", "layout");
    return { success: true };
  } catch (e) {
    if (e instanceof NilaiSudahDipublish) return { success: false, message: PESAN_SUDAH_PUBLISH };
    console.error("inputNilaiJuri error:", e);
    return { success: false, message: "Gagal menyimpan nilai, coba simpan lagi" };
  }
}

// Masukan suara: satu rekaman per juri per tim. Durasi mengikuti lamanya juri
// menilai, jadi batasnya hanya pengaman (rekaman ~32 kbps ≈ 7 MB per 30 menit).
const MAKS_DURASI_SUARA = 30 * 60;
const MAKS_UKURAN_SUARA = 15 * 1024 * 1024;
const EXT_SUARA: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/aac": "aac",
};

export async function simpanMasukanSuara(timId: string, data: FormData) {
  const penilai = await juriPenilai((data.get("juriId") as string) || undefined);
  if (!penilai.juri) return { success: false, message: penilai.error };
  const { juri, oleh } = penilai;

  const tolak = await cekTimBisaDinilai(timId);
  if (tolak) return { success: false, message: tolak };

  const file = data.get("audio");
  if (!(file instanceof File) || file.size === 0) return { success: false, message: "Rekaman kosong" };
  if (file.size > MAKS_UKURAN_SUARA) return { success: false, message: "Rekaman terlalu besar (maks 15 MB)" };
  // Browser mengirim mis. "audio/webm;codecs=opus" — cukup tipe dasarnya.
  const mime = file.type.split(";")[0].trim().toLowerCase();
  const ext = EXT_SUARA[mime];
  if (!ext) return { success: false, message: "Format rekaman tidak didukung" };
  const durasi = Math.round(Number(data.get("durasi")));
  if (!Number.isFinite(durasi) || durasi < 1 || durasi > MAKS_DURASI_SUARA)
    return { success: false, message: "Durasi rekaman tidak valid" };

  try {
    const penilaian = await upsertPenilaianBaru(timId);
    const lama = await prisma.masukanSuara.findUnique({
      where: { penilaianId_juriId: { penilaianId: penilaian.id, juriId: juri.id } },
    });
    // Nama file baru tiap upload, supaya rekaman lama yang sedang diputar/tercache tidak tertimpa.
    const nama = `suara-${penilaian.id}-${juri.id}-${Date.now()}.${ext}`;
    await saveUploadFile(nama, Buffer.from(await file.arrayBuffer()));
    await prisma.masukanSuara.upsert({
      where: { penilaianId_juriId: { penilaianId: penilaian.id, juriId: juri.id } },
      create: { penilaianId: penilaian.id, juriId: juri.id, file: nama, mime, durasiDetik: durasi },
      update: { file: nama, mime, durasiDetik: durasi },
    });
    if (lama) await deleteUploadFile(lama.file);
    await catatLog(
      "INPUT_MASUKAN_SUARA",
      `${juri.nama}${oleh ? ` (dimasukkan oleh ${oleh})` : ""}: ${durasi} detik (tim ${timId.slice(0, 8)})`
    );
    revalidatePath("/admin/penilaian-baru", "layout");
    return { success: true };
  } catch (e) {
    console.error("simpanMasukanSuara error:", e);
    return { success: false, message: "Gagal menyimpan rekaman" };
  }
}

export async function hapusMasukanSuara(timId: string, juriIdDipilih?: string) {
  const penilai = await juriPenilai(juriIdDipilih);
  if (!penilai.juri) return { success: false, message: penilai.error };
  const { juri, oleh } = penilai;

  const tolak = await cekTimBisaDinilai(timId);
  if (tolak) return { success: false, message: tolak };

  const ms = await prisma.masukanSuara.findFirst({ where: { juriId: juri.id, penilaian: { timId } } });
  if (!ms) return { success: true };
  try {
    await prisma.masukanSuara.delete({ where: { id: ms.id } });
    await deleteUploadFile(ms.file);
    await catatLog(
      "HAPUS_MASUKAN_SUARA",
      `${juri.nama}${oleh ? ` (oleh ${oleh})` : ""} (tim ${timId.slice(0, 8)})`
    );
    revalidatePath("/admin/penilaian-baru", "layout");
    return { success: true };
  } catch (e) {
    console.error("hapusMasukanSuara error:", e);
    return { success: false, message: "Gagal menghapus rekaman" };
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

  if (typeof pelanggaranId !== "string" || !pelanggaranId) return { success: false, message: "Pilih jenis pelanggaran" };
  const jumlah = Number(jumlahKejadian);
  if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > MAKS_KEJADIAN)
    return { success: false, message: `Jumlah kejadian harus 1–${MAKS_KEJADIAN}` };

  const tolak = await cekTimBisaDinilai(timId);
  if (tolak) return { success: false, message: tolak };

  const pelanggaran = await prisma.pelanggaran.findUnique({ where: { id: pelanggaranId } });
  if (!pelanggaran) return { success: false, message: "Jenis pelanggaran tidak ditemukan" };

  try {
    const penilaian = await upsertPenilaianBaru(timId);
    await ubahPenilaianTerkunci(penilaian.id, (tx) =>
      tx.pelanggaranTim.create({
        data: {
          penilaianId: penilaian.id,
          pelanggaranId: pelanggaran.id,
          jumlahKejadian: jumlah,
          totalPengurang: jumlah * Math.abs(pelanggaran.poinPengurangan),
        },
      })
    );
    await catatLog("INPUT_PELANGGARAN", `${pelaku}: [${pelanggaran.kode}] × ${jumlah} (tim ${timId.slice(0, 8)})`);
    revalidatePath("/admin/penilaian-baru", "layout");
    return { success: true };
  } catch (e) {
    if (e instanceof NilaiSudahDipublish) return { success: false, message: PESAN_SUDAH_PUBLISH };
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
  if (typeof pelanggaranTimId !== "string" || !pelanggaranTimId)
    return { success: false, message: "Pelanggaran tidak ditemukan" };

  const pt = await prisma.pelanggaranTim.findUnique({
    where: { id: pelanggaranTimId },
    include: { penilaian: { select: { id: true, published: true, timId: true } }, pelanggaran: true },
  });
  if (!pt) return { success: false, message: "Pelanggaran tidak ditemukan" };
  const tolak = await cekTimBisaDinilai(pt.penilaian.timId);
  if (tolak) return { success: false, message: tolak };
  if (pt.penilaian.published)
    return { success: false, message: "Nilai tim ini sudah dipublish, hubungi admin untuk membuka kembali" };

  try {
    await ubahPenilaianTerkunci(pt.penilaian.id, (tx) => tx.pelanggaranTim.delete({ where: { id: pt.id } }));
    await catatLog(
      "HAPUS_PELANGGARAN",
      `[${pt.pelanggaran.kode}] × ${pt.jumlahKejadian} (tim ${pt.penilaian.timId.slice(0, 8)})`
    );
    revalidatePath("/admin/penilaian-baru", "layout");
    return { success: true };
  } catch (e) {
    if (e instanceof NilaiSudahDipublish) return { success: false, message: PESAN_SUDAH_PUBLISH };
    console.error("hapusPelanggaranTim error:", e);
    return { success: false, message: "Gagal menghapus pelanggaran" };
  }
}

export async function saveKategoriLomba(data: FormData) {
  await requireAdmin();
  const nama = teks(data.get("nama"), 50).replace(/\s+/g, " ").toUpperCase();
  if (!nama) return { success: false, message: "Nama kategori wajib diisi" };
  try {
    await prisma.kategoriLomba.upsert({ where: { nama }, create: { nama }, update: {} });
    await catatLog("TAMBAH_KATEGORI_LOMBA", nama);
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch { return { success: false, message: "Gagal menyimpan kategori" }; }
}

// Kategori yang masih punya sub-kategori / penugasan juri tidak boleh dihapus —
// dulu terhapus begitu saja, meninggalkan sub-kategori & nilai tanpa kategori induk.
export async function removeKategoriLomba(id: string) {
  await requireAdmin();
  const kat = await prisma.kategoriLomba.findUnique({ where: { id } });
  if (!kat) return { success: true };
  const ci = { equals: kat.nama, mode: "insensitive" as const };
  const [nSub, nJuri, nMaster] = await Promise.all([
    prisma.subKategoriMaster.count({ where: { kategori: ci } }),
    prisma.juriKategori.count({ where: { kategori: ci } }),
    prisma.nilaiDiskritMaster.count({ where: { kategori: ci } }),
  ]);
  if (nSub || nJuri || nMaster)
    return {
      success: false,
      message: `Kategori ${kat.nama} masih dipakai (${nSub} sub-kategori, ${nJuri} penugasan juri, ${nMaster} master nilai) — hapus itu dulu`,
    };
  try {
    await prisma.kategoriLomba.delete({ where: { id } });
    await catatLog("HAPUS_KATEGORI_LOMBA", kat.nama);
    revalidatePath("/admin/penilaian-baru");
    return { success: true };
  } catch { return { success: false, message: "Gagal menghapus kategori" }; }
}

// Pengaman sebelum juara diumumkan: hitung ulang total SEMUA tim dari nilai juri
// & pelanggaran yang tersimpan, lalu laporkan berapa yang ternyata berubah
// (seharusnya 0 — kalau tidak, ada total yang sebelumnya tidak sinkron).
export async function hitungUlangSemuaNilai() {
  await requireAdmin();
  try {
    const semua = await prisma.penilaianBaru.findMany({
      select: { id: true, nilaiAkhir: true, published: true, tim: { select: { nama_tim: true, jenjang: true } } },
    });
    const berubah: string[] = [];
    for (const p of semua) {
      const baru = await recalcPenilaianBaru(p.id);
      if (baru && baru.nilaiAkhir !== p.nilaiAkhir)
        berubah.push(
          `${p.tim.jenjang} ${p.tim.nama_tim}: ${p.nilaiAkhir} → ${baru.nilaiAkhir}${p.published ? " (SUDAH DIPUBLISH — tim sempat melihat nilai lama)" : ""}`
        );
    }
    await catatLog(
      "HITUNG_ULANG_NILAI",
      `${semua.length} tim dihitung ulang, ${berubah.length} berubah${berubah.length ? `: ${berubah.join("; ")}` : ""}`
    );
    revalidatePath("/admin/penilaian-baru", "layout");
    revalidatePath("/admin/penghargaan");
    return { success: true, total: semua.length, berubah };
  } catch (e) {
    console.error("hitungUlangSemuaNilai error:", e);
    return { success: false, total: 0, berubah: [] as string[] };
  }
}

// Pengumuman: publish/sembunyikan nilai SEMUA tim satu jenjang sekaligus, supaya
// semua tim melihat hasilnya bersamaan (publish satu per satu membuat tim yang
// lebih dulu dipublish tahu nilainya sebelum tim lain).
const JENJANG_VALID: Jenjang[] = ["SD", "SMP", "SMA", "PURNA"];
export async function publishNilaiJenjang(jenjang: string, publish: boolean) {
  await requireAdmin();
  if (!JENJANG_VALID.includes(jenjang as Jenjang)) return { success: false, count: 0 };
  try {
    const r = await prisma.penilaianBaru.updateMany({
      // Publish hanya tim yang ikut lomba; sembunyikan berlaku untuk semua.
      where: { tim: publish ? { jenjang: jenjang as Jenjang, ...TIM_IKUT_LOMBA } : { jenjang: jenjang as Jenjang }, published: !publish },
      data: { published: publish, publishedAt: publish ? new Date() : null, status: publish ? "FINAL" : "DRAFT" },
    });
    await catatLog(publish ? "PUBLISH_NILAI_JENJANG" : "SEMBUNYIKAN_NILAI_JENJANG", `${jenjang}: ${r.count} tim`);
    revalidatePath("/", "layout");
    return { success: true, count: r.count };
  } catch (e) {
    console.error("publishNilaiJenjang error:", e);
    return { success: false, count: 0 };
  }
}

export async function publishNilaiBaru(penilaianId: string, publish: boolean) {
  await requireAdmin();
  try {
    if (publish) {
      const p = await prisma.penilaianBaru.findUnique({ where: { id: penilaianId }, select: { tim: { select: TIM_SELECT_IKUT } } });
      if (!p || !p.tim.confirmed || p.tim.gugurAt) return { success: false, message: "Tim tidak ikut lomba (batal konfirmasi / mundur / tidak hadir)" };
    }
    const p = await prisma.penilaianBaru.update({
      where: { id: String(penilaianId) },
      data: { published: !!publish, publishedAt: publish ? new Date() : null, status: publish ? "FINAL" : "DRAFT" },
      select: { nilaiAkhir: true, tim: { select: { jenjang: true, noUrut: true, nama_tim: true } } },
    });
    // Jejak audit: kapan & oleh siapa nilai dibuka ke tim / ditarik kembali.
    await catatLog(
      publish ? "PUBLISH_NILAI" : "SEMBUNYIKAN_NILAI",
      `${p.tim.nama_tim} (${p.tim.jenjang}-${String(p.tim.noUrut ?? "?").padStart(2, "0")}) nilai akhir ${p.nilaiAkhir}`
    );
    revalidatePath("/", "layout");
    return { success: true };
  } catch { return { success: false, message: "Gagal" }; }
}
