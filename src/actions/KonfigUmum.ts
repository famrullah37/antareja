"use server";

import { getServerSession } from "@/lib/next-auth";
import { upsertKonfigUmum } from "@/queries/konfigUmum.query";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await getServerSession();
  if (session?.user?.role !== "ADMIN") throw new Error("Forbidden");
}

export async function saveKonfigUmum(data: FormData) {
  await requireAdmin();
  const countdownRaw = data.get("countdownTarget") as string;
  const countdownAktif = data.get("countdownAktif") === "on";
  const biayaSD = parseInt(data.get("biayaSD") as string);
  const biayaSDDP = parseInt(data.get("biayaSDDP") as string);
  const biayaSMP = parseInt(data.get("biayaSMP") as string);
  const biayaSMPDP = parseInt(data.get("biayaSMPDP") as string);
  const biayaSMA = parseInt(data.get("biayaSMA") as string);
  const biayaSMADP = parseInt(data.get("biayaSMADP") as string);

  const countdownTarget = new Date(countdownRaw);
  if (isNaN(countdownTarget.getTime())) {
    return { success: false, message: "Target waktu tidak valid" };
  }
  for (const [label, n] of [
    ["SD", biayaSD], ["SD DP", biayaSDDP], ["SMP", biayaSMP],
    ["SMP DP", biayaSMPDP], ["SMA", biayaSMA], ["SMA DP", biayaSMADP],
  ] as const) {
    if (!Number.isFinite(n) || n < 0) {
      return { success: false, message: `Biaya ${label} tidak valid` };
    }
  }

  try {
    await upsertKonfigUmum({
      countdownTarget,
      countdownAktif,
      biayaSD, biayaSDDP, biayaSMP, biayaSMPDP, biayaSMA, biayaSMADP,
    });
    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { success: false, message: "Gagal menyimpan konfigurasi" };
  }
}
