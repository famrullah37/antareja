"use server";

import { getServerSession } from "@/lib/next-auth";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { imageUploader, validateUploadFile } from "./fileUploader";
import { buildDynamicQrisImage } from "@/lib/qris";
import { parseWibDatetimeLocal } from "@/lib/datetime";
import { findKonfigTiket } from "@/queries/tiket.query";
import { catatLog } from "@/lib/activityLog";
import { sendMailTo } from "@/lib/mailer";
import { markVotingVerified } from "@/lib/votingVerifikasi";
import {
  findTransaksiVoting,
  getKategoriList,
  updateTransaksiVoting,
  upsertKonfigVoting,
  type KategoriVoting,
} from "@/queries/voting.query";

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "kategori";
}

async function requireAdmin() {
  const session = await getServerSession();
  if (session?.user?.role !== "ADMIN") throw new Error("Forbidden");
}

async function requireAdminOrBendahara() {
  const session = await getServerSession();
  if (!["ADMIN", "BENDAHARA"].includes(session?.user?.role ?? "")) throw new Error("Forbidden");
}

// Voting dianggap buka kalau: toggle aktif ON, dan (kalau diisi) waktu sekarang
// berada di antara mulaiPada..tutupPada. mulaiPada/tutupPada opsional — kalau
// tidak diisi, admin cukup andalkan toggle aktif seperti sebelumnya.
// Diekspor (bukan cuma dipakai reserveKodeVoting/submitVote) supaya
// src/app/(main)/vote/page.tsx pakai fungsi yang sama persis untuk
// menentukan banner apa yang ditampilkan — dulu logikanya diduplikasi
// di sana, gampang beda sendiri kalau salah satu diubah tanpa yang lain.
export async function cekJendelaVoting(
  konfig: { aktif: boolean; mulaiPada: Date | null; tutupPada: Date | null } | null
) {
  if (!konfig || !konfig.aktif) return { open: false, belumMulai: false, sudahTutup: false, message: "Voting dukungan belum/tidak dibuka" };
  const now = new Date();
  if (konfig.mulaiPada && now < konfig.mulaiPada) return { open: false, belumMulai: true, sudahTutup: false, message: "Voting belum dibuka" };
  if (konfig.tutupPada && now > konfig.tutupPada) return { open: false, belumMulai: false, sudahTutup: true, message: "Voting sudah ditutup, terima kasih atas dukungannya!" };
  return { open: true, belumMulai: false, sudahTutup: false, message: undefined as string | undefined };
}

// ─── Admin: Konfigurasi Voting ────────────────────────────────────────────────

export async function saveKonfigVoting(data: FormData) {
  await requireAdmin();
  const aktif = data.get("aktif") === "on";
  const nominalVote = parseInt(data.get("nominalVote") as string);
  const bankNama = data.get("bankNama") as string;
  const bankNoRek = data.get("bankNoRek") as string;
  const bankAtasNama = data.get("bankAtasNama") as string;
  const mulaiPadaRaw = data.get("mulaiPada") as string;
  const tutupPadaRaw = data.get("tutupPada") as string;

  const mulaiPada = parseWibDatetimeLocal(mulaiPadaRaw);
  const tutupPada = parseWibDatetimeLocal(tutupPadaRaw);
  if ((mulaiPadaRaw && !mulaiPada) || (tutupPadaRaw && !tutupPada)) {
    return { success: false, message: "Format tanggal tidak valid" };
  }
  if (mulaiPada && tutupPada && mulaiPada >= tutupPada) {
    return { success: false, message: "Waktu mulai harus sebelum waktu tutup" };
  }

  // Kategori tambahan (di luar "Tim Favorit" bawaan) — dikirim sebagai
  // pasangan array kategoriLabel[]/kategoriUnit[] dengan indeks yang sama.
  const labels = data.getAll("kategoriLabel") as string[];
  const units = data.getAll("kategoriUnit") as string[];
  const usedKeys = new Set<string>();
  const kategoriList: KategoriVoting[] = [];
  for (let i = 0; i < labels.length; i++) {
    const label = (labels[i] || "").trim();
    if (!label) continue;
    const unit: KategoriVoting["unit"] =
      units[i] === "PELATIH" ? "PELATIH" : units[i] === "DANTON" ? "DANTON" : "TIM";
    let key = slugify(label);
    while (usedKeys.has(key) || key === "tim_favorit") key = `${key}_2`;
    usedKeys.add(key);
    kategoriList.push({ key, label, unit });
  }

  try {
    const update: Parameters<typeof upsertKonfigVoting>[0] = {
      aktif,
      nominalVote,
      bankNama,
      bankNoRek,
      bankAtasNama,
      mulaiPada,
      tutupPada,
      kategoriList,
    };
    await upsertKonfigVoting(update);
    revalidatePath("/admin/voting");
    revalidatePath("/vote");
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ─── Publik: QRIS Dinamis ─────────────────────────────────────────────────────

// Bangun QRIS dinamis (nominal sudah terisi) dari QRIS statis yang diupload
// admin di /admin/tiket — Voting sengaja pakai QRIS yang sama dengan Tiket/
// Galeri Foto Premium, lihat komentar di KonfigTiket (schema.prisma).
export async function getDynamicQrisVoting(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return { success: false };
  try {
    const konfig = await findKonfigTiket();
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
    if (!konfig) return { success: false, message: "Voting dukungan belum/tidak dibuka" };
    const status = await cekJendelaVoting(konfig);
    if (!status.open) return { success: false, message: status.message };
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
  const kategoriRaw = (data.get("kategori") as string) || "tim_favorit";
  const jumlahVote = parseInt(data.get("jumlahVote") as string) || 1;
  const bukti = data.get("bukti") as File | null;

  // Kategori wajib salah satu dari "tim_favorit" atau yang terdaftar di
  // KonfigVoting.kategoriList — cegah klien mengarang key kategori sendiri
  // (nanti dukungannya tidak ke-hitung di leaderboard manapun).
  const konfigKategori = await prisma.konfigVoting.findUnique({ where: { id: "singleton" } });
  const kategoriValid = getKategoriList(konfigKategori).some((k) => k.key === kategoriRaw);
  if (!kategoriValid) {
    return { success: false, message: "Kategori dukungan tidak valid, silakan ulangi dari pemilihan tim" };
  }
  const kategori = kategoriRaw;

  // Dukungan selalu dibayar via QRIS (lihat komentar KonfigVoting) — bukti
  // jadi opsional karena nominal sudah unik lewat kodeUnik, admin cocokkan
  // manual dari riwayat QRIS/mutasi rekening.
  const buktiAda = bukti && bukti.size > 0;
  if (buktiAda) {
    const fileCheck = await validateUploadFile(bukti as File);
    if (!fileCheck.valid) return { success: false, message: fileCheck.message };
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
    if (!konfig) return { success: false, message: "Voting dukungan belum/tidak dibuka" };
    const status = await cekJendelaVoting(konfig);
    if (!status.open) return { success: false, message: status.message };

    const tim = await prisma.tim.findUnique({ where: { id: timId } });
    if (!tim) return { success: false, message: "Tim tidak ditemukan" };

    let buktiUrl: string | undefined;
    if (buktiAda) {
      const upload = await imageUploader(Buffer.from(await (bukti as File).arrayBuffer()));
      if (upload.error) {
        console.error("Upload bukti vote gagal:", upload.message);
        return { success: false, message: upload.message };
      }
      buktiUrl = upload.data?.url;
    }

    const totalBayar = konfig.nominalVote * jumlahVote + parseInt(kodeUnik);

    await prisma.transaksiVoting.create({
      data: {
        tim: { connect: { id: timId } },
        nama,
        email,
        noHp,
        kategori,
        jumlahVote,
        hargaSatuan: konfig.nominalVote,
        kodeUnik,
        totalBayar,
        ...(buktiUrl ? { bukti: buktiUrl } : {}),
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
    return await markVotingVerified(transaksiId);
  } catch (e) {
    console.error("verifikasiVoting error:", e);
    return { success: false };
  }
}

export async function rejectVoting(transaksiId: string) {
  await requireAdminOrBendahara();
  try {
    const transaksi = await findTransaksiVoting({ id: transaksiId });
    await updateTransaksiVoting({ id: transaksiId }, { status: "REJECTED" });
    if (transaksi) {
      await catatLog("TOLAK_VOTING", `Dukungan ${transaksi.jumlahVote}x untuk ${transaksi.tim.nama_tim} (${transaksi.nama})`);
    }
    revalidatePath("/admin/voting");
    return { success: true };
  } catch {
    return { success: false };
  }
}
