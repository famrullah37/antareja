"use server";

import { getServerSession } from "@/lib/next-auth";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { imageUploader } from "./fileUploader";
import { buildDynamicQrisImage, decodeQrisFromImage } from "@/lib/qris";
import {
  findKonfigVoting,
  findTransaksiVoting,
  updateTransaksiVoting,
  upsertKonfigVoting,
} from "@/queries/voting.query";

async function requireAdmin() {
  const session = await getServerSession();
  if (session?.user?.role !== "ADMIN") throw new Error("Forbidden");
}

async function requireAdminOrBendahara() {
  const session = await getServerSession();
  if (!["ADMIN", "BENDAHARA"].includes(session?.user?.role ?? "")) throw new Error("Forbidden");
}

// ─── Admin: Konfigurasi Voting ────────────────────────────────────────────────

export async function saveKonfigVoting(data: FormData) {
  await requireAdmin();
  const aktif = data.get("aktif") === "on";
  const nominalVote = parseInt(data.get("nominalVote") as string);
  const bankNama = data.get("bankNama") as string;
  const bankNoRek = data.get("bankNoRek") as string;
  const bankAtasNama = data.get("bankAtasNama") as string;
  const qrisFile = data.get("qris") as File;

  try {
    const update: Parameters<typeof upsertKonfigVoting>[0] = {
      aktif,
      nominalVote,
      bankNama,
      bankNoRek,
      bankAtasNama,
    };
    let qrisTerbaca = true;
    if (qrisFile && qrisFile.size > 0) {
      const buffer = Buffer.from(await qrisFile.arrayBuffer());
      const upload = await imageUploader(buffer);
      if (upload.error) return { success: false, message: upload.message };
      update.qrisUrl = upload.data!.url;
      const payload = await decodeQrisFromImage(buffer);
      update.qrisPayload = payload;
      qrisTerbaca = !!payload;
    }
    await upsertKonfigVoting(update);
    revalidatePath("/admin/voting");
    revalidatePath("/vote");
    return {
      success: true,
      message: qrisTerbaca ? undefined : "Konfigurasi disimpan, tapi kode QRIS pada gambar tidak terbaca — QRIS dinamis nonaktif, dukungan tetap memakai gambar QRIS statis.",
    };
  } catch {
    return { success: false };
  }
}

// ─── Publik: QRIS Dinamis ─────────────────────────────────────────────────────

// Bangun QRIS dinamis (nominal sudah terisi) dari QRIS statis yang diupload admin,
// dipanggil dari client setiap kali nominal yang harus dibayar berubah.
export async function getDynamicQrisVoting(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return { success: false };
  try {
    const konfig = await findKonfigVoting();
    const dataUrl = await buildDynamicQrisImage(konfig?.qrisPayload, amount);
    if (!dataUrl) return { success: false };
    return { success: true, dataUrl };
  } catch {
    return { success: false };
  }
}

// ─── Publik: Kirim Dukungan (Vote Berbayar) ──────────────────────────────────

// Memesan nomor urut (kode unik) pembayaran secara atomik, dipanggil saat user
// memilih tim — sebelum mengisi form & mengunggah bukti transfer QRIS.
export async function reserveKodeVoting() {
  try {
    const konfig = await prisma.konfigVoting.findUnique({ where: { id: "singleton" } });
    if (!konfig || !konfig.aktif) {
      return { success: false, message: "Voting dukungan belum/tidak dibuka" };
    }
    const updated = await prisma.konfigVoting.update({
      where: { id: "singleton" },
      data: { counterUrut: { increment: 1 } },
    });
    const kodeUnik = String(updated.counterUrut).padStart(3, "0");
    return { success: true, kodeUnik, hargaSatuan: konfig.nominalVote };
  } catch (e) {
    console.error("reserveKodeVoting error:", e);
    return { success: false };
  }
}

export async function submitVote(data: FormData, userId?: string) {
  const timId = data.get("timId") as string;
  const nama = data.get("nama") as string;
  const email = data.get("email") as string;
  const noHp = data.get("noHp") as string;
  const kodeUnik = data.get("kodeUnik") as string;
  const jumlahVote = parseInt(data.get("jumlahVote") as string) || 1;
  const bukti = data.get("bukti") as File;

  if (!bukti || bukti.size === 0) {
    return { success: false, message: "Bukti pembayaran wajib diunggah" };
  }
  if (!kodeUnik || !/^\d+$/.test(kodeUnik)) {
    return { success: false, message: "Kode pembayaran tidak valid, silakan ulangi dari pemilihan tim" };
  }
  if (jumlahVote < 1) {
    return { success: false, message: "Jumlah vote tidak valid" };
  }

  // Pastikan kodeUnik benar-benar pernah di-reserve (bukan dikarang klien) dan
  // belum dipakai transaksi lain — mencegah dua transaksi bertabrakan nominal
  // transfernya, yang akan membingungkan admin saat rekonsiliasi manual.
  const konfigCheck = await prisma.konfigVoting.findUnique({ where: { id: "singleton" } });
  if (!konfigCheck || parseInt(kodeUnik) < 1 || parseInt(kodeUnik) > konfigCheck.counterUrut) {
    return { success: false, message: "Kode pembayaran tidak valid, silakan ulangi dari pemilihan tim" };
  }
  const kodeDipakai = await prisma.transaksiVoting.findFirst({
    where: { kodeUnik, status: { in: ["PENDING", "VERIFIED"] } },
  });
  if (kodeDipakai) {
    return { success: false, message: "Kode pembayaran sudah terpakai, silakan ulangi dari pemilihan tim untuk mendapat kode baru" };
  }

  try {
    const konfig = await prisma.konfigVoting.findUnique({ where: { id: "singleton" } });
    if (!konfig || !konfig.aktif) {
      return { success: false, message: "Voting dukungan belum/tidak dibuka" };
    }

    const tim = await prisma.tim.findUnique({ where: { id: timId } });
    if (!tim) return { success: false, message: "Tim tidak ditemukan" };

    const upload = await imageUploader(Buffer.from(await bukti.arrayBuffer()));
    if (upload.error) {
      console.error("Upload bukti vote gagal:", upload.message);
      return { success: false, message: upload.message };
    }

    const totalBayar = konfig.nominalVote * jumlahVote + parseInt(kodeUnik);

    await prisma.transaksiVoting.create({
      data: {
        tim: { connect: { id: timId } },
        nama,
        email,
        noHp,
        jumlahVote,
        hargaSatuan: konfig.nominalVote,
        kodeUnik,
        totalBayar,
        bukti: upload.data!.url,
        status: "PENDING",
        ...(userId ? { user: { connect: { id: userId } } } : {}),
      },
    });

    revalidatePath("/vote");
    return { success: true };
  } catch (e) {
    console.error("submitVote error:", e);
    return { success: false };
  }
}

// ─── Admin: Verifikasi Dukungan ──────────────────────────────────────────────

export async function verifikasiVoting(transaksiId: string) {
  await requireAdminOrBendahara();
  try {
    const transaksi = await findTransaksiVoting({ id: transaksiId });
    if (!transaksi) return { success: false };
    if (transaksi.status === "VERIFIED") return { success: false, message: "Dukungan sudah diverifikasi sebelumnya" };

    await updateTransaksiVoting({ id: transaksiId }, { status: "VERIFIED" });

    await prisma.tim.update({
      where: { id: transaksi.timId },
      data: { totalVote: { increment: transaksi.jumlahVote } },
    });

    await prisma.kasTransaksi.create({
      data: {
        tipe: "PEMASUKAN",
        keterangan: `Dukungan Voting ${transaksi.jumlahVote}x untuk ${transaksi.tim.nama_tim} (${transaksi.nama}) [#${transaksi.kodeUnik}]`,
        // Catat totalBayar (bukan hargaSatuan x jumlahVote) — itulah uang yang benar-benar masuk ke rekening/QRIS,
        // termasuk kode unik, jadi kas tetap cocok dengan mutasi nyata.
        jumlah: transaksi.totalBayar,
        kategori: "VOTING",
        sumber: "VOTING",
        referensiId: transaksiId,
      },
    });

    revalidatePath("/admin/voting");
    revalidatePath("/admin/kas");
    revalidatePath("/vote");
    return { success: true };
  } catch (e) {
    console.error("verifikasiVoting error:", e);
    return { success: false };
  }
}

export async function rejectVoting(transaksiId: string) {
  await requireAdminOrBendahara();
  try {
    await updateTransaksiVoting({ id: transaksiId }, { status: "REJECTED" });
    revalidatePath("/admin/voting");
    return { success: true };
  } catch {
    return { success: false };
  }
}
