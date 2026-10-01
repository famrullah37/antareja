"use server";

import { getServerSession } from "@/lib/next-auth";
import prisma from "@/lib/prisma";
import { getKonfigUmum } from "@/queries/konfigUmum.query";
import { saveUploadFile } from "@/lib/localUpload";
import { DOKUMEN_EXT, isDokumenKey, type DokumenPeserta } from "@/lib/dokumenPeserta";
import { revalidatePath } from "next/cache";

const MAX_MB = 15;

// Cocokkan isi file dengan ekstensinya, supaya file lain yang sekadar diganti
// namanya tidak ikut tersimpan.
function cocokFormat(ext: keyof typeof DOKUMEN_EXT, buffer: Buffer) {
  if (ext === "pdf") return buffer.subarray(0, 5).toString() === "%PDF-";
  if (ext === "docx") return buffer.subarray(0, 2).toString() === "PK";
  return buffer.subarray(0, 4).toString("hex") === "d0cf11e0";
}

async function requireAdmin() {
  const session = await getServerSession();
  if (session?.user?.role !== "ADMIN") throw new Error("Forbidden");
}

async function simpanDaftar(dokumen: DokumenPeserta) {
  await getKonfigUmum(); // pastikan baris singleton ada
  await prisma.konfigUmum.update({ where: { id: "singleton" }, data: { dokumenPeserta: dokumen } });
  revalidatePath("/", "layout");
}

export async function uploadDokumenPeserta(key: string, data: FormData) {
  await requireAdmin();
  if (!isDokumenKey(key)) return { success: false, message: "Jenis dokumen tidak dikenal" };

  const file = data.get("file") as File | null;
  if (!file || file.size === 0) return { success: false, message: "Pilih file terlebih dahulu" };
  if (file.size > MAX_MB * 1024 * 1024) return { success: false, message: `Ukuran file maksimal ${MAX_MB}MB` };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!(ext in DOKUMEN_EXT)) return { success: false, message: "File harus berupa PDF atau Word (.doc/.docx)" };
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!cocokFormat(ext as keyof typeof DOKUMEN_EXT, buffer)) {
    return { success: false, message: "Isi file tidak sesuai dengan format PDF/Word" };
  }

  try {
    const namaFile = `${key}.${ext}`;
    await saveUploadFile(namaFile, buffer);
    const konfig = await getKonfigUmum();
    const dokumen = (konfig.dokumenPeserta ?? {}) as DokumenPeserta;
    dokumen[key] = { file: namaFile, nama: file.name, v: Date.now() };
    await simpanDaftar(dokumen);
    return { success: true, message: "Dokumen berhasil diupload" };
  } catch (e) {
    console.error("Gagal menyimpan dokumen peserta:", e);
    return { success: false, message: "Gagal menyimpan dokumen" };
  }
}

// File di disk dibiarkan (akan tertimpa upload berikutnya); cukup hilangkan
// dari daftar supaya tombol unduhnya tidak muncul lagi di dashboard peserta.
export async function hapusDokumenPeserta(key: string) {
  await requireAdmin();
  if (!isDokumenKey(key)) return { success: false, message: "Jenis dokumen tidak dikenal" };
  try {
    const konfig = await getKonfigUmum();
    const dokumen = (konfig.dokumenPeserta ?? {}) as DokumenPeserta;
    delete dokumen[key];
    await simpanDaftar(dokumen);
    return { success: true, message: "Dokumen dihapus" };
  } catch {
    return { success: false, message: "Gagal menghapus dokumen" };
  }
}
