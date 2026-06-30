"use server";

import { getServerSession } from "@/lib/next-auth";
import { revalidatePath } from "next/cache";
import {
  createAlbum,
  createFoto,
  createTransaksiFoto,
  deleteAlbum,
  deleteFoto,
  updateAlbum,
  updateTransaksiFoto,
} from "@/queries/galeri.query";
import { imageUploader } from "./fileUploader";
import { sendMailTo } from "@/lib/mailer";
import prisma from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession();
  if (session?.user?.role !== "ADMIN") throw new Error("Forbidden");
}

async function requireAdminOrFotografer() {
  const session = await getServerSession();
  if (!["ADMIN", "FOTOGRAFER"].includes(session?.user?.role ?? "")) throw new Error("Forbidden");
}

// ─── Admin: Album ─────────────────────────────────────────────────────────────

export async function createAlbumAdmin(data: FormData) {
  await requireAdminOrFotografer();
  const nama = data.get("nama") as string;
  const deskripsi = data.get("deskripsi") as string;
  const tipe = (data.get("tipe") as string) || "BERBAYAR";
  const harga = parseInt((data.get("harga") as string) || "0");
  try {
    await createAlbum({ nama, deskripsi, tipe, harga });
    revalidatePath("/admin/galeri");
    return { success: true };
  } catch { return { success: false }; }
}

export async function publishAlbum(albumId: string, publish: boolean) {
  await requireAdminOrFotografer();
  try {
    await updateAlbum({ id: albumId }, { statusPublish: publish });
    revalidatePath("/admin/galeri");
    revalidatePath("/galeri");
    return { success: true };
  } catch { return { success: false }; }
}

export async function deleteAlbumAdmin(albumId: string) {
  await requireAdminOrFotografer();
  try {
    await deleteAlbum({ id: albumId });
    revalidatePath("/admin/galeri");
    return { success: true };
  } catch { return { success: false }; }
}

// ─── Fotografer/Admin: Upload Foto ───────────────────────────────────────────

export async function uploadFoto(data: FormData) {
  await requireAdminOrFotografer();
  const albumId = data.get("albumId") as string;
  const tagTim = data.get("tagTim") as string;
  const files = data.getAll("fotos") as File[];

  const results = await Promise.allSettled(
    files.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploaded = await imageUploader(buffer);
      if (!uploaded.data?.url) throw new Error("Upload gagal");
      await createFoto({
        album: { connect: { id: albumId } },
        pathAsli: uploaded.data.url,
        pathWatermark: uploaded.data.url,
        tagTim: tagTim || undefined,
        statusPublish: true,
      });
    })
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  revalidatePath("/admin/galeri");
  revalidatePath("/galeri");
  return { success: true, uploaded: files.length - failed, failed };
}

export async function deleteFotoAdmin(fotoId: string) {
  await requireAdminOrFotografer();
  try {
    await deleteFoto({ id: fotoId });
    revalidatePath("/admin/galeri");
    return { success: true };
  } catch { return { success: false }; }
}

// ─── User: Beli Foto ──────────────────────────────────────────────────────────

export async function beliFoto(data: FormData, userId?: string) {
  const fotoListRaw = data.get("fotoList") as string;
  const bukti = data.get("bukti") as File;
  const email = (data.get("email") as string) || "";
  const namaPembeli = (data.get("namaPembeli") as string) || "";
  try {
    const fotoList = JSON.parse(fotoListRaw) as string[];
    const fotos = await prisma.foto.findMany({
      where: { id: { in: fotoList } },
      select: { albumId: true, album: { select: { harga: true } } },
    });
    const uniqueAlbumPrices = Array.from(new Map(fotos.map((f) => [f.albumId, f.album.harga])).values());
    const harga = uniqueAlbumPrices.reduce((sum, h) => sum + h, 0);
    const expiredAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const kodeUnik = crypto.randomUUID().replace(/-/g, "").substring(0, 8).toUpperCase();
    const upload = await imageUploader(Buffer.from(await bukti.arrayBuffer()));
    if (!upload.data?.url) return { success: false, message: "Upload bukti gagal" };
    const transaksi = await createTransaksiFoto({
      fotoList,
      harga,
      bukti: upload.data.url,
      status: "PENDING",
      expiredAt,
      kodeUnik,
      namaPembeli: namaPembeli || null,
      email: email || null,
      ...(userId ? { user: { connect: { id: userId } } } : {}),
    } as any);
    revalidatePath("/galeri");
    return { success: true, kodeUnik, transaksiId: (transaksi as any).id };
  } catch { return { success: false }; }
}

// ─── Admin: Verifikasi Pembelian Foto ─────────────────────────────────────────

export async function verifikasiFoto(transaksiId: string) {
  await requireAdmin();
  try {
    const transaksi = await prisma.transaksiFoto.findUnique({ where: { id: transaksiId } });
    if (!transaksi) return { success: false };
    await updateTransaksiFoto({ id: transaksiId }, { status: "VERIFIED" });
    const t = transaksi as any;
    const kodeInfo = t.kodeUnik ? ` [#${t.kodeUnik}]` : "";
    const pembeliInfo = t.namaPembeli ? ` — ${t.namaPembeli}` : "";
    await prisma.kasTransaksi.create({
      data: { tipe: "PEMASUKAN", keterangan: `Foto${pembeliInfo}${kodeInfo}`, jumlah: transaksi.harga, kategori: "FOTO", sumber: "FOTO", referensiId: transaksiId },
    });
    const userEmail = t.email as string | null;
    const namaPembeli = (t.namaPembeli as string | null) ?? "Pembeli";
    if (userEmail) {
      try {
        const fotoIds = transaksi.fotoList as string[];
        const fotos = await prisma.foto.findMany({ where: { id: { in: fotoIds } }, select: { id: true, pathAsli: true, tagTim: true } });
        const toDownloadUrl = (url: string) => url.replace("/upload/", "/upload/fl_attachment/");
        const baseUrl = (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");
        const downloadPageUrl = `${baseUrl}/galeri/download/${transaksiId}`;
        const fotoLinks = fotos.map((f, i) =>
          `<li style="margin-bottom:8px"><a href="${toDownloadUrl(f.pathAsli)}" download style="background:#F70048;color:#fff;padding:6px 14px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:13px;display:inline-block">⬇ Unduh Foto ${i + 1}${f.tagTim ? ` — ${f.tagTim}` : ""}</a></li>`
        ).join("");
        await sendMailTo({
          to: userEmail,
          subject: `✅ Foto LKBB Antareja 2026 — Siap Diunduh`,
          html: `<div style="font-family:sans-serif;max-width:520px;margin:auto"><h2 style="color:#F70048">Foto Anda Siap Diunduh!</h2><p>Halo <b>${namaPembeli}</b>,</p><p>Pembayaran Anda telah diverifikasi. Silakan unduh foto Anda:</p><div style="margin:16px 0"><a href="${downloadPageUrl}" style="background:#F70048;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">🔗 Buka Halaman Unduhan</a></div><ul style="padding-left:0;list-style:none">${fotoLinks}</ul><p style="font-size:12px;color:#aaa">LKBB Antareja 2026 — SMK Telkom Malang</p></div>`,
        });
      } catch { /* email failure is non-fatal */ }
    }
    revalidatePath("/admin/galeri");
    revalidatePath("/admin/kas");
    return { success: true };
  } catch { return { success: false }; }
}

export async function rejectFoto(transaksiId: string) {
  await requireAdmin();
  try {
    await updateTransaksiFoto({ id: transaksiId }, { status: "REJECTED" });
    revalidatePath("/admin/galeri");
    return { success: true };
  } catch { return { success: false }; }
}
