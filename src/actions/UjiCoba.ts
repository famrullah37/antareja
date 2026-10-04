"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/next-auth";
import { catatLog } from "@/lib/activityLog";
import { parseWibDatetimeLocal } from "@/lib/datetime";
import { daftarSlot, formatRentangSlot, MAKS_SLOT_PER_SESI, slotValid, ujiCobaTerkunci } from "@/lib/ujiCoba";
import { getKonfigUmum, upsertKonfigUmum } from "@/queries/konfigUmum.query";

type Hasil = { success: boolean; message?: string };

async function requireStaf() {
  const session = await getServerSession();
  if (!["ADMIN", "SIE_LOMBA"].includes(session?.user?.role ?? "")) throw new Error("Forbidden");
}

function segarkan() {
  revalidatePath("/admin/uji-coba");
  revalidatePath("/dashboard");
}

const SLOT_DIAMBIL = "Slot ini baru saja diambil tim lain, silakan pilih slot lain";

function isUniqueViolation(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

// Cek sesi ada & waktu mulai adalah slot yang sah di sesi itu.
async function ambilSlot(sesiId: string, mulaiIso: string) {
  const sesi = await prisma.sesiUjiCoba.findUnique({ where: { id: sesiId } });
  const mulai = new Date(mulaiIso);
  if (!sesi || isNaN(mulai.getTime()) || !slotValid(sesi, mulai)) return null;
  return { sesi, mulai };
}

// ─── Admin / Sie Lomba ───────────────────────────────────────────────────────

export async function createSesiUjiCoba(data: FormData): Promise<Hasil> {
  await requireStaf();
  const nama = ((data.get("nama") as string) || "").trim();
  const mulai = parseWibDatetimeLocal(data.get("mulai") as string);
  const selesai = parseWibDatetimeLocal(data.get("selesai") as string);
  const durasiMenit = parseInt((data.get("durasiMenit") as string) || "10", 10);

  if (!nama) return { success: false, message: "Nama sesi wajib diisi" };
  if (!mulai || !selesai) return { success: false, message: "Waktu mulai & selesai wajib diisi" };
  if (!Number.isInteger(durasiMenit) || durasiMenit < 1 || durasiMenit > 120)
    return { success: false, message: "Durasi per tim harus 1–120 menit" };
  if (selesai.getTime() - mulai.getTime() < durasiMenit * 60_000)
    return { success: false, message: "Waktu selesai harus setelah mulai, minimal satu slot" };
  if ((selesai.getTime() - mulai.getTime()) / (durasiMenit * 60_000) > MAKS_SLOT_PER_SESI)
    return { success: false, message: `Sesi terlalu panjang (maksimal ${MAKS_SLOT_PER_SESI} slot), cek tanggalnya` };

  try {
    await prisma.sesiUjiCoba.create({ data: { nama, mulai, selesai, durasiMenit } });
    await catatLog("TAMBAH_SESI_UJI_COBA", `${nama} (${daftarSlot({ mulai, selesai, durasiMenit }).length} slot)`);
    segarkan();
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Gagal menambah sesi" };
  }
}

export async function deleteSesiUjiCoba(id: string): Promise<Hasil> {
  await requireStaf();
  try {
    const sesi = await prisma.sesiUjiCoba.delete({ where: { id }, include: { bookings: true } });
    await catatLog("HAPUS_SESI_UJI_COBA", `${sesi.nama} (${sesi.bookings.length} tim kehilangan slot)`);
    segarkan();
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Gagal menghapus sesi" };
  }
}

export async function setBatasUjiCoba(data: FormData): Promise<Hasil> {
  await requireStaf();
  const raw = (data.get("batas") as string) || "";
  const batas = raw ? parseWibDatetimeLocal(raw) : null;
  if (raw && !batas) return { success: false, message: "Format batas waktu tidak valid" };
  try {
    await upsertKonfigUmum({ ujiCobaBatas: batas });
    segarkan();
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Gagal menyimpan batas waktu" };
  }
}

// Admin menempatkan/memindahkan tim ke slot (tanpa batas waktu & syarat jam).
export async function adminSetSlotUjiCoba(timId: string, sesiId: string, mulaiIso: string): Promise<Hasil> {
  await requireStaf();
  const slot = await ambilSlot(sesiId, mulaiIso);
  if (!slot) return { success: false, message: "Slot tidak valid" };
  const tim = await prisma.tim.findUnique({ where: { id: timId }, select: { nama_tim: true, confirmed: true } });
  if (!tim) return { success: false, message: "Tim tidak ditemukan" };
  if (!tim.confirmed) return { success: false, message: "Pembayaran tim ini belum diverifikasi" };

  try {
    await prisma.ujiCobaTim.upsert({
      where: { timId },
      create: { timId, sesiId, mulai: slot.mulai },
      update: { sesiId, mulai: slot.mulai },
    });
    await catatLog(
      "SET_SLOT_UJI_COBA",
      `${tim.nama_tim} → ${slot.sesi.nama} ${formatRentangSlot(slot.mulai, slot.sesi.durasiMenit)}`
    );
    segarkan();
    return { success: true };
  } catch (e) {
    if (isUniqueViolation(e)) return { success: false, message: "Slot ini sudah terisi tim lain" };
    console.error(e);
    return { success: false, message: "Gagal menyimpan slot" };
  }
}

export async function adminHapusSlotUjiCoba(timId: string): Promise<Hasil> {
  await requireStaf();
  try {
    const hapus = await prisma.ujiCobaTim.delete({ where: { timId }, include: { tim: { select: { nama_tim: true } } } });
    await catatLog("HAPUS_SLOT_UJI_COBA", hapus.tim.nama_tim);
    segarkan();
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Gagal menghapus slot" };
  }
}

// ─── Tim (dashboard) ─────────────────────────────────────────────────────────

// Tim milik user yang login + cek syarat & batas waktu. Mengembalikan pesan
// error (string) kalau tidak boleh mengubah slot.
async function timYangBolehUbah() {
  const session = await getServerSession();
  if (session?.user?.role !== "USER") return "Hanya akun tim yang bisa memilih slot";
  // Sama dengan tim yang tampil di dashboard (findTimsByUser()[0]).
  const tim = await prisma.tim.findFirst({
    where: { userId: session.user.id },
    orderBy: { updated_at: "desc" },
    include: { ujiCoba: true },
  });
  if (!tim) return "Tim tidak ditemukan";
  if (!tim.confirmed) return "Pendaftaran uji coba dibuka setelah pembayaran tim diverifikasi";
  const konfig = await getKonfigUmum();
  if (ujiCobaTerkunci(konfig.ujiCobaBatas)) return "Batas waktu memilih/mengganti slot sudah lewat, hubungi panitia";
  if (tim.ujiCoba && tim.ujiCoba.mulai.getTime() <= Date.now()) return "Slot uji coba tim sudah berjalan/lewat";
  return tim;
}

export async function pilihSlotUjiCoba(sesiId: string, mulaiIso: string): Promise<Hasil> {
  const tim = await timYangBolehUbah();
  if (typeof tim === "string") return { success: false, message: tim };
  const slot = await ambilSlot(sesiId, mulaiIso);
  if (!slot) return { success: false, message: "Slot tidak valid" };
  if (slot.mulai.getTime() <= Date.now()) return { success: false, message: "Slot ini sudah lewat" };

  try {
    // upsert: pilih pertama kali atau pindah slot. Rebutan slot yang sama
    // diselesaikan unique (sesiId, mulai) di database — yang kalah dapat P2002.
    await prisma.ujiCobaTim.upsert({
      where: { timId: tim.id },
      create: { timId: tim.id, sesiId, mulai: slot.mulai },
      update: { sesiId, mulai: slot.mulai },
    });
    await catatLog(
      "PILIH_SLOT_UJI_COBA",
      `${tim.nama_tim} → ${slot.sesi.nama} ${formatRentangSlot(slot.mulai, slot.sesi.durasiMenit)}`
    );
    segarkan();
    return { success: true };
  } catch (e) {
    if (isUniqueViolation(e)) return { success: false, message: SLOT_DIAMBIL };
    console.error(e);
    return { success: false, message: "Gagal menyimpan slot" };
  }
}

export async function batalSlotUjiCoba(): Promise<Hasil> {
  const tim = await timYangBolehUbah();
  if (typeof tim === "string") return { success: false, message: tim };
  try {
    await prisma.ujiCobaTim.deleteMany({ where: { timId: tim.id } });
    await catatLog("BATAL_SLOT_UJI_COBA", tim.nama_tim);
    segarkan();
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Gagal membatalkan slot" };
  }
}
