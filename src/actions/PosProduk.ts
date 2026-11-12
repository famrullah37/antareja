"use server";

import { getServerSession } from "@/lib/next-auth";
import { revalidatePath } from "next/cache";
import { Prisma, type TransaksiPOS } from "@prisma/client";
import prisma from "@/lib/prisma";
import { catatLog } from "@/lib/activityLog";
import { daftarUkuran } from "@/lib/merchandise";
import {
  labelItemsPOS,
  labelMetodePOS,
  MAKS_JUMLAH_PER_ITEM_POS,
  nomorStrukPOS,
  tanpaHargaBeli,
  type ItemPOS,
} from "@/lib/posProduk";
import { compressPhoto, imageUploader, validateUploadFile } from "./fileUploader";

// Kelola produk, harga, stok & pembatalan transaksi: urusan uang → ADMIN & BENDAHARA.
async function requireAdminOrBendahara() {
  const session = await getServerSession();
  if (!["ADMIN", "BENDAHARA"].includes(session?.user?.role ?? "")) throw new Error("Forbidden");
  return session!;
}

// Kasir (jual di stand): ditambah petugas TIKET, sama seperti POS tiket.
async function requireKasir() {
  const session = await getServerSession();
  if (!["ADMIN", "BENDAHARA", "TIKET"].includes(session?.user?.role ?? "")) throw new Error("Forbidden");
  return session!;
}

function revalidatePOS() {
  revalidatePath("/admin/pos-produk");
  revalidatePath("/admin/pos-produk/kasir");
  revalidatePath("/admin/kas");
}

async function uploadFoto(file: File | null) {
  if (!file || file.size === 0) return {};
  const cek = await validateUploadFile(file, { maxMB: 10 });
  if (!cek.valid) return { error: cek.message };
  const compressed = await compressPhoto(Buffer.from(await file.arrayBuffer()));
  const up = await imageUploader(compressed);
  if (up.error) return { error: up.message };
  return { url: up.data!.url as string };
}

// Batas supaya total (harga × jumlah) tidak melewati kolom INTEGER Postgres.
const MAKS_HARGA = 10_000_000;

function parseProduk(data: FormData) {
  const nama = ((data.get("nama") as string) || "").trim();
  const harga = parseInt((data.get("harga") as string) || "0");
  const hargaBeliRaw = ((data.get("hargaBeli") as string) || "").trim();
  const hargaBeli = hargaBeliRaw === "" ? null : parseInt(hargaBeliRaw);
  const urutan = parseInt((data.get("urutan") as string) || "0") || 0;
  const ukuran = daftarUkuran(data.get("ukuran") as string);
  if (!nama) return { error: "Nama produk wajib diisi" };
  if (!Number.isFinite(harga) || harga <= 0 || harga > MAKS_HARGA) return { error: "Harga jual tidak valid" };
  if (hargaBeli !== null && (!Number.isFinite(hargaBeli) || hargaBeli < 0 || hargaBeli > MAKS_HARGA))
    return { error: "Harga beli tidak valid" };
  if (new Set(ukuran.map((u) => u.toLowerCase())).size !== ukuran.length)
    return { error: "Ada ukuran yang ditulis dua kali" };
  return { produk: { nama, harga, hargaBeli, urutan }, ukuran };
}

function labelHarga(p: { harga: number; hargaBeli: number | null }) {
  return `jual Rp${p.harga}, beli ${p.hargaBeli == null ? "-" : `Rp${p.hargaBeli}`}`;
}

// ─── Admin: Master Produk & Stok ─────────────────────────────────────────────

export async function createProdukPOS(data: FormData) {
  await requireAdminOrBendahara();
  const parsed = parseProduk(data);
  if (parsed.error) return { success: false, message: parsed.error };
  const stokAwal = Math.max(0, parseInt((data.get("stokAwal") as string) || "0") || 0);

  try {
    const foto = await uploadFoto(data.get("foto") as File | null);
    if (foto.error) return { success: false, message: foto.error };
    // Tanpa ukuran → satu varian bernama "". Stok awal berlaku untuk tiap varian.
    const namaVarian = parsed.ukuran!.length ? parsed.ukuran! : [""];
    const produk = await prisma.produkPOS.create({
      data: {
        ...parsed.produk!,
        foto: foto.url ?? null,
        varian: { create: namaVarian.map((nama, urutan) => ({ nama, urutan, stok: stokAwal })) },
      },
    });
    await catatLog("TAMBAH_PRODUK_POS", `${produk.nama} — ${labelHarga(produk)}`);
    revalidatePOS();
    return { success: true };
  } catch (e) {
    console.error("createProdukPOS error:", e);
    return { success: false, message: "Gagal menambahkan produk" };
  }
}

// Ukuran baru ditambahkan dengan stok 0; ukuran yang dihapus dari daftar ikut
// terhapus (riwayat transaksi aman karena berupa snapshot).
export async function updateProdukPOS(data: FormData, id: string) {
  await requireAdminOrBendahara();
  const parsed = parseProduk(data);
  if (parsed.error) return { success: false, message: parsed.error };

  try {
    const lama = await prisma.produkPOS.findUnique({ where: { id }, include: { varian: true } });
    if (!lama) return { success: false, message: "Produk tidak ditemukan" };

    const namaBaru = parsed.ukuran!.length ? parsed.ukuran! : [""];
    const hapus = lama.varian.filter((v) => !namaBaru.includes(v.nama));
    const stokHilang = hapus.reduce((s, v) => s + v.stok, 0);
    if (stokHilang > 0 && data.get("konfirmasiHapusStok") !== "1")
      return {
        success: false,
        perluKonfirmasi: true,
        message: `Ukuran ${hapus.map((v) => v.nama || "(tanpa ukuran)").join(", ")} masih punya stok ${stokHilang}. Tetap hapus?`,
      };

    // Upload SETELAH konfirmasi — kalau di atas, foto ter-upload dua kali
    // (permintaan pertama berhenti di konfirmasi, lalu dikirim ulang).
    const foto = await uploadFoto(data.get("foto") as File | null);
    if (foto.error) return { success: false, message: foto.error };

    await prisma.$transaction([
      prisma.produkPOS.update({
        where: { id },
        data: { ...parsed.produk!, ...(foto.url ? { foto: foto.url } : {}) },
      }),
      prisma.varianProdukPOS.deleteMany({ where: { id: { in: hapus.map((v) => v.id) } } }),
      ...namaBaru.map((nama, urutan) =>
        prisma.varianProdukPOS.upsert({
          where: { produkId_nama: { produkId: id, nama } },
          create: { produkId: id, nama, urutan, stok: 0 },
          update: { urutan },
        })
      ),
    ]);
    await catatLog("UBAH_PRODUK_POS", `${parsed.produk!.nama} — ${labelHarga(parsed.produk!)}`);
    revalidatePOS();
    return { success: true };
  } catch (e) {
    console.error("updateProdukPOS error:", e);
    return { success: false, message: "Gagal menyimpan produk" };
  }
}

export async function toggleAktifProdukPOS(id: string, aktif: boolean) {
  await requireAdminOrBendahara();
  try {
    await prisma.produkPOS.update({ where: { id }, data: { aktif } });
    revalidatePOS();
    return { success: true };
  } catch {
    return { success: false, message: "Gagal mengubah status produk" };
  }
}

export async function deleteProdukPOS(id: string) {
  await requireAdminOrBendahara();
  try {
    const p = await prisma.produkPOS.delete({ where: { id } });
    await catatLog("HAPUS_PRODUK_POS", p.nama);
    revalidatePOS();
    return { success: true };
  } catch {
    return { success: false, message: "Gagal menghapus produk" };
  }
}

// Tambah/kurangi stok secara relatif (increment atomik) — bukan menimpa angka,
// supaya penjualan yang terjadi bersamaan tidak hilang. Stok tidak boleh < 0.
export async function ubahStokVarianPOS(varianId: string, delta: number) {
  await requireAdminOrBendahara();
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100000)
    return { success: false, message: "Jumlah perubahan stok tidak valid" };
  try {
    const hasil = await prisma.varianProdukPOS.updateMany({
      where: { id: varianId, ...(delta < 0 ? { stok: { gte: -delta } } : {}) },
      data: { stok: { increment: delta } },
    });
    if (hasil.count === 0) return { success: false, message: "Stok tidak cukup untuk dikurangi" };
    const v = await prisma.varianProdukPOS.findUnique({ where: { id: varianId }, include: { produk: true } });
    await catatLog(
      "UBAH_STOK_POS",
      `${v?.produk.nama}${v?.nama ? ` (${v.nama})` : ""} ${delta > 0 ? "+" : ""}${delta} → ${v?.stok}`
    );
    revalidatePOS();
    return { success: true };
  } catch {
    return { success: false, message: "Gagal mengubah stok" };
  }
}

// ─── Kasir: Jual ─────────────────────────────────────────────────────────────

export type InputJualPOS = {
  // Dibuat di browser (crypto.randomUUID) — klik ganda / kirim ulang dengan id
  // yang sama ditolak oleh primary key, jadi tidak ada transaksi & kas dobel.
  id: string;
  items: { varianId: string; jumlah: number }[];
  metodePembayaran: "CASH" | "QRIS";
  uangDiterima?: number | null;
  namaPembeli?: string | null;
  catatan?: string | null;
};

export type StrukPOS = {
  id: string;
  nomor: string;
  items: ItemPOS[];
  total: number;
  metodePembayaran: string;
  uangDiterima: number | null;
  namaPembeli: string | null;
  kasirNama: string;
  createdAt: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class StokKurang extends Error {}

function keStruk(t: TransaksiPOS): StrukPOS {
  return {
    id: t.id,
    nomor: nomorStrukPOS(t.nomor),
    // Struk dikirim ke kasir (bisa petugas TIKET) — harga beli dibuang.
    items: tanpaHargaBeli(t.items as ItemPOS[]),
    total: t.total,
    metodePembayaran: t.metodePembayaran,
    uangDiterima: t.uangDiterima,
    namaPembeli: t.namaPembeli,
    kasirNama: t.kasirNama,
    createdAt: t.createdAt.toISOString(),
  };
}

export async function jualProdukPOS(
  input: InputJualPOS
): Promise<{ success: true; struk: StrukPOS } | { success: false; message: string }> {
  const session = await requireKasir();

  if (!UUID_RE.test(input?.id ?? "")) return { success: false, message: "Transaksi tidak valid" };
  if (input.metodePembayaran !== "CASH" && input.metodePembayaran !== "QRIS")
    return { success: false, message: "Metode pembayaran hanya Tunai atau QRIS" };

  // Gabungkan varian yang sama
  const jumlahPerVarian = new Map<string, number>();
  for (const it of input.items ?? []) {
    if (typeof it?.varianId !== "string" || !Number.isInteger(it.jumlah) || it.jumlah < 1)
      return { success: false, message: "Jumlah barang tidak valid" };
    jumlahPerVarian.set(it.varianId, (jumlahPerVarian.get(it.varianId) ?? 0) + it.jumlah);
  }
  if (jumlahPerVarian.size === 0) return { success: false, message: "Keranjang masih kosong" };
  if (Array.from(jumlahPerVarian.values()).some((j) => j > MAKS_JUMLAH_PER_ITEM_POS))
    return { success: false, message: `Maksimal ${MAKS_JUMLAH_PER_ITEM_POS} per barang` };

  const namaPembeli = (input.namaPembeli ?? "").trim().slice(0, 100) || null;
  const catatan = (input.catatan ?? "").trim().slice(0, 200) || null;

  try {
    // Kirim ulang (mis. koneksi putus setelah server menyimpan) → kembalikan
    // transaksi yang sudah ada sebagai sukses, supaya kasir tidak mengira gagal.
    const sudahAda = await prisma.transaksiPOS.findUnique({ where: { id: input.id } });
    if (sudahAda) return { success: true, struk: keStruk(sudahAda) };

    const varian = await prisma.varianProdukPOS.findMany({
      where: { id: { in: Array.from(jumlahPerVarian.keys()) } },
      include: { produk: true },
    });
    if (varian.length !== jumlahPerVarian.size || varian.some((v) => !v.produk.aktif))
      return { success: false, message: "Ada produk yang sudah tidak dijual. Muat ulang halaman." };

    // Harga diambil dari database, bukan dari browser.
    const items: ItemPOS[] = varian.map((v) => ({
      produkId: v.produkId,
      varianId: v.id,
      nama: v.produk.nama,
      varian: v.nama,
      harga: v.produk.harga,
      hargaBeli: v.produk.hargaBeli,
      jumlah: jumlahPerVarian.get(v.id)!,
    }));
    const total = items.reduce((s, i) => s + i.harga * i.jumlah, 0);

    let uangDiterima: number | null = null;
    if (input.metodePembayaran === "CASH") {
      uangDiterima = input.uangDiterima == null ? total : Math.floor(Number(input.uangDiterima));
      if (!Number.isFinite(uangDiterima) || uangDiterima < total)
        return { success: false, message: "Uang diterima kurang dari total" };
      if (uangDiterima > total + 10_000_000) return { success: false, message: "Uang diterima tidak wajar" };
    }

    const label = labelItemsPOS(items);
    const transaksi = await prisma.$transaction(async (tx) => {
      // Potong stok atomik: gagal kalau stok sudah diambil kasir lain.
      for (const i of items) {
        const r = await tx.varianProdukPOS.updateMany({
          where: { id: i.varianId, stok: { gte: i.jumlah } },
          data: { stok: { decrement: i.jumlah } },
        });
        if (r.count === 0) {
          // Angka sisa sengaja tidak ditampilkan: yang terbaca di atas bisa sudah
          // basi (stoknya baru saja diambil kasir lain).
          throw new StokKurang(`Stok ${i.nama}${i.varian ? ` (${i.varian})` : ""} tidak cukup — cek ulang sisa stok`);
        }
      }
      const t = await tx.transaksiPOS.create({
        data: {
          id: input.id,
          items,
          total,
          metodePembayaran: input.metodePembayaran,
          uangDiterima,
          namaPembeli,
          catatan,
          kasirId: session.user!.id,
          kasirNama: session.user!.nama,
        },
      });
      await tx.kasTransaksi.create({
        data: {
          tipe: "PEMASUKAN",
          keterangan: `${nomorStrukPOS(t.nomor)} ${label}${namaPembeli ? ` (${namaPembeli})` : ""} — POS ${labelMetodePOS(input.metodePembayaran)}`,
          jumlah: total,
          kategori: "PENJUALAN_PRODUK",
          sumber: "POS_PRODUK",
          referensiId: t.id,
        },
      });
      return t;
    });

    await catatLog(
      "JUAL_PRODUK_POS",
      `${nomorStrukPOS(transaksi.nomor)} ${label} — Rp${total} ${labelMetodePOS(input.metodePembayaran)}`
    );
    revalidatePOS();
    return { success: true, struk: keStruk(transaksi) };
  } catch (e) {
    if (e instanceof StokKurang) return { success: false, message: e.message };
    // Dua kiriman id yang sama lolos cek "sudahAda" bersamaan: yang kalah kena
    // unique constraint — transaksi pemenangnya yang dikembalikan.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const t = await prisma.transaksiPOS.findUnique({ where: { id: input.id } });
      if (t) return { success: true, struk: keStruk(t) };
    }
    console.error("jualProdukPOS error:", e);
    return { success: false, message: "Gagal menyimpan transaksi" };
  }
}

// ─── Admin: Batalkan Transaksi ───────────────────────────────────────────────

// Stok dikembalikan & catatan kas dihapus. Transaksi tetap tersimpan berstatus
// BATAL (jejak audit), tidak dihapus.
export async function batalTransaksiPOS(id: string, alasan: string) {
  const session = await requireAdminOrBendahara();
  const alasanBersih = (alasan ?? "").trim().slice(0, 200);
  if (!alasanBersih) return { success: false, message: "Alasan pembatalan wajib diisi" };

  try {
    const hasil = await prisma.$transaction(async (tx) => {
      const klaim = await tx.transaksiPOS.updateMany({
        where: { id, status: "SELESAI" },
        data: { status: "BATAL", batalAt: new Date(), batalAlasan: alasanBersih, batalOleh: session.user!.nama },
      });
      if (klaim.count === 0) return null;
      const t = await tx.transaksiPOS.findUniqueOrThrow({ where: { id } });
      for (const i of t.items as ItemPOS[]) {
        // Varian yang sudah dihapus dilewati (updateMany tidak error).
        await tx.varianProdukPOS.updateMany({ where: { id: i.varianId }, data: { stok: { increment: i.jumlah } } });
      }
      await tx.kasTransaksi.deleteMany({ where: { sumber: "POS_PRODUK", referensiId: id } });
      return t;
    });
    if (!hasil) return { success: false, message: "Transaksi sudah dibatalkan sebelumnya" };
    await catatLog("BATAL_PRODUK_POS", `${nomorStrukPOS(hasil.nomor)} Rp${hasil.total} — ${alasanBersih}`);
    revalidatePOS();
    return { success: true };
  } catch (e) {
    console.error("batalTransaksiPOS error:", e);
    return { success: false, message: "Gagal membatalkan transaksi" };
  }
}
