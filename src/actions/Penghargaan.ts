"use server";

import { getServerSession } from "@/lib/next-auth";
import { revalidatePath } from "next/cache";
import {
  createKonfigJuara,
  deleteKonfigJuara,
  findKonfigJuaras,
  updateKonfigJuara,
} from "@/queries/penghargaan.query";
import prisma from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession();
  if (session?.user?.role !== "ADMIN") throw new Error("Forbidden");
}

export async function saveKonfigJuaraUmum(data: FormData) {
  await requireAdmin();
  const jenjang = (data.get("jenjang") as string).trim().toUpperCase();
  const kode = `UMUM-${jenjang}`;
  const kategoriLombas = await prisma.kategoriLomba.findMany({ orderBy: { nama: "asc" } });
  const kategoriList = kategoriLombas.map((k) => k.nama).filter((nama) => data.get(`kat_${nama}`) === "on");
  try {
    await createKonfigJuara({ jenisJuara: "UMUM", kode, namaJuara: `Juara Umum ${jenjang}`, jenjang, kategoriList, penghargaan: "Trofi + Sertifikat + Uang Pembinaan" });
    revalidatePath("/admin/penghargaan");
    return { success: true };
  } catch { return { success: false }; }
}

export async function saveKonfigJuaraPeringkat(data: FormData) {
  await requireAdmin();
  const jenjang = data.get("jenjang") as "SD" | "SMP" | "SMA";
  const namaJuara = data.get("namaJuara") as string;
  const kode = data.get("kode") as string;
  const urutan = parseInt(data.get("urutan") as string);
  const penghargaan = data.get("penghargaan") as string;
  const kategoriLombas = await prisma.kategoriLomba.findMany({ orderBy: { nama: "asc" } });
  const kategoriList = kategoriLombas.map((k) => k.nama).filter((nama) => data.get(`kat_${nama}`) === "on");
  const existing = await findKonfigJuaras({ jenisJuara: "PERINGKAT", jenjang, urutan });
  if (existing.length > 0) return { success: false, message: `Urutan ${urutan} sudah dipakai di jenjang ${jenjang}` };
  try {
    await createKonfigJuara({ jenisJuara: "PERINGKAT", kode, namaJuara, jenjang, urutan, kategoriList, penghargaan });
    revalidatePath("/admin/penghargaan");
    return { success: true };
  } catch { return { success: false, message: "Gagal (kode sudah ada?)" }; }
}

export async function kunciKonfigJuara(id: string, dikunci: boolean) {
  await requireAdmin();
  try {
    await updateKonfigJuara({ id }, { dikunci });
    revalidatePath("/admin/penghargaan");
    return { success: true };
  } catch { return { success: false }; }
}

export async function hapusKonfigJuara(id: string) {
  await requireAdmin();
  try {
    await deleteKonfigJuara({ id });
    revalidatePath("/admin/penghargaan");
    return { success: true };
  } catch { return { success: false }; }
}
