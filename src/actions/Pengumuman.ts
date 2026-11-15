"use server";

import { getServerSession } from "@/lib/next-auth";
import { revalidatePath } from "next/cache";
import { createPengumuman, deletePengumuman } from "@/queries/pengumuman.query";
import { isTipePengumuman } from "@/lib/pengumuman";

async function requireAdmin() {
  const session = await getServerSession();
  if (!["ADMIN", "SIE_LOMBA", "SIE_ACARA"].includes(session?.user?.role ?? "")) throw new Error("Forbidden");
}

export async function createPengumumanForm(data: FormData) {
  await requireAdmin();
  const content = ((data.get("content") as string) ?? "").trim().slice(0, 3000);
  const tipe = data.get("tipe");
  if (!content || !isTipePengumuman(tipe)) return { success: false };
  try {
    await createPengumuman({ content, tipe });
    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function deletePengumumanForm(id: string) {
  await requireAdmin();
  try {
    await deletePengumuman({ id });
    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { success: false };
  }
}
