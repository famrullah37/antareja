"use server";

import prisma from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/next-auth";
import { catatLog } from "@/lib/activityLog";
import { nomorBaru } from "@/lib/nomorKuitansi";
import { buatKuitansiManual } from "@/lib/kuitansiPenjualan";
import { KATEGORI_KAS_PEMASUKAN, METODE_KUITANSI_MANUAL } from "@/lib/kuitansiManual";

type HasilUnduh = { success: boolean; message?: string; base64?: string; filename?: string };

async function requireBendahara() {
  const session = await getServerSession();
  const user = session?.user;
  if (!user || !["ADMIN", "BENDAHARA"].includes(user.role ?? "")) throw new Error("Forbidden");
  return user.nama ?? user.email ?? "Bendahara";
}

function segarkan() {
  revalidatePath("/admin/kuitansi");
  revalidatePath("/admin/kas");
}

async function unduhan(id: string): Promise<HasilUnduh> {
  const k = await buatKuitansiManual(id);
  if (!k) return { success: false, message: "Kuitansi tidak ditemukan atau sudah dibatalkan" };
  return { success: true, base64: k.pdf.toString("base64"), filename: k.filename };
}

const teks = (data: FormData, key: string) => ((data.get(key) as string) ?? "").trim();

// Terbitkan kuitansi baru (nomor dari counter bersama) dan langsung kembalikan PDF-nya.
// Opsional ikut dicatat sebagai pemasukan Kas — jangan dicentang kalau pemasukannya
// sudah tercatat otomatis (pendaftaran, tiket, dst) supaya tidak terhitung dua kali.
export async function terbitkanKuitansiManual(data: FormData): Promise<HasilUnduh> {
  const oleh = await requireBendahara();
  const diterimaDari = teks(data, "diterimaDari");
  const untukPembayaran = teks(data, "untukPembayaran");
  const catatan = teks(data, "catatan") || null;
  const metode = teks(data, "metode");
  const jumlah = Number(teks(data, "jumlah"));
  const tanggalRaw = teks(data, "tanggal");
  const catatKas = data.get("catatKas") === "on";
  const kategori = teks(data, "kategori") || "LAINNYA";

  if (!diterimaDari || !untukPembayaran) return { success: false, message: "Penerima & keperluan wajib diisi" };
  if (diterimaDari.length > 150 || untukPembayaran.length > 200 || (catatan?.length ?? 0) > 300)
    return { success: false, message: "Isian terlalu panjang" };
  if (!Number.isInteger(jumlah) || jumlah <= 0) return { success: false, message: "Jumlah tidak valid" };
  if (!METODE_KUITANSI_MANUAL[metode]) return { success: false, message: "Metode pembayaran tidak valid" };
  if (catatKas && !KATEGORI_KAS_PEMASUKAN[kategori]) return { success: false, message: "Kategori kas tidak valid" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggalRaw)) return { success: false, message: "Tanggal tidak valid" };
  // Jam 12 siang supaya tanggalnya tidak bergeser karena zona waktu (sama seperti form Kas).
  const tanggal = new Date(`${tanggalRaw}T12:00:00`);
  if (Number.isNaN(tanggal.getTime())) return { success: false, message: "Tanggal tidak valid" };

  try {
    const id = randomUUID();
    const nomor = await prisma.$transaction(async (tx) => {
      const terbit = await nomorBaru(tx, tanggal);
      let kasId: string | null = null;
      if (catatKas) {
        const kas = await tx.kasTransaksi.create({
          data: {
            tipe: "PEMASUKAN",
            keterangan: `${untukPembayaran} — ${diterimaDari} (${terbit.nomor})`,
            jumlah,
            kategori,
            sumber: "MANUAL",
            referensiId: id,
            createdAt: tanggal,
          },
        });
        kasId = kas.id;
      }
      await tx.kuitansiManual.create({
        data: { id, nomor: terbit.nomor, tanggal, diterimaDari, untukPembayaran, jumlah, metode, catatan, kasId, olehNama: oleh },
      });
      return terbit.nomor;
    });
    await catatLog("TERBIT_KUITANSI_MANUAL", `${nomor} · ${diterimaDari} · Rp${jumlah.toLocaleString("id-ID")}`);
    segarkan();
    return unduhan(id);
  } catch (e) {
    console.error("terbitkanKuitansiManual error:", e);
    return { success: false, message: "Gagal menerbitkan kuitansi" };
  }
}

export async function unduhKuitansiManual(id: string): Promise<HasilUnduh> {
  await requireBendahara();
  try {
    return await unduhan(id);
  } catch (e) {
    console.error("unduhKuitansiManual error:", e);
    return { success: false, message: "Gagal membuat kuitansi" };
  }
}

// Salah tulis → batalkan (nomor tetap terpakai, tidak dipakai ulang) lalu terbitkan
// yang baru. Pemasukan Kas yang ikut dicatat saat terbit dihapus.
export async function batalkanKuitansiManual(id: string, alasan: string) {
  const oleh = await requireBendahara();
  const alasanBersih = alasan.trim();
  if (!alasanBersih) return { success: false, message: "Alasan pembatalan wajib diisi" };
  try {
    const k = await prisma.$transaction(async (tx) => {
      const k = await tx.kuitansiManual.findUnique({ where: { id } });
      if (!k || k.batalAt) return null;
      const { count } = await tx.kuitansiManual.updateMany({
        where: { id, batalAt: null },
        data: { batalAt: new Date(), batalAlasan: alasanBersih.slice(0, 300), batalOleh: oleh },
      });
      if (count === 0) return null;
      if (k.kasId) await tx.kasTransaksi.deleteMany({ where: { id: k.kasId } });
      return k;
    });
    if (!k) return { success: false, message: "Kuitansi tidak ditemukan atau sudah dibatalkan" };
    await catatLog("BATAL_KUITANSI_MANUAL", `${k.nomor} · ${alasanBersih}`);
    segarkan();
    return { success: true };
  } catch (e) {
    console.error("batalkanKuitansiManual error:", e);
    return { success: false, message: "Gagal membatalkan kuitansi" };
  }
}
