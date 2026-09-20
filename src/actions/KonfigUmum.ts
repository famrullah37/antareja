"use server";

import { getServerSession } from "@/lib/next-auth";
import { upsertKonfigUmum, type TimelineItem } from "@/queries/konfigUmum.query";
import { revalidatePath } from "next/cache";
import { parseWibDatetimeLocal } from "@/lib/datetime";
import { imageUploader, validateUploadFile } from "./fileUploader";

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
  const biayaPurna = parseInt(data.get("biayaPurna") as string);
  const biayaPurnaDP = parseInt(data.get("biayaPurnaDP") as string);
  const bankNama = (data.get("bankNama") as string) || "";
  const bankNoRek = (data.get("bankNoRek") as string) || "";
  const bankAtasNama = (data.get("bankAtasNama") as string) || "";
  const sdAktif = data.get("sdAktif") === "on";
  const smpAktif = data.get("smpAktif") === "on";
  const smaAktif = data.get("smaAktif") === "on";
  const purnaAktif = data.get("purnaAktif") === "on";

  // Kuota per jenjang — kosong berarti tidak dibatasi (null), bukan 0.
  const parseKuota = (raw: string | null): number | null => {
    if (!raw || !raw.trim()) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  const kuotaSD = parseKuota(data.get("kuotaSD") as string | null);
  const kuotaSMP = parseKuota(data.get("kuotaSMP") as string | null);
  const kuotaSMA = parseKuota(data.get("kuotaSMA") as string | null);
  const kuotaPurna = parseKuota(data.get("kuotaPurna") as string | null);

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
    ["Purna", biayaPurna], ["Purna DP", biayaPurnaDP],
  ] as const) {
    if (!Number.isFinite(n) || n < 0) {
      return { success: false, message: `Biaya ${label} tidak valid` };
    }
  }

  // Juklak (PDF) — opsional, hanya ikut disimpan kalau admin upload file baru
  // (dikosongkan berarti tidak mengubah link Juklak yang sudah ada).
  const juklakFile = data.get("juklak") as File | null;
  let juklakUrl: string | undefined;
  if (juklakFile && juklakFile.size > 0) {
    const fileCheck = await validateUploadFile(juklakFile, { maxMB: 15, allowPdf: true });
    if (!fileCheck.valid) return { success: false, message: fileCheck.message };
    const upload = await imageUploader(Buffer.from(await juklakFile.arrayBuffer()));
    if (upload.error) return { success: false, message: upload.message };
    juklakUrl = upload.data!.url;
  }

  // Tanda tangan bendahara (gambar) — sama pola dengan Juklak, opsional.
  const bendaharaNama = (data.get("bendaharaNama") as string) || "";
  const ttdFile = data.get("bendaharaTtd") as File | null;
  let bendaharaTtdUrl: string | undefined;
  if (ttdFile && ttdFile.size > 0) {
    const fileCheck = await validateUploadFile(ttdFile);
    if (!fileCheck.valid) return { success: false, message: fileCheck.message };
    const upload = await imageUploader(Buffer.from(await ttdFile.arrayBuffer()));
    if (upload.error) return { success: false, message: upload.message };
    bendaharaTtdUrl = upload.data!.url;
  }

  try {
    await upsertKonfigUmum({
      countdownTarget,
      countdownAktif,
      pendaftaranDeadline,
      biayaSD, biayaSDDP, biayaSMP, biayaSMPDP, biayaSMA, biayaSMADP,
      biayaPurna, biayaPurnaDP,
      sdAktif, smpAktif, smaAktif, purnaAktif,
      kuotaSD, kuotaSMP, kuotaSMA, kuotaPurna,
      bankNama, bankNoRek, bankAtasNama,
      timeline,
      bendaharaNama,
      ...(juklakUrl ? { juklakUrl } : {}),
      ...(bendaharaTtdUrl ? { bendaharaTtdUrl } : {}),
    });
    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { success: false, message: "Gagal menyimpan konfigurasi" };
  }
}
