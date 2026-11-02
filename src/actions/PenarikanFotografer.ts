"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/next-auth";
import { catatLog } from "@/lib/activityLog";
import { saldoFotografer } from "@/lib/bagiHasilFoto";
import { imageUploader, validateUploadFile } from "./fileUploader";

type Hasil = { success: boolean; message?: string };

async function sesiRole(roles: string[]) {
  const session = await getServerSession();
  const user = session?.user;
  if (!user || !roles.includes(user.role ?? "")) throw new Error("Forbidden");
  return user;
}

function segarkan() {
  revalidatePath("/admin/galeri/pendapatan");
  revalidatePath("/admin/galeri/bagi-hasil");
  revalidatePath("/admin/kas");
}

const teks = (data: FormData, key: string, maks: number) => ((data.get(key) as string) ?? "").trim().slice(0, maks);

// Fotografer mengajukan penarikan saldo bagi hasil foto ke rekeningnya.
export async function ajukanPenarikan(data: FormData): Promise<Hasil> {
  const user = await sesiRole(["FOTOGRAFER"]);
  const jumlah = Number(teks(data, "jumlah", 12));
  const bankNama = teks(data, "bankNama", 60);
  const bankNoRek = teks(data, "bankNoRek", 40);
  const bankAtasNama = teks(data, "bankAtasNama", 100);
  const catatan = teks(data, "catatan", 300) || null;
  if (!Number.isInteger(jumlah) || jumlah <= 0) return { success: false, message: "Jumlah penarikan tidak valid" };
  if (!bankNama || !bankNoRek || !bankAtasNama) return { success: false, message: "Lengkapi data rekening tujuan" };

  try {
    // Pendapatan dihitung di luar transaksi (hanya bisa bertambah); penarikan
    // dicek ulang setelah baris user dikunci supaya dua pengajuan bersamaan
    // tidak sama-sama lolos melebihi saldo.
    const { pendapatan, biayaAdminPenarikan: biayaAdmin } = await saldoFotografer(user.id);
    if (jumlah <= biayaAdmin)
      return { success: false, message: `Jumlah harus lebih dari biaya admin transfer (Rp${biayaAdmin.toLocaleString("id-ID")})` };
    const hasil = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
      const terpakai = await tx.penarikanFotografer.aggregate({
        where: { fotograferId: user.id, status: { in: ["PENDING", "DIBAYAR"] } },
        _sum: { jumlah: true },
      });
      const saldo = pendapatan - (terpakai._sum.jumlah ?? 0);
      if (jumlah > saldo) return { saldo };
      await tx.penarikanFotografer.create({
        data: { fotograferId: user.id, jumlah, biayaAdmin, bankNama, bankNoRek, bankAtasNama, catatan },
      });
      return null;
    });
    if (hasil)
      return { success: false, message: `Jumlah melebihi saldo tersedia (Rp${Math.max(0, hasil.saldo).toLocaleString("id-ID")})` };
    await catatLog("AJUKAN_PENARIKAN_FOTO", `${user.nama} — Rp${jumlah.toLocaleString("id-ID")}`);
    segarkan();
    return { success: true };
  } catch (e) {
    console.error("ajukanPenarikan error:", e);
    return { success: false, message: "Gagal mengajukan penarikan" };
  }
}

// Fotografer membatalkan pengajuannya sendiri selama belum diproses.
export async function batalkanPenarikan(id: string): Promise<Hasil> {
  const user = await sesiRole(["FOTOGRAFER"]);
  const { count } = await prisma.penarikanFotografer.updateMany({
    where: { id, fotograferId: user.id, status: "PENDING" },
    data: { status: "DIBATALKAN", diprosesAt: new Date(), diprosesOleh: user.nama },
  });
  if (count === 0) return { success: false, message: "Pengajuan sudah diproses" };
  segarkan();
  return { success: true };
}

// Bendahara/Admin: tandai sudah ditransfer (tercatat sebagai pengeluaran Kas)
// atau tolak (saldo kembali ke fotografer).
export async function prosesPenarikan(data: FormData): Promise<Hasil> {
  const user = await sesiRole(["ADMIN", "BENDAHARA"]);
  const id = data.get("id") as string;
  const aksi = data.get("aksi") as string;
  const catatanAdmin = teks(data, "catatanAdmin", 300) || null;
  if (aksi !== "DIBAYAR" && aksi !== "DITOLAK") return { success: false, message: "Aksi tidak valid" };
  if (aksi === "DITOLAK" && !catatanAdmin) return { success: false, message: "Alasan penolakan wajib diisi" };

  let buktiTransfer: string | undefined;
  const bukti = data.get("bukti") as File | null;
  if (aksi === "DIBAYAR" && bukti && bukti.size > 0) {
    const cek = await validateUploadFile(bukti, { allowPdf: true });
    if (!cek.valid) return { success: false, message: cek.message };
    const up = await imageUploader(Buffer.from(await bukti.arrayBuffer()));
    if (up.error || !up.data?.url) return { success: false, message: up.message ?? "Gagal mengunggah bukti transfer" };
    buktiTransfer = up.data.url;
  }

  try {
    const p = await prisma.$transaction(async (tx) => {
      const p = await tx.penarikanFotografer.findUnique({ where: { id }, include: { fotografer: true } });
      if (!p || p.status !== "PENDING") return null;
      let kasId: string | null = null;
      if (aksi === "DIBAYAR") {
        const kas = await tx.kasTransaksi.create({
          data: {
            tipe: "PENGELUARAN",
            // Saldo fotografer berkurang `jumlah`; yang ditransfer jumlah − biaya admin.
            keterangan: `Bagi hasil foto — ${p.fotografer.nama} (${p.bankNama} ${p.bankNoRek}) · ditransfer Rp${(p.jumlah - p.biayaAdmin).toLocaleString("id-ID")} + biaya admin Rp${p.biayaAdmin.toLocaleString("id-ID")}`,
            jumlah: p.jumlah,
            kategori: "BAGI_HASIL_FOTO",
            sumber: "FOTO",
            referensiId: p.id,
            ...(buktiTransfer ? { nota: buktiTransfer } : {}),
          },
        });
        kasId = kas.id;
      }
      const { count } = await tx.penarikanFotografer.updateMany({
        where: { id, status: "PENDING" },
        data: { status: aksi, catatanAdmin, buktiTransfer, kasId, diprosesOleh: user.nama, diprosesAt: new Date() },
      });
      if (count === 0) throw new Error("SUDAH_DIPROSES");
      return p;
    });
    if (!p) return { success: false, message: "Pengajuan sudah diproses" };
    await catatLog(
      aksi === "DIBAYAR" ? "BAYAR_PENARIKAN_FOTO" : "TOLAK_PENARIKAN_FOTO",
      `${p.fotografer.nama} — Rp${p.jumlah.toLocaleString("id-ID")}${catatanAdmin ? ` · ${catatanAdmin}` : ""}`
    );
    segarkan();
    return { success: true };
  } catch (e: any) {
    if (e?.message === "SUDAH_DIPROSES") return { success: false, message: "Pengajuan sudah diproses" };
    console.error("prosesPenarikan error:", e);
    return { success: false, message: "Gagal memproses penarikan" };
  }
}
