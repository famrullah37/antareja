"use server";

import { revalidatePath } from "next/cache";
import {
  createPenilaian,
  deletePenilaian,
  updatePenilaian,
} from "@/queries/penilaian.query";
import { getServerSession } from "@/lib/next-auth";

async function requireAdmin() {
  const session = await getServerSession();
  if (session?.user?.role !== "ADMIN") throw new Error("Forbidden");
}

export async function createPenilaianForm(data: FormData, userId: string) {
  const timId = data.get("tim") as string;
  const pbb = parseInt(data.get("pbb") as string);
  const variasi = parseInt(data.get("variasi") as string);
  const formasi = parseInt(data.get("formasi") as string);
  const danpas = parseInt(data.get("danpas") as string);
  const pasukan = parseInt(data.get("pasukan") as string);
  const pbb_tambahan = parseInt(data.get("pbb_tambahan") as string);
  const detail = data.get("detail") as string;
  const note = data.get("note") as string;
  const isPublished = (data.get("isPublished") as string) ? true : false;

  try {
    await requireAdmin();
    await createPenilaian({
      tim: { connect: { id: timId } },
      pbb: pbb,
      variasi: variasi,
      formasi: formasi,
      danpas: danpas,
      pasukan: pasukan,
      pbb_tambahan: pbb_tambahan,
      detail_url: detail,
      note: note,
      user: { connect: { id: userId } },
      published: isPublished,
    });
    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function updatePenilaianForm(data: FormData, id: string) {
  await requireAdmin();
  const pbb = parseInt(data.get("pbb") as string);
  const variasi = parseInt(data.get("variasi") as string);
  const formasi = parseInt(data.get("formasi") as string);
  const danpas = parseInt(data.get("danpas") as string);
  const pasukan = parseInt(data.get("pasukan") as string);
  const pbb_tambahan = parseInt(data.get("pbb_tambahan") as string);
  const detail = data.get("detail") as string;
  const note = data.get("note") as string;
  const isPublished = (data.get("isPublished") as string) ? true : undefined;

  try {
    await updatePenilaian(
      { id: id },
      {
        pbb: pbb,
        variasi: variasi,
        formasi: formasi,
        danpas: danpas,
        pasukan: pasukan,
        pbb_tambahan: pbb_tambahan,
        detail_url: detail,
        note: note,
        published: isPublished,
      }
    );
    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function deletePenilaianForm(id: string) {
  try {
    await requireAdmin();
    await deletePenilaian({ id: id });
    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { success: false };
  }
}
