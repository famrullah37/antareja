"use server";

import { getServerSession } from "@/lib/next-auth";
import { imageUploader, validateUploadFile } from "./fileUploader";
import { createJuri, deleteJuri, updateJuri } from "@/queries/juri.query";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { jumlahNilaiJuriDiKategori } from "@/queries/penilaianBaru.query";

// Samakan penugasan juri (JuriKategori) dengan checkbox kategori di form.
// Kategori yang sudah dinilai juri ini tidak boleh dilepas (nilai yatim tetap
// ikut total tim tapi tidak terlihat lagi) — kembalikan pesan, jangan diubah.
async function cekLepasKategori(juriId: string, data: FormData) {
  const kategori = new Set(data.getAll("kategori").map((k) => String(k).toLowerCase()));
  const lama = await prisma.juriKategori.findMany({ where: { juriId }, select: { kategori: true } });
  for (const jk of lama) {
    if (kategori.has(jk.kategori.toLowerCase())) continue;
    const n = await jumlahNilaiJuriDiKategori(juriId, jk.kategori);
    if (n > 0) return `Juri ini sudah memberi ${n} nilai di kategori ${jk.kategori} — kategori itu tidak bisa dilepas`;
  }
  return null;
}

async function syncJuriKategori(juriId: string, data: FormData) {
  const kategori = Array.from(new Set(data.getAll("kategori").map(String).filter(Boolean)));
  await prisma.$transaction([
    prisma.juriKategori.deleteMany({ where: { juriId, kategori: { notIn: kategori } } }),
    prisma.juriKategori.createMany({
      data: kategori.map((k) => ({ juriId, kategori: k })),
      skipDuplicates: true,
    }),
  ]);
}

async function requireAdmin() {
  const session = await getServerSession();
  if (!["ADMIN", "SIE_LOMBA"].includes(session?.user?.role ?? "")) throw new Error("Forbidden");
}

export async function createJuriForm(data: FormData) {
  await requireAdmin();
  const nama = data.get("nama") as string;
  const email = data.get("email") as string;
  const no_hp = data.get("no_hp") as string;
  const foto = data.get("foto") as File;
  try {
    const fileCheck = await validateUploadFile(foto);
    if (!fileCheck.valid) return { success: false, message: fileCheck.message };
    const upload = await imageUploader(Buffer.from(await foto.arrayBuffer()));
    if (upload.error) return { success: false, message: upload.message };
    const juri = await createJuri({ nama, email, no_hp, kategori: "", foto: upload.data!.url });
    await syncJuriKategori(juri.id, data);
    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { success: false, message: "Gagal menambahkan juri" };
  }
}

export async function updateJuriForm(data: FormData, id: string) {
  await requireAdmin();
  const nama = data.get("nama") as string;
  const email = data.get("email") as string;
  const no_hp = data.get("no_hp") as string;
  const foto = data.get("foto") as File;
  const tolakLepas = await cekLepasKategori(id, data);
  if (tolakLepas) return { success: false, message: tolakLepas };
  try {
    const updateData: Record<string, string> = {};
    if (nama) updateData.nama = nama;
    if (email) updateData.email = email;
    if (no_hp) updateData.no_hp = no_hp;
    if (foto && foto.size > 0) {
      const fileCheck = await validateUploadFile(foto);
      if (!fileCheck.valid) return { success: false, message: fileCheck.message };
      const upload = await imageUploader(Buffer.from(await foto.arrayBuffer()));
      if (upload.error) return { success: false, message: upload.message };
      updateData.foto = upload.data!.url;
    }
    // Email berubah → putuskan hubungan ke akun lama; akun JURI dengan email
    // baru akan terhubung otomatis saat login (lihat findOrLinkJuriByUser).
    const lama = await prisma.juri.findUnique({ where: { id }, select: { email: true } });
    const gantiEmail = !!email && lama?.email.toLowerCase() !== email.toLowerCase();
    await updateJuri({ id }, { ...updateData, ...(gantiEmail ? { user: { disconnect: true } } : {}) });
    await syncJuriKategori(id, data);
    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { success: false, message: "Gagal mengupdate juri" };
  }
}

export async function deleteJuriForm(id: string) {
  await requireAdmin();
  const dinilai = await prisma.nilaiJuri.count({ where: { juriId: id } });
  if (dinilai > 0)
    return { success: false, message: `Juri ini sudah memberi ${dinilai} nilai — tidak bisa dihapus (nilainya ikut total tim)` };
  try {
    await deleteJuri({ id });
    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { success: false, message: "Gagal menghapus juri" };
  }
}
