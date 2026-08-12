"use server";

import { updatePembayaran } from "@/queries/pembayaran.query";
import { updateTim } from "@/queries/tim.query";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/next-auth";

// Halaman /admin/pembayaran juga bisa diakses role BENDAHARA (lihat middleware),
// jadi aksi konfirmasinya harus mengizinkan BENDAHARA juga — bukan cuma ADMIN.
async function requireAdmin() {
  const session = await getServerSession();
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "BENDAHARA")
    throw new Error("Forbidden");
}

// No. urut ditampilkan untuk peserta saat penjurian (bukan nama tim), diberikan
// per jenjang secara berurutan begitu tim dikonfirmasi pembayarannya. Admin tetap
// bisa mengubahnya manual lewat halaman detail tim jika perlu reorder.
async function assignNoUrutIfNeeded(timId: string) {
  const tim = await prisma.tim.findUnique({ where: { id: timId } });
  if (!tim || tim.noUrut !== null) return;
  const agg = await prisma.tim.aggregate({
    where: { jenjang: tim.jenjang },
    _max: { noUrut: true },
  });
  const next = (agg._max.noUrut ?? 0) + 1;
  await prisma.tim.update({ where: { id: timId }, data: { noUrut: next } });
}

export async function approvePayment(timId: string, isDP: boolean) {
  try {
    await requireAdmin();
    await updateTim({ id: timId }, { confirmed: true });
    await assignNoUrutIfNeeded(timId);
    await updatePembayaran({ tim_id: timId }, { isDP });

    const tim = await prisma.tim.findUnique({
      where: { id: timId },
      include: { pembayaran: true },
    });
    if (tim) {
      const existing = await prisma.kasTransaksi.findFirst({
        where: { sumber: "PENDAFTARAN", referensiId: timId },
      });
      if (!existing) {
        await prisma.kasTransaksi.create({
          data: {
            tipe: "PEMASUKAN",
            keterangan: `Pendaftaran Tim ${tim.nama_tim} — ${tim.asal_sekolah}`,
            jumlah: isDP ? 200000 : 400000,
            kategori: "PENDAFTARAN_TIM",
            sumber: "PENDAFTARAN",
            referensiId: timId,
          },
        });
      }
    }

    revalidatePath("/", "layout");
    revalidatePath("/admin/kas");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false };
  }
}

export async function batalkanKonfirmasi(timId: string) {
  try {
    await requireAdmin();
    await updateTim({ id: timId }, { confirmed: false });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false };
  }
}

export default async function konfirmasiPembayaran(
  data: FormData,
  idTim: string
) {
  await requireAdmin();
  const status = data.get("confirm") === "true";
  const statusPembayaran = data.get("isDP") === "true";

  try {
    await updateTim({ id: idTim }, { confirmed: status });
    if (status) await assignNoUrutIfNeeded(idTim);
    await updatePembayaran({ tim_id: idTim }, { isDP: statusPembayaran });

    if (status) {
      const tim = await prisma.tim.findUnique({
        where: { id: idTim },
        include: { pembayaran: true },
      });
      if (tim) {
        const jumlah = statusPembayaran ? 200000 : 400000;
        const existing = await prisma.kasTransaksi.findFirst({
          where: { sumber: "PENDAFTARAN", referensiId: idTim },
        });
        if (!existing) {
          await prisma.kasTransaksi.create({
            data: {
              tipe: "PEMASUKAN",
              keterangan: `Pendaftaran Tim ${tim.nama_tim} — ${tim.asal_sekolah}`,
              jumlah,
              kategori: "PENDAFTARAN_TIM",
              sumber: "PENDAFTARAN",
              referensiId: idTim,
            },
          });
        }
      }
    }

    revalidatePath("/", "layout");
    revalidatePath("/admin/kas");
    return { success: true, message: "Berhasil mengupdate status pembayaran!" };
  } catch {
    return {
      success: false,
      message: "Gagal mengupdate status pembayaran",
    };
  }
}
