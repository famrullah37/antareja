"use server";

import { getServerSession } from "@/lib/next-auth";
import { revalidatePath } from "next/cache";
import { updateTim } from "@/queries/tim.query";
import { Tipe } from "@prisma/client";
import prisma from "@/lib/prisma";
import { compressPhoto, imageUploader, validateUploadFile } from "./fileUploader";
import { buildFormulirPdf } from "@/lib/formulir";
import { buildDataTimWorkbook } from "@/lib/exportTim";
import { timSlug } from "@/lib/timSlug";

// Jumlah pasukan per tipe tim (di luar danton/official/pelatih) — dipakai
// untuk mengecek kelengkapan data sebelum formulir registrasi bisa diunduh.
const jumlahPasukan: Record<Tipe, number> = { SMALL: 12, NORMAL: 15 };

async function requireAdmin() {
  const session = await getServerSession();
  if (session?.user?.role !== "ADMIN") throw new Error("Forbidden");
}

export async function getTimById(timId: string) {
  try {
    const tim = await prisma.tim.findUnique({
      where: { id: timId },
      include: { anggotas: true, pembayaran: true },
    });
    if (!tim) return { success: false, message: "Tim tidak ditemukan" };
    return { success: true, data: tim };
  } catch {
    return { success: false, message: "Gagal mengambil data tim" };
  }
}

export async function updateTimForm(id: string, formData: FormData) {
  const session = await getServerSession();
  if (!session?.user?.id) return { success: false, message: "Unauthorized" };

  // Hanya user pemilik tim yang boleh mengganti foto tim
  const tim = await prisma.tim.findUnique({ where: { id } });
  if (!tim || tim.userId !== session.user.id)
    return { success: false, message: "Forbidden" };

  const foto = formData.get("foto") as File | null;
  if (!foto || foto.size === 0) return { success: false, message: "Pilih foto tim terlebih dahulu" };

  try {
    const fileCheck = await validateUploadFile(foto);
    if (!fileCheck.valid) return { success: false, message: fileCheck.message };
    const compressed = await compressPhoto(Buffer.from(await foto.arrayBuffer()));
    const upload = await imageUploader(compressed);
    if (upload.error) return { success: false, message: "Gagal upload foto tim" };

    await updateTim({ id }, { foto: upload.data!.url });
    revalidatePath("/", "layout");
    return { success: true, message: "Foto tim berhasil disimpan" };
  } catch {
    return { success: false, message: "Gagal menyimpan foto tim" };
  }
}

export async function updateTimFormAdmin(data: FormData, id: string) {
  await requireAdmin();
  const asal_sekolah = data.get("asal_sekolah") as string;
  const tipe_tim = data.get("tipe_tim") as Tipe;
  const noUrutRaw = data.get("noUrut") as string;
  // No. urut kosong = belum diberi nomor; kalau diisi harus bilangan bulat positif.
  let noUrut: number | null = null;
  if (noUrutRaw?.trim()) {
    const n = Number(noUrutRaw);
    if (!Number.isInteger(n) || n < 1 || n > 9999) {
      return { success: false, message: "No. urut harus bilangan bulat antara 1 dan 9999 (tidak boleh minus/nol)" };
    }
    noUrut = n;
  }

  try {
    await updateTim({ id }, { asal_sekolah, tipe_tim, noUrut });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (e: any) {
    if (e?.code === "P2002") {
      return { success: false, message: "No. urut sudah dipakai tim lain di jenjang yang sama" };
    }
    return { success: false };
  }
}

// Formulir registrasi otomatis-terisi, menggantikan template DOCX kosong
// yang sebelumnya harus diisi manual — hanya bisa diunduh kalau data tim
// sudah lengkap (kriteria sama dengan section "Anggota Tim" di dashboard:
// jumlah anggota harus pas sesuai tipe_tim).
export async function downloadFormulirPdf() {
  const session = await getServerSession();
  if (!session?.user?.id) return { success: false, message: "Unauthorized" };

  const tim = await prisma.tim.findFirst({
    where: { userId: session.user.id },
    include: { anggotas: true },
  });
  if (!tim) return { success: false, message: "Tim tidak ditemukan" };

  if (!tim.confirmed) {
    return {
      success: false,
      message: "Pembayaran belum dikonfirmasi admin. Formulir belum bisa diunduh.",
    };
  }

  const required = jumlahPasukan[tim.tipe_tim] + 3;
  if (tim.anggotas.length !== required) {
    return {
      success: false,
      message: `Lengkapi dulu data Anggota Tim (${tim.anggotas.length}/${required} terisi) sebelum mengunduh formulir.`,
    };
  }

  try {
    const pdf = await buildFormulirPdf(tim, tim.anggotas);
    const slug = tim.nama_tim.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "Tim";
    return {
      success: true,
      base64: pdf.toString("base64"),
      filename: `Berkas-Registrasi-${slug}.pdf`,
    };
  } catch {
    return { success: false, message: "Gagal membuat formulir" };
  }
}

// Data tim & anggota dalam Excel TANPA foto, untuk admin. timId kosong = semua tim.
export async function exportDataTim(timId?: string) {
  try {
    await requireAdmin();
  } catch {
    return { success: false, message: "Forbidden" };
  }

  const tims = await prisma.tim.findMany({
    where: timId ? { id: timId } : undefined,
    include: { anggotas: true, pembayaran: true, user: { select: { email: true } } },
    orderBy: [{ jenjang: "asc" }, { noUrut: "asc" }, { nama_tim: "asc" }],
  });
  if (timId && tims.length === 0) return { success: false, message: "Tim tidak ditemukan" };

  try {
    return {
      success: true,
      base64: buildDataTimWorkbook(tims),
      filename: timId ? `Data-Tim-${timSlug(tims[0])}.xlsx` : "Data-Semua-Tim.xlsx",
    };
  } catch (e) {
    console.error("exportDataTim error:", e);
    return { success: false, message: "Gagal membuat file Excel" };
  }
}

export async function deleteTimForm(id: string) {
  await requireAdmin();
  try {
    await prisma.$transaction(async (tx) => {
      await tx.penilaianBaru.deleteMany({ where: { timId: id } });
      await tx.penilaian.deleteMany({ where: { tim_id: id } });
      await tx.tim.delete({ where: { id } });
    });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (e: any) {
    // P2003 = masih ada data yang menunjuk tim ini (mis. TransaksiVoting, tanpa cascade).
    if (e?.code === "P2003") {
      return {
        success: false,
        message: "Tim tidak bisa dihapus karena masih punya transaksi voting. Selesaikan/hapus transaksi voting tim ini dulu.",
      };
    }
    return { success: false, message: "Gagal menghapus tim" };
  }
}
