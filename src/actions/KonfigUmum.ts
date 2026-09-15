"use server";

import { getServerSession } from "@/lib/next-auth";
import { upsertKonfigUmum, type TimelineItem } from "@/queries/konfigUmum.query";
import { revalidatePath } from "next/cache";
import { parseWibDatetimeLocal } from "@/lib/datetime";

async function requireAdmin() {
  const session = await getServerSession();
  if (session?.user?.role !== "ADMIN") throw new Error("Forbidden");
}

export async function saveKonfigUmum(data: FormData) {
  await requireAdmin();
  const countdownRaw = data.get("countdownTarget") as string;
  const countdownAktif = data.get("countdownAktif") === "on";
  const pendaftaranDeadlineRaw = data.get("pendaftaranDeadline") as string;
  const biayaSD = parseInt(data.get("biayaSD") as string);
  const biayaSDDP = parseInt(data.get("biayaSDDP") as string);
  const biayaSMP = parseInt(data.get("biayaSMP") as string);
  const biayaSMPDP = parseInt(data.get("biayaSMPDP") as string);
  const biayaSMA = parseInt(data.get("biayaSMA") as string);
  const biayaSMADP = parseInt(data.get("biayaSMADP") as string);
  const bankNama = (data.get("bankNama") as string) || "";
  const bankNoRek = (data.get("bankNoRek") as string) || "";
  const bankAtasNama = (data.get("bankAtasNama") as string) || "";

  // Semua section di PengaturanForm berbagi satu <form>, jadi field timeline
  // selalu ikut terkirim apa pun tombol "Simpan" yang diklik.
  const timeline: TimelineItem[] = [];
  for (let i = 1; i <= 4; i++) {
    const title = ((data.get(`timelineTitle${i}`) as string) || "").trim();
    const dateString = ((data.get(`timelineDate${i}`) as string) || "").trim();
    const description = ((data.get(`timelineDesc${i}`) as string) || "").trim();
    const icon = ((data.get(`timelineIcon${i}`) as string) || "").trim();
    if (!title || !dateString) {
      return { success: false, message: `Judul & tanggal tahap ${i} timeline wajib diisi` };
    }
    timeline.push({ title, dateString, description, icon: icon || "📌" });
  }

  const countdownTarget = parseWibDatetimeLocal(countdownRaw);
  if (!countdownTarget) {
    return { success: false, message: "Target waktu tidak valid" };
  }
  // Opsional — kalau dikosongkan, Hero tidak menampilkan countdown pendaftaran.
  const pendaftaranDeadline = pendaftaranDeadlineRaw ? parseWibDatetimeLocal(pendaftaranDeadlineRaw) : null;
  if (pendaftaranDeadlineRaw && !pendaftaranDeadline) {
    return { success: false, message: "Tanggal penutupan pendaftaran tidak valid" };
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
      pendaftaranDeadline,
      biayaSD, biayaSDDP, biayaSMP, biayaSMPDP, biayaSMA, biayaSMADP,
      bankNama, bankNoRek, bankAtasNama,
      timeline,
    });
    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { success: false, message: "Gagal menyimpan konfigurasi" };
  }
}
