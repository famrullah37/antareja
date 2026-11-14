"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/next-auth";
import { revalidatePath } from "next/cache";
import { catatLog } from "@/lib/activityLog";
import { isJenisGugur, JENIS_GUGUR } from "@/lib/gugurTim";

type Hasil = { success: boolean; message?: string };

// Status gugur tim (mengundurkan diri / tidak hadir) — aturannya di lib/gugurTim.ts.
// Dipakai dari menu Tim & Presensi DP (keduanya Admin & Sie Lomba).
async function requireStaf() {
  const session = await getServerSession();
  const user = session?.user;
  if (!user || !["ADMIN", "SIE_LOMBA"].includes(user.role ?? "")) throw new Error("Forbidden");
  return user.nama ?? user.email ?? "Panitia";
}

// Voting sudah dibuka? (toggle aktif ON dan waktu mulai — bila diisi — sudah lewat.)
async function votingSudahDibuka() {
  const k = await prisma.konfigVoting.findUnique({ where: { id: "singleton" }, select: { aktif: true, mulaiPada: true } });
  return !!k?.aktif && (!k.mulaiPada || k.mulaiPada <= new Date());
}

function segarkan() {
  revalidatePath("/admin/tim", "layout");
  revalidatePath("/admin/presensi-dp", "layout");
  revalidatePath("/admin/penilaian-baru", "layout");
  revalidatePath("/admin/penghargaan");
  revalidatePath("/admin/sertifikat");
  revalidatePath("/admin/pengumuman");
  revalidatePath("/admin/voting");
  revalidatePath("/dashboard");
  revalidatePath("/vote");
}

export async function tandaiGugurTim(timId: string, jenis: string, alasanInput?: string): Promise<Hasil> {
  const oleh = await requireStaf();
  if (!isJenisGugur(jenis)) return { success: false, message: "Pilih jenis: mengundurkan diri atau tidak hadir" };
  if (typeof timId !== "string" || !timId) return { success: false, message: "Tim tidak ditemukan" };
  const tim = await prisma.tim.findFirst({
    where: { id: timId, confirmed: true },
    select: {
      id: true,
      nama_tim: true,
      gugurAt: true,
      totalVote: true,
      presensiDP: { select: { id: true } },
      penilaianBaru: { select: { published: true } },
      _count: { select: { transaksiVoting: true } },
    },
  });
  if (!tim) return { success: false, message: "Tim tidak ditemukan atau pembayaran belum terkonfirmasi" };
  if (tim.gugurAt) return { success: false, message: "Tim ini sudah ditandai — batalkan dulu bila ingin mengganti jenisnya" };
  // "Tidak hadir" bertentangan dengan presensi hadir; mundur boleh (mis. mundur di DP karena cedera).
  if (jenis === "TIDAK_HADIR" && tim.presensiDP)
    return { success: false, message: "Tim sudah tercatat hadir di DP — reset presensinya dulu bila salah tim" };
  if (tim.penilaianBaru?.published)
    return { success: false, message: "Nilai tim ini sudah dipublish — sembunyikan dulu di Konfigurasi Penilaian" };

  const alasan = typeof alasanInput === "string" ? alasanInput.trim().slice(0, 200) || null : null;
  const mundur = jenis === "MUNDUR";
  // Hanya mundur SEBELUM voting dibuka & tanpa transaksi vote apa pun (termasuk
  // yang masih PENDING) yang dikeluarkan dari voting.
  const tanpaVote = mundur && tim.totalVote === 0 && tim._count.transaksiVoting === 0 && !(await votingSudahDibuka());
  try {
    // updateMany + gugurAt null: dua klik bersamaan tidak saling menimpa.
    const { count } = await prisma.tim.updateMany({
      where: { id: tim.id, gugurAt: null },
      data: { gugurAt: new Date(), gugurJenis: jenis, gugurAlasan: alasan, gugurOleh: oleh, gugurTanpaVote: tanpaVote },
    });
    if (count === 0) return { success: false, message: "Tim ini sudah ditandai" };
    await catatLog(
      "TIM_GUGUR",
      `${tim.nama_tim}: ${JENIS_GUGUR[jenis]}${alasan ? ` — ${alasan}` : ""} · ${tanpaVote ? "keluar dari voting" : "tetap di voting"}`
    );
    segarkan();
    return { success: true };
  } catch (e) {
    console.error("tandaiGugurTim error:", e);
    return { success: false, message: "Gagal menyimpan" };
  }
}

export async function batalGugurTim(timId: string): Promise<Hasil> {
  await requireStaf();
  if (typeof timId !== "string" || !timId) return { success: false, message: "Tim tidak ditemukan" };
  const tim = await prisma.tim.findUnique({ where: { id: timId }, select: { id: true, nama_tim: true, gugurAt: true } });
  if (!tim) return { success: false, message: "Tim tidak ditemukan" };
  if (!tim.gugurAt) return { success: true };
  try {
    await prisma.tim.update({
      where: { id: tim.id },
      data: { gugurAt: null, gugurJenis: null, gugurAlasan: null, gugurOleh: null, gugurTanpaVote: false },
    });
    await catatLog("TIM_GUGUR_DIBATALKAN", tim.nama_tim);
    segarkan();
    return { success: true };
  } catch (e) {
    console.error("batalGugurTim error:", e);
    return { success: false, message: "Gagal menyimpan" };
  }
}
