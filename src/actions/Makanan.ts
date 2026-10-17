"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/next-auth";
import { catatLog } from "@/lib/activityLog";
import { batasiAksi } from "@/lib/rateLimit";
import { parseWibDatetimeLocal } from "@/lib/datetime";
import { labelItemsMakanan, MAKS_PORSI_PER_MENU, sesiTerbuka, type ItemMakanan } from "@/lib/makanan";
import { getKonfigUmum, upsertKonfigUmum } from "@/queries/konfigUmum.query";
import { imageUploader, validateUploadFile } from "./fileUploader";

type Hasil = { success: boolean; message?: string };

// Sesi, menu, pengaturan & tandai diambil = urusan pelaksanaan acara (Sie Acara)
// maupun keuangan; verifikasi/tolak pembayaran hanya Admin & Bendahara.
async function requireKelola() {
  const session = await getServerSession();
  if (!["ADMIN", "BENDAHARA", "SIE_ACARA"].includes(session?.user?.role ?? "")) throw new Error("Forbidden");
}

async function requireKeuangan() {
  const session = await getServerSession();
  if (!["ADMIN", "BENDAHARA"].includes(session?.user?.role ?? "")) throw new Error("Forbidden");
}

function segarkan() {
  revalidatePath("/admin/makanan");
  revalidatePath("/dashboard");
}

function teks(data: FormData, key: string, maks: number) {
  return ((data.get(key) as string) || "").trim().slice(0, maks);
}

// ─── Admin: Pengaturan ───────────────────────────────────────────────────────

export async function setPengaturanMakanan(data: FormData): Promise<Hasil> {
  await requireKelola();
  const makananAktif = data.get("aktif") === "on";
  const makananInfo = teks(data, "info", 2000) || null;
  try {
    await upsertKonfigUmum({ makananAktif, makananInfo });
    await catatLog("PENGATURAN_MAKANAN", makananAktif ? "Pemesanan dibuka" : "Pemesanan ditutup");
    segarkan();
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Gagal menyimpan pengaturan" };
  }
}

// ─── Admin: Sesi & Menu ──────────────────────────────────────────────────────

// id kosong = buat sesi baru.
export async function simpanSesiMakan(data: FormData): Promise<Hasil> {
  await requireKelola();
  const id = (data.get("id") as string) || null;
  const nama = teks(data, "nama", 100);
  const waktu = parseWibDatetimeLocal(data.get("waktu") as string);
  const batasRaw = data.get("batasPesan") as string;
  const batasPesan = parseWibDatetimeLocal(batasRaw);
  const aktif = data.get("aktif") === "on";

  if (!nama) return { success: false, message: "Nama sesi wajib diisi" };
  if (!waktu) return { success: false, message: "Waktu makan tidak valid" };
  if (batasRaw && !batasPesan) return { success: false, message: "Batas pemesanan tidak valid" };
  if (batasPesan && batasPesan > waktu) return { success: false, message: "Batas pemesanan harus sebelum waktu makan" };

  try {
    const isi = { nama, waktu, batasPesan, aktif };
    if (id) await prisma.sesiMakan.update({ where: { id }, data: isi });
    else await prisma.sesiMakan.create({ data: isi });
    await catatLog(id ? "UBAH_SESI_MAKAN" : "TAMBAH_SESI_MAKAN", nama);
    segarkan();
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Gagal menyimpan sesi" };
  }
}

export async function hapusSesiMakan(id: string): Promise<Hasil> {
  await requireKelola();
  const jumlahPesanan = await prisma.pesananMakanan.count({ where: { sesiId: id } });
  if (jumlahPesanan > 0)
    return { success: false, message: `Sesi sudah punya ${jumlahPesanan} pesanan — nonaktifkan saja, jangan dihapus` };
  try {
    const sesi = await prisma.sesiMakan.delete({ where: { id } });
    await catatLog("HAPUS_SESI_MAKAN", sesi.nama);
    segarkan();
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Gagal menghapus sesi" };
  }
}

// id kosong = tambah menu ke sesiId.
export async function simpanMenuMakanan(data: FormData): Promise<Hasil> {
  await requireKelola();
  const id = (data.get("id") as string) || null;
  const sesiId = data.get("sesiId") as string;
  const nama = teks(data, "nama", 100);
  const deskripsi = teks(data, "deskripsi", 300) || null;
  const harga = parseInt((data.get("harga") as string) || "0", 10);
  const urutan = parseInt((data.get("urutan") as string) || "0", 10) || 0;

  if (!nama) return { success: false, message: "Nama menu wajib diisi" };
  if (!Number.isInteger(harga) || harga <= 0 || harga > 10_000_000) return { success: false, message: "Harga tidak valid" };

  try {
    const isi = { nama, deskripsi, harga, urutan };
    if (id) await prisma.menuMakanan.update({ where: { id }, data: isi });
    else await prisma.menuMakanan.create({ data: { ...isi, sesiId } });
    await catatLog(id ? "UBAH_MENU_MAKAN" : "TAMBAH_MENU_MAKAN", `${nama} — Rp${harga}`);
    segarkan();
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Gagal menyimpan menu" };
  }
}

export async function toggleMenuMakanan(id: string, aktif: boolean): Promise<Hasil> {
  await requireKelola();
  try {
    await prisma.menuMakanan.update({ where: { id }, data: { aktif } });
    segarkan();
    return { success: true };
  } catch {
    return { success: false, message: "Gagal mengubah menu" };
  }
}

// Pesanan menyimpan snapshot item (bukan relasi ke menu), jadi aman dihapus.
export async function hapusMenuMakanan(id: string): Promise<Hasil> {
  await requireKelola();
  try {
    const menu = await prisma.menuMakanan.delete({ where: { id } });
    await catatLog("HAPUS_MENU_MAKAN", menu.nama);
    segarkan();
    return { success: true };
  } catch {
    return { success: false, message: "Gagal menghapus menu" };
  }
}

// ─── Admin: Verifikasi & Pengambilan ─────────────────────────────────────────

export async function verifikasiPesananMakanan(id: string): Promise<Hasil> {
  await requireKeuangan();
  try {
    const pesanan = await prisma.pesananMakanan.findUnique({
      where: { id },
      include: { tim: { select: { nama_tim: true } }, sesi: { select: { nama: true } } },
    });
    if (!pesanan) return { success: false, message: "Pesanan tidak ditemukan" };
    if (pesanan.status !== "PENDING") return { success: false, message: "Pesanan sudah diproses" };

    const label = labelItemsMakanan(pesanan.items as ItemMakanan[]);
    await prisma.$transaction([
      // Klaim atomik PENDING → VERIFIED (klik ganda tidak bikin kas dobel).
      prisma.pesananMakanan.update({ where: { id, status: "PENDING" }, data: { status: "VERIFIED" } }),
      // Nominal kas = yang benar-benar dibayar (subtotal + kode unik).
      prisma.kasTransaksi.create({
        data: {
          tipe: "PEMASUKAN",
          keterangan: `Makanan ${pesanan.sesi.nama}: ${label} (${pesanan.tim.nama_tim}) [#${pesanan.kodeUnik}]`,
          jumlah: pesanan.totalBayar,
          kategori: "MAKANAN",
          sumber: "MAKANAN",
          referensiId: id,
        },
      }),
    ]);
    await catatLog("VERIFIKASI_MAKANAN", `${pesanan.tim.nama_tim} — ${pesanan.sesi.nama} — Rp${pesanan.totalBayar}`);
    segarkan();
    revalidatePath("/admin/kas");
    return { success: true };
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025") return { success: false, message: "Pesanan sudah diproses" };
    console.error("verifikasiPesananMakanan error:", e);
    return { success: false, message: "Gagal memverifikasi" };
  }
}

export async function tolakPesananMakanan(id: string, catatanAdmin: string): Promise<Hasil> {
  await requireKeuangan();
  try {
    const pesanan = await prisma.pesananMakanan.update({
      where: { id, status: "PENDING" },
      data: { status: "REJECTED", catatanAdmin: catatanAdmin.trim().slice(0, 500) || null },
      include: { tim: { select: { nama_tim: true } } },
    });
    await catatLog("TOLAK_MAKANAN", `${pesanan.tim.nama_tim} [#${pesanan.kodeUnik}]`);
    segarkan();
    return { success: true };
  } catch {
    return { success: false, message: "Pesanan sudah diproses" };
  }
}

export async function tandaiDiambilMakanan(id: string): Promise<Hasil> {
  await requireKelola();
  try {
    const pesanan = await prisma.pesananMakanan.update({
      where: { id, status: "VERIFIED" },
      data: { status: "DIAMBIL", diambilAt: new Date() },
      include: { tim: { select: { nama_tim: true } } },
    });
    await catatLog("MAKANAN_DIAMBIL", `${pesanan.tim.nama_tim} [#${pesanan.kodeUnik}]`);
    segarkan();
    return { success: true };
  } catch {
    return { success: false, message: "Pesanan belum lunas atau sudah diambil" };
  }
}

// ─── Tim (dashboard) ─────────────────────────────────────────────────────────

// Tim milik user yang login. String = pesan error.
async function timPemesan() {
  const session = await getServerSession();
  if (session?.user?.role !== "USER") return "Hanya akun tim yang bisa memesan makanan";
  // Sama dengan tim yang tampil di dashboard (findTimsByUser()[0]).
  const tim = await prisma.tim.findFirst({
    where: { userId: session.user.id },
    orderBy: { updated_at: "desc" },
    select: { id: true, nama_tim: true, confirmed: true },
  });
  if (!tim) return "Tim tidak ditemukan";
  if (!tim.confirmed) return "Pemesanan makanan dibuka setelah pembayaran tim diverifikasi";
  return tim;
}

// Kode unik 3 digit atomik, sama pola dengan reserveKodeMerch.
export async function reserveKodeMakanan() {
  const tim = await timPemesan();
  if (typeof tim === "string") return { success: false, message: tim };
  const dibatasi = await batasiAksi("kode", 120, 10 * 60 * 1000);
  if (dibatasi) return { success: false, message: dibatasi };
  try {
    const updated = await prisma.konfigUmum.update({
      where: { id: "singleton" },
      data: { counterUrutMakanan: { increment: 1 } },
    });
    return { success: true, kodeUnik: String(updated.counterUrutMakanan % 1000).padStart(3, "0") };
  } catch (e) {
    console.error("reserveKodeMakanan error:", e);
    return { success: false, message: "Gagal menyiapkan kode pembayaran" };
  }
}

export async function pesanMakanan(data: FormData): Promise<Hasil> {
  const dibatasi = await batasiAksi("beli", 40, 10 * 60 * 1000);
  if (dibatasi) return { success: false, message: dibatasi };
  const tim = await timPemesan();
  if (typeof tim === "string") return { success: false, message: tim };

  const konfig = await getKonfigUmum();
  if (!konfig.makananAktif) return { success: false, message: "Pemesanan makanan sedang ditutup" };

  const sesiId = data.get("sesiId") as string;
  const kodeUnik = data.get("kodeUnik") as string | null;
  const bukti = data.get("bukti") as File | null;
  const catatan = teks(data, "catatan", 500) || null;
  if (!kodeUnik || !/^\d{3}$/.test(kodeUnik))
    return { success: false, message: "Kode pembayaran tidak valid, muat ulang halaman" };

  const sesi = await prisma.sesiMakan.findUnique({ where: { id: sesiId }, include: { menus: { where: { aktif: true } } } });
  if (!sesi || !sesiTerbuka(sesi)) return { success: false, message: "Pemesanan untuk sesi ini sudah ditutup" };

  // Keranjang dari klien hanya dipercaya untuk id & jumlah — nama & harga
  // selalu diambil ulang dari database.
  let keranjang: { menuId: string; jumlah: number }[];
  try {
    keranjang = JSON.parse((data.get("items") as string) || "[]");
  } catch {
    return { success: false, message: "Data pesanan tidak valid" };
  }
  if (!Array.isArray(keranjang)) return { success: false, message: "Data pesanan tidak valid" };

  const items: ItemMakanan[] = [];
  for (const k of keranjang) {
    const jumlah = Number(k?.jumlah);
    if (jumlah === 0) continue;
    const menu = sesi.menus.find((m) => m.id === k?.menuId);
    if (!menu) return { success: false, message: "Ada menu yang sudah tidak tersedia, muat ulang halaman" };
    if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > MAKS_PORSI_PER_MENU)
      return { success: false, message: `Jumlah ${menu.nama} harus 1–${MAKS_PORSI_PER_MENU}` };
    if (items.some((i) => i.menuId === menu.id)) return { success: false, message: "Data pesanan tidak valid" };
    items.push({ menuId: menu.id, nama: menu.nama, harga: menu.harga, jumlah });
  }
  if (items.length === 0) return { success: false, message: "Pilih minimal 1 menu" };

  const subtotal = items.reduce((s, i) => s + i.harga * i.jumlah, 0);
  const totalBayar = subtotal + parseInt(kodeUnik, 10);

  // Bayar lewat QRIS dinamis (nominal = subtotal + kode unik), jadi bendahara
  // mencocokkan nominal di riwayat QRIS — screenshot bukti hanya opsional.
  let buktiUrl: string | null = null;
  if (bukti && bukti.size > 0) {
    const cek = await validateUploadFile(bukti);
    if (!cek.valid) return { success: false, message: cek.message };
    const upload = await imageUploader(Buffer.from(await bukti.arrayBuffer()));
    if (upload.error) return { success: false, message: upload.message };
    buktiUrl = upload.data!.url;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const dipakai = await tx.pesananMakanan.findFirst({
        where: { kodeUnik, status: { in: ["PENDING", "VERIFIED"] } },
      });
      if (dipakai) throw new Error("KODE_UNIK_DIPAKAI");
      await tx.pesananMakanan.create({
        data: {
          timId: tim.id,
          sesiId: sesi.id,
          items,
          subtotal,
          kodeUnik,
          totalBayar,
          bukti: buktiUrl,
          catatan,
        },
      });
    });
    await catatLog("PESAN_MAKANAN", `${tim.nama_tim} — ${sesi.nama}: ${labelItemsMakanan(items)}`);
    segarkan();
    return { success: true };
  } catch (e) {
    if ((e as Error)?.message === "KODE_UNIK_DIPAKAI")
      return { success: false, message: "Kode unik sudah terpakai, silakan kirim ulang" };
    console.error("pesanMakanan error:", e);
    return { success: false, message: "Gagal memproses pesanan" };
  }
}

// Tim hanya boleh membatalkan pesanannya sendiri yang belum diverifikasi.
export async function batalPesananMakanan(id: string): Promise<Hasil> {
  const tim = await timPemesan();
  if (typeof tim === "string") return { success: false, message: tim };
  try {
    const { count } = await prisma.pesananMakanan.deleteMany({ where: { id, timId: tim.id, status: "PENDING" } });
    if (count === 0) return { success: false, message: "Pesanan sudah diproses panitia, tidak bisa dibatalkan" };
    await catatLog("BATAL_MAKANAN", tim.nama_tim);
    segarkan();
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Gagal membatalkan pesanan" };
  }
}
