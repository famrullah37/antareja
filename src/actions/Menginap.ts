"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/next-auth";
import { catatLog } from "@/lib/activityLog";
import { cekDataPemesan } from "@/lib/validasi";
import {
  hariIniWib,
  jumlahMalam,
  MAKS_MALAM_MENGINAP,
  MAKS_ORANG_MENGINAP,
  parseTanggal,
  STATUS_MENGINAP,
  type StatusMenginap,
} from "@/lib/menginap";
import { getKonfigUmum, upsertKonfigUmum } from "@/queries/konfigUmum.query";

type Hasil = { success: boolean; message?: string };

async function requireStaf() {
  const session = await getServerSession();
  if (!["ADMIN", "SIE_LOMBA"].includes(session?.user?.role ?? "")) throw new Error("Forbidden");
}

function segarkan() {
  revalidatePath("/admin/menginap");
  revalidatePath("/dashboard");
}

function angka(data: FormData, key: string) {
  const n = parseInt((data.get(key) as string) || "0", 10);
  return Number.isInteger(n) ? n : NaN;
}

// ─── Admin / Sie Lomba ───────────────────────────────────────────────────────

export async function setPengaturanMenginap(data: FormData): Promise<Hasil> {
  await requireStaf();
  const menginapAktif = data.get("aktif") === "on";
  const menginapInfo = ((data.get("info") as string) || "").trim().slice(0, 2000) || null;
  try {
    await upsertKonfigUmum({ menginapAktif, menginapInfo });
    await catatLog("PENGATURAN_MENGINAP", menginapAktif ? "Pengajuan dibuka" : "Pengajuan ditutup");
    segarkan();
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Gagal menyimpan pengaturan" };
  }
}

// Panitia meninjau pengajuan: status & catatan untuk tim. Ruangan tim diatur
// terpisah di /admin/basecamp.
export async function tinjauMenginap(
  id: string,
  input: { status: StatusMenginap; catatanAdmin: string }
): Promise<Hasil> {
  await requireStaf();
  const { status } = input;
  if (!(status in STATUS_MENGINAP)) return { success: false, message: "Status tidak valid" };
  const catatan = (input.catatanAdmin || "").trim().slice(0, 500) || null;
  if (status === "DITOLAK" && !catatan) return { success: false, message: "Isi alasan penolakan untuk tim" };
  try {
    const p = await prisma.pengajuanMenginap.update({
      where: { id },
      data: { status, catatanAdmin: catatan },
      include: { tim: { select: { nama_tim: true } } },
    });
    await catatLog("TINJAU_MENGINAP", `${p.tim.nama_tim} → ${status}${catatan ? ` (${catatan})` : ""}`);
    segarkan();
    revalidatePath("/admin/basecamp");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Gagal menyimpan status" };
  }
}

export async function hapusPengajuanMenginap(id: string): Promise<Hasil> {
  await requireStaf();
  try {
    const p = await prisma.pengajuanMenginap.delete({ where: { id }, include: { tim: { select: { nama_tim: true } } } });
    await catatLog("HAPUS_MENGINAP", p.tim.nama_tim);
    segarkan();
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Gagal menghapus pengajuan" };
  }
}

// ─── Tim (dashboard) ─────────────────────────────────────────────────────────

// Tim milik user yang login + pengajuannya. Mengembalikan pesan error (string)
// kalau tim tidak boleh mengubah pengajuan.
async function timYangBolehUbah() {
  const session = await getServerSession();
  if (session?.user?.role !== "USER") return "Hanya akun tim yang bisa mengajukan menginap";
  // Sama dengan tim yang tampil di dashboard (findTimsByUser()[0]).
  const tim = await prisma.tim.findFirst({
    where: { userId: session.user.id },
    orderBy: { updated_at: "desc" },
    select: { id: true, nama_tim: true, confirmed: true, menginap: { select: { status: true } } },
  });
  if (!tim) return "Tim tidak ditemukan";
  if (!tim.confirmed) return "Pengajuan menginap dibuka setelah pembayaran tim diverifikasi";
  const konfig = await getKonfigUmum();
  if (!konfig.menginapAktif) return "Pengajuan menginap sedang ditutup, hubungi panitia";
  if (tim.menginap?.status === "DISETUJUI")
    return "Pengajuan sudah disetujui. Untuk perubahan, hubungi panitia";
  return tim;
}

export async function ajukanMenginap(data: FormData): Promise<Hasil> {
  const tim = await timYangBolehUbah();
  if (typeof tim === "string") return { success: false, message: tim };

  const jumlahPutra = angka(data, "jumlahPutra");
  const jumlahPutri = angka(data, "jumlahPutri");
  const jumlahPendamping = angka(data, "jumlahPendamping");
  const tanggalDatang = parseTanggal(data.get("tanggalDatang") as string);
  const tanggalPulang = parseTanggal(data.get("tanggalPulang") as string);
  const namaPj = ((data.get("namaPj") as string) || "").trim();
  const noHpPj = ((data.get("noHpPj") as string) || "").trim();
  const catatan = ((data.get("catatan") as string) || "").trim().slice(0, 500) || null;

  const jumlah = [jumlahPutra, jumlahPutri, jumlahPendamping];
  if (jumlah.some((n) => isNaN(n) || n < 0 || n > MAKS_ORANG_MENGINAP))
    return { success: false, message: `Jumlah orang harus 0–${MAKS_ORANG_MENGINAP}` };
  if (jumlahPutra + jumlahPutri + jumlahPendamping < 1)
    return { success: false, message: "Isi jumlah orang yang menginap" };
  if (!tanggalDatang || !tanggalPulang) return { success: false, message: "Tanggal datang & pulang wajib diisi" };
  if (tanggalDatang < hariIniWib()) return { success: false, message: "Tanggal datang sudah lewat" };
  const malam = jumlahMalam(tanggalDatang, tanggalPulang);
  if (malam < 1) return { success: false, message: "Tanggal pulang harus setelah tanggal datang" };
  if (malam > MAKS_MALAM_MENGINAP) return { success: false, message: `Maksimal ${MAKS_MALAM_MENGINAP} malam` };
  const salahPj = cekDataPemesan({ nama: namaPj, noHp: noHpPj }, { emailWajib: false });
  if (salahPj) return { success: false, message: `Penanggung jawab: ${salahPj}` };

  // Mengubah pengajuan (termasuk yang ditolak) = minta ditinjau ulang.
  const isi = {
    jumlahPutra,
    jumlahPutri,
    jumlahPendamping,
    tanggalDatang,
    tanggalPulang,
    namaPj,
    noHpPj,
    catatan,
    status: "PENDING",
    catatanAdmin: null,
  };
  try {
    await prisma.pengajuanMenginap.upsert({
      where: { timId: tim.id },
      create: { timId: tim.id, ...isi },
      update: isi,
    });
    await catatLog(
      tim.menginap ? "UBAH_MENGINAP" : "AJUKAN_MENGINAP",
      `${tim.nama_tim}: ${jumlahPutra} putra, ${jumlahPutri} putri, ${jumlahPendamping} pendamping, ${malam} malam`
    );
    segarkan();
    revalidatePath("/admin/basecamp");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Gagal menyimpan pengajuan" };
  }
}

export async function batalMenginap(): Promise<Hasil> {
  const tim = await timYangBolehUbah();
  if (typeof tim === "string") return { success: false, message: tim };
  try {
    await prisma.pengajuanMenginap.deleteMany({ where: { timId: tim.id } });
    await catatLog("BATAL_MENGINAP", tim.nama_tim);
    segarkan();
    revalidatePath("/admin/basecamp");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Gagal membatalkan pengajuan" };
  }
}
