"use server";

import { updatePembayaran } from "@/queries/pembayaran.query";
import { updateTim } from "@/queries/tim.query";
import { getKonfigUmum } from "@/queries/konfigUmum.query";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/next-auth";
import { Jenjang } from "@prisma/client";

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

// Biaya pendaftaran per jenjang & tipe pembayaran diambil dari KonfigUmum (bisa
// diubah admin lewat /admin/pengaturan) — jangan hardcode di sini, supaya kas
// selalu mencatat nominal yang sesungguhnya berlaku, termasuk untuk jenjang SD.
async function biayaPendaftaran(jenjang: Jenjang, isDP: boolean) {
  const konfig = await getKonfigUmum();
  const table: Record<Jenjang, { full: number; dp: number }> = {
    SD: { full: konfig.biayaSD, dp: konfig.biayaSDDP },
    SMP: { full: konfig.biayaSMP, dp: konfig.biayaSMPDP },
    SMA: { full: konfig.biayaSMA, dp: konfig.biayaSMADP },
  };
  return isDP ? table[jenjang].dp : table[jenjang].full;
}

// Logika inti dipakai baik dari toggle cepat di daftar pembayaran (approvePayment)
// maupun form konfirmasi di halaman detail (konfirmasiPembayaran) — sebelumnya
// dua fungsi ini duplikat persis, gampang saling tidak sinkron kalau salah satu
// diubah tanpa yang lain.
async function setStatusPembayaran(timId: string, confirmed: boolean, isDP: boolean) {
  // Dua write independen (tabel berbeda, tidak saling bergantung) — paralel.
  const [tim] = await Promise.all([
    updateTim({ id: timId }, { confirmed }),
    updatePembayaran({ tim_id: timId }, { isDP }),
  ]);
  if (!confirmed) return;

  await assignNoUrutIfNeeded(timId);

  const existing = await prisma.kasTransaksi.findFirst({
    where: { sumber: "PENDAFTARAN", referensiId: timId },
  });
  if (existing) return;

  const jumlah = await biayaPendaftaran(tim.jenjang, isDP);
  await prisma.kasTransaksi.create({
    data: {
      tipe: "PEMASUKAN",
      keterangan: `Pendaftaran Tim ${tim.nama_tim} — ${tim.asal_sekolah}`,
      jumlah,
      kategori: "PENDAFTARAN_TIM",
      sumber: "PENDAFTARAN",
      referensiId: timId,
    },
  });
}

export async function approvePayment(timId: string, isDP: boolean) {
  try {
    await requireAdmin();
    await setStatusPembayaran(timId, true, isDP);
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
    await setStatusPembayaran(idTim, status, statusPembayaran);
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
