"use server";

import { getServerSession } from "@/lib/next-auth";
import { revalidatePath } from "next/cache";
import { sendMailTo } from "@/lib/mailer";
import QRCode from "qrcode";

async function requireAdmin() {
  const session = await getServerSession();
  if (session?.user?.role !== "ADMIN") throw new Error("Forbidden");
}

async function requireAdminOrTiket() {
  const session = await getServerSession();
  if (!["ADMIN", "TIKET"].includes(session?.user?.role ?? "")) throw new Error("Forbidden");
}
import {
  createTiket,
  createTransaksiTiket,
  deleteTiket,
  findTransaksiTiket,
  updateQRTiket,
  updateTiket,
  updateTransaksiTiket,
  upsertKonfigTiket,
} from "@/queries/tiket.query";
import { imageUploader } from "./fileUploader";
import prisma from "@/lib/prisma";

// ─── Admin: Master Tiket ──────────────────────────────────────────────────────

export async function createTiketAdmin(data: FormData) {
  await requireAdmin();
  const jenis = data.get("jenis") as string;
  const harga = parseInt(data.get("harga") as string);
  const kuota = parseInt(data.get("kuota") as string);
  try {
    await createTiket({ jenis, harga, kuota, sisa: kuota });
    revalidatePath("/admin/tiket");
    return { success: true };
  } catch { return { success: false }; }
}

export async function updateTiketAdmin(data: FormData, id: string) {
  await requireAdmin();
  const jenis = data.get("jenis") as string;
  const harga = parseInt(data.get("harga") as string);
  const kuota = parseInt(data.get("kuota") as string);
  try {
    await updateTiket({ id }, { jenis, harga, kuota });
    revalidatePath("/admin/tiket");
    return { success: true };
  } catch { return { success: false }; }
}

export async function saveKonfigTiket(data: FormData) {
  await requireAdmin();
  const bankNama = data.get("bankNama") as string;
  const bankNoRek = data.get("bankNoRek") as string;
  const bankAtasNama = data.get("bankAtasNama") as string;
  const qrisFile = data.get("qris") as File;

  try {
    const update: Parameters<typeof upsertKonfigTiket>[0] = {
      bankNama, bankNoRek, bankAtasNama,
    };
    if (qrisFile && qrisFile.size > 0) {
      const upload = await imageUploader(Buffer.from(await qrisFile.arrayBuffer()));
      if (upload.error) return { success: false, message: upload.message };
      update.qrisUrl = upload.data!.url;
    }
    await upsertKonfigTiket(update);
    revalidatePath("/admin/tiket");
    revalidatePath("/tiket");
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function deleteTiketAdmin(id: string) {
  await requireAdmin();
  try {
    await deleteTiket({ id });
    revalidatePath("/admin/tiket");
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ─── User: Beli Tiket ─────────────────────────────────────────────────────────

export async function beliTiket(data: FormData, userId?: string) {
  const tiketId = data.get("tiketId") as string;
  const jumlah = parseInt(data.get("jumlah") as string);
  const nama = data.get("nama") as string;
  const email = data.get("email") as string;
  const noHp = data.get("noHp") as string;
  const bukti = data.get("bukti") as File;
  const metodePembayaran = (data.get("metodePembayaran") as string) || "TRANSFER";
  const kodeUnik = data.get("kodeUnik") as string | null;

  try {
    const tiket = await prisma.tiket.findUnique({ where: { id: tiketId } });
    if (!tiket) return { success: false, message: "Tiket tidak ditemukan" };
    if (tiket.sisa < jumlah) return { success: false, message: "Stok tiket tidak mencukupi" };

    let buktiUrl: string | undefined;
    if (bukti && bukti.size > 0) {
      const upload = await imageUploader(Buffer.from(await bukti.arrayBuffer()));
      if (upload.error) {
        console.error("Upload bukti gagal:", upload.message);
        return { success: false, message: upload.message };
      }
      buktiUrl = upload.data?.url;
    }

    await createTransaksiTiket({
      tiket: { connect: { id: tiketId } },
      jumlah,
      nama,
      email,
      noHp,
      ...(buktiUrl ? { bukti: buktiUrl } : {}),
      status: "PENDING",
      metodePembayaran,
      ...(kodeUnik ? { kodeUnik } : {}),
      ...(userId ? { user: { connect: { id: userId } } } : {}),
    });
    revalidatePath("/tiket");
    return { success: true };
  } catch (e) {
    console.error("beliTiket error:", e);
    return { success: false };
  }
}

// ─── Admin: Penjualan Offline ────────────────────────────────────────────────

export async function jualTiketOffline(data: FormData) {
  await requireAdminOrTiket();
  const tiketId = data.get("tiketId") as string;
  const jumlah = parseInt(data.get("jumlah") as string);
  const nama = data.get("nama") as string;
  const email = (data.get("email") as string) || "-";
  const noHp = (data.get("noHp") as string) || "-";
  const catatanAdmin = (data.get("catatanAdmin") as string) || null;
  const metodePembayaran = (data.get("metodePembayaran") as string) || "CASH";

  try {
    const tiket = await prisma.tiket.findUnique({ where: { id: tiketId } });
    if (!tiket) return { success: false };

    const transaksi = await createTransaksiTiket({
      tiket: { connect: { id: tiketId } },
      jumlah,
      nama,
      email,
      noHp,
      status: "VERIFIED",
      jenisJual: "OFFLINE",
      metodePembayaran,
      ...(catatanAdmin ? { catatanAdmin } : {}),
    });

    await prisma.qRTiket.createMany({
      data: Array.from({ length: jumlah }, () => ({
        transaksiId: transaksi.id,
      })),
    });

    await prisma.tiket.update({
      where: { id: tiketId },
      data: { sisa: { decrement: jumlah } },
    });

    await prisma.kasTransaksi.create({
      data: {
        tipe: "PEMASUKAN",
        keterangan: `Tiket ${tiket.jenis} × ${jumlah} (${nama}) — Offline`,
        jumlah: tiket.harga * jumlah,
        kategori: "TIKET",
        sumber: "TIKET",
        referensiId: transaksi.id,
      },
    });

    revalidatePath("/admin/tiket");
    revalidatePath("/admin/kas");
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ─── Admin: Verifikasi & QR ───────────────────────────────────────────────────

export async function verifikasiTiket(transaksiId: string) {
  await requireAdminOrTiket();
  try {
    const transaksi = await findTransaksiTiket({ id: transaksiId });
    if (!transaksi) return { success: false };

    await updateTransaksiTiket({ id: transaksiId }, { status: "VERIFIED" });

    await prisma.qRTiket.createMany({
      data: Array.from({ length: transaksi.jumlah }, () => ({
        transaksiId,
      })),
    });

    await prisma.tiket.update({
      where: { id: transaksi.tiketId },
      data: { sisa: { decrement: transaksi.jumlah } },
    });

    // Auto-kas
    await prisma.kasTransaksi.create({
      data: {
        tipe: "PEMASUKAN",
        keterangan: `Tiket ${transaksi.tiket.jenis} × ${transaksi.jumlah} (${transaksi.nama})`,
        jumlah: transaksi.tiket.harga * transaksi.jumlah,
        kategori: "TIKET",
        sumber: "TIKET",
        referensiId: transaksiId,
      },
    });

    // Ambil QR tokens yang baru dibuat + generate gambar QR
    const qrTikets = await prisma.qRTiket.findMany({ where: { transaksiId } });
    const qrBlocks = await Promise.all(
      qrTikets.map(async (q, i) => {
        const dataUrl = await QRCode.toDataURL(q.token, { width: 200, margin: 2 });
        return `
          <div style="display:inline-block;text-align:center;margin:8px">
            <div style="font-size:12px;font-weight:bold;margin-bottom:4px">Tiket #${i + 1}</div>
            <img src="${dataUrl}" width="160" height="160" style="display:block;border-radius:8px;border:1px solid #e5e7eb" alt="QR Tiket ${i + 1}"/>
            <div style="font-size:10px;font-family:monospace;color:#888;margin-top:4px;max-width:160px;overflow:hidden;text-overflow:ellipsis">${q.token}</div>
          </div>`;
      })
    );

    // Kirim email
    try {
      await sendMailTo({
        to: transaksi.email,
        subject: `✅ Tiket LKBB Antareja 2026 — ${transaksi.tiket.jenis}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto">
            <h2 style="color:#F70048">Tiket Anda Terverifikasi!</h2>
            <p>Halo <b>${transaksi.nama}</b>,</p>
            <p>Pembelian tiket <b>${transaksi.tiket.jenis}</b> (${transaksi.jumlah} tiket) telah diverifikasi.</p>
            <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:16px 0">
              <p style="margin:0 0 12px;font-weight:bold">QR Code Tiket Anda:</p>
              <div style="display:flex;flex-wrap:wrap;gap:8px">
                ${qrBlocks.join("")}
              </div>
              <p style="margin:12px 0 0;font-size:12px;color:#888">Screenshot email ini atau tunjukkan langsung di pintu masuk.</p>
            </div>
            <p style="font-size:12px;color:#aaa">LKBB Antareja 2026 — SMK Telkom Malang</p>
          </div>
        `,
      });
    } catch (e) {
      console.error("Gagal kirim email tiket:", e);
    }

    revalidatePath("/admin/tiket");
    revalidatePath("/admin/kas");
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function rejectTiket(transaksiId: string) {
  await requireAdminOrTiket();
  try {
    await updateTransaksiTiket({ id: transaksiId }, { status: "REJECTED" });
    revalidatePath("/admin/tiket");
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function scanQRTiket(token: string) {
  try {
    const qr = await prisma.qRTiket.findUnique({
      where: { token },
      include: { transaksi: { include: { tiket: true } } },
    });

    if (!qr) return { success: false, message: "QR tidak valid" };
    if (qr.statusScan)
      return { success: false, message: "Tiket sudah pernah di-scan" };
    if (qr.transaksi.status !== "VERIFIED")
      return { success: false, message: "Tiket belum diverifikasi" };

    await updateQRTiket(
      { token },
      { statusScan: true, waktuScan: new Date() }
    );

    return {
      success: true,
      data: {
        nama: qr.transaksi.nama,
        jenis: qr.transaksi.tiket.jenis,
        waktuScan: new Date().toISOString(),
      },
    };
  } catch {
    return { success: false, message: "Terjadi kesalahan" };
  }
}
