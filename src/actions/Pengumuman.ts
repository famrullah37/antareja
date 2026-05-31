"use server";

import { getServerSession } from "@/lib/next-auth";
import { revalidatePath } from "next/cache";
import { createPengumuman, deletePengumuman } from "@/queries/pengumuman.query";

async function requireAdmin() {
  const session = await getServerSession();
  if (session?.user?.role !== "ADMIN") throw new Error("Forbidden");
}

export async function createPengumumanForm(data: FormData) {
  await requireAdmin();
  const content = data.get("content") as string;
  try {
    await createPengumuman({ content });
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
