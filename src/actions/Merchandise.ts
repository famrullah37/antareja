"use server";

import { getServerSession } from "@/lib/next-auth";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { catatLog } from "@/lib/activityLog";
import { sendMailTo } from "@/lib/mailer";
import { escapeHtml } from "@/lib/escapeHtml";
import { parseWibDatetimeLocal } from "@/lib/datetime";
import { daftarUkuran, labelItems, poTerbuka, type ItemPesanan } from "@/lib/merchandise";
import { findKonfigMerch, incrementCounterUrutMerch } from "@/queries/merchandise.query";
import { compressPhoto, imageUploader, validateUploadFile } from "./fileUploader";

// Verifikasi pembayaran merch = urusan uang, jadi Bendahara juga boleh.
async function requireAdminOrBendahara() {
  const session = await getServerSession();
  if (!["ADMIN", "BENDAHARA"].includes(session?.user?.role ?? "")) throw new Error("Forbidden");
}

function revalidateMerch() {
  revalidatePath("/admin/merchandise");
  revalidatePath("/merchandise");
}

const MAKS_FOTO = 6;
const MAKS_JUMLAH_PER_ITEM = 50;

async function uploadFotos(files: File[]) {
  const urls: string[] = [];
  for (const file of files) {
    const cek = await validateUploadFile(file, { maxMB: 10 });
    if (!cek.valid) return { error: cek.message };
    const compressed = await compressPhoto(Buffer.from(await file.arrayBuffer()));
    const upload = await imageUploader(compressed);
    if (upload.error) return { error: upload.message };
    urls.push(upload.data!.url);
  }
  return { urls };
}

function ambilFileFoto(data: FormData) {
  return (data.getAll("fotos") as File[]).filter((f) => f && f.size > 0);
}

function parseProduk(data: FormData) {
  const nama = ((data.get("nama") as string) || "").trim();
  const deskripsi = ((data.get("deskripsi") as string) || "").trim() || null;
  const harga = parseInt((data.get("harga") as string) || "0");
  const ukuranList = daftarUkuran(data.get("ukuran") as string);
  const urutan = parseInt((data.get("urutan") as string) || "0") || 0;
  if (!nama) return { error: "Nama produk wajib diisi" };
  if (!Number.isFinite(harga) || harga <= 0) return { error: "Harga tidak valid" };
  return {
    produk: { nama, deskripsi, harga, ukuran: ukuranList.length ? ukuranList.join(",") : null, urutan },
  };
}

// Email bukti pemesanan — hanya dikirim setelah pembayaran di-approve admin.
// Gagal kirim tidak menggagalkan verifikasi.
async function kirimEmailBuktiPesanan(pesanan: {
  nama: string;
  email: string;
  items: unknown;
  kodeUnik: string;
  totalBayar: number;
  metodePembayaran: string;
  createdAt: Date;
}) {
  const items = pesanan.items as ItemPesanan[];
  const konfig = await findKonfigMerch();
  const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
  const tanggal = pesanan.createdAt.toLocaleString("id-ID", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
  });
  const baris = items
    .map(
      (i) => `<tr>
        <td style="padding:6px 0">${escapeHtml(i.nama)}${i.ukuran ? ` (${escapeHtml(i.ukuran)})` : ""} × ${i.jumlah}</td>
        <td style="padding:6px 0;text-align:right">${rp(i.harga * i.jumlah)}</td>
      </tr>`
    )
    .join("");

  try {
    await sendMailTo({
      to: pesanan.email,
      subject: `🧾 Bukti Pemesanan Merchandise LPKBB Antareja 2026 — #${pesanan.kodeUnik}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto">
          <h2 style="color:#F70048">Bukti Pemesanan Merchandise</h2>
          <p>Halo <b>${escapeHtml(pesanan.nama)}</b>,</p>
          <p>Pembayaran pre-order merchandise Anda sudah diverifikasi panitia. Pesanan Anda resmi masuk daftar produksi.</p>
          <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:16px 0">
            <p style="margin:0 0 4px"><b>Kode Pesanan:</b> <span style="font-family:monospace;font-size:16px">#${pesanan.kodeUnik}</span></p>
            <p style="margin:0 0 4px"><b>Tanggal Pesan:</b> ${tanggal} WIB</p>
            <p style="margin:0 0 12px"><b>Status:</b> Lunas · ${pesanan.metodePembayaran === "QRIS" ? "QRIS" : "Transfer Bank"}</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              ${baris}
              <tr><td style="padding:6px 0;border-top:1px solid #ddd">Kode unik</td><td style="padding:6px 0;border-top:1px solid #ddd;text-align:right">+${parseInt(pesanan.kodeUnik)}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold">Total Dibayar</td><td style="padding:6px 0;text-align:right;font-weight:bold">${rp(pesanan.totalBayar)}</td></tr>
            </table>
          </div>
          ${konfig?.infoPengambilan ? `<p style="background:#fff7ed;border-radius:8px;padding:12px">${escapeHtml(konfig.infoPengambilan)}</p>` : ""}
          <p>Simpan email ini sebagai bukti pemesanan. Tunjukkan email ini atau sebutkan kode pesanan saat mengambil merchandise.</p>
          <p style="font-size:12px;color:#aaa">LPKBB Antareja 2026 — SMK Telkom Malang</p>
        </div>`,
    });
  } catch (e) {
    console.error("Gagal kirim email merch:", e);
  }
}

// ─── Admin: Master Produk ─────────────────────────────────────────────────────

export async function createMerchandise(data: FormData) {
  await requireAdminOrBendahara();
  const parsed = parseProduk(data);
  if (parsed.error) return { success: false, message: parsed.error };

  const files = ambilFileFoto(data);
  if (files.length === 0) return { success: false, message: "Minimal 1 gambar produk" };
  if (files.length > MAKS_FOTO) return { success: false, message: `Maksimal ${MAKS_FOTO} gambar` };

  try {
    const up = await uploadFotos(files);
    if (up.error) return { success: false, message: up.error };
    const merch = await prisma.merchandise.create({ data: { ...parsed.produk!, fotos: up.urls! } });
    await catatLog("TAMBAH_MERCHANDISE", `${merch.nama} — Rp${merch.harga}`);
    revalidateMerch();
    return { success: true };
  } catch (e) {
    console.error("createMerchandise error:", e);
    return { success: false, message: "Gagal menambahkan produk" };
  }
}

// Gambar baru (kalau ada) ditambahkan setelah gambar lama; hapus gambar lewat
// hapusFotoMerchandise supaya admin tidak perlu upload ulang semuanya.
export async function updateMerchandise(data: FormData, id: string) {
  await requireAdminOrBendahara();
  const parsed = parseProduk(data);
  if (parsed.error) return { success: false, message: parsed.error };

  try {
    const lama = await prisma.merchandise.findUnique({ where: { id } });
    if (!lama) return { success: false, message: "Produk tidak ditemukan" };

    const files = ambilFileFoto(data);
    if (lama.fotos.length + files.length > MAKS_FOTO)
      return { success: false, message: `Maksimal ${MAKS_FOTO} gambar per produk` };
    const up = files.length ? await uploadFotos(files) : { urls: [] as string[] };
    if (up.error) return { success: false, message: up.error };

    await prisma.merchandise.update({
      where: { id },
      data: { ...parsed.produk!, fotos: [...lama.fotos, ...up.urls!] },
    });
    await catatLog("UBAH_MERCHANDISE", parsed.produk!.nama);
    revalidateMerch();
    return { success: true };
  } catch (e) {
    console.error("updateMerchandise error:", e);
    return { success: false, message: "Gagal menyimpan produk" };
  }
}

export async function hapusFotoMerchandise(id: string, url: string) {
  await requireAdminOrBendahara();
  try {
    const merch = await prisma.merchandise.findUnique({ where: { id } });
    if (!merch) return { success: false };
    if (merch.fotos.length <= 1) return { success: false, message: "Produk harus punya minimal 1 gambar" };
    await prisma.merchandise.update({
      where: { id },
      data: { fotos: merch.fotos.filter((f) => f !== url) },
    });
    revalidateMerch();
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function toggleAktifMerchandise(id: string, aktif: boolean) {
  await requireAdminOrBendahara();
  try {
    await prisma.merchandise.update({ where: { id }, data: { aktif } });
    revalidateMerch();
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function deleteMerchandise(id: string) {
  await requireAdminOrBendahara();
  try {
    // Pesanan menyimpan snapshot item (bukan relasi), jadi aman dihapus.
    const merch = await prisma.merchandise.delete({ where: { id } });
    await catatLog("HAPUS_MERCHANDISE", merch.nama);
    revalidateMerch();
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ─── Admin: Konfigurasi PO ────────────────────────────────────────────────────

export async function saveKonfigMerch(data: FormData) {
  await requireAdminOrBendahara();
  const poAktif = data.get("poAktif") === "on";
  const tutupRaw = data.get("tutupPada") as string;
  const tutupPada = parseWibDatetimeLocal(tutupRaw);
  if (tutupRaw && !tutupPada) return { success: false, message: "Batas PO tidak valid" };
  const infoPengambilan = ((data.get("infoPengambilan") as string) || "").trim() || null;

  try {
    const isi = { poAktif, tutupPada, infoPengambilan };
    await prisma.konfigMerch.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", ...isi },
      update: isi,
    });
    await catatLog("UBAH_KONFIG_MERCH", poAktif ? "PO dibuka" : "PO ditutup");
    revalidateMerch();
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ─── Publik: Pesan (PO) ───────────────────────────────────────────────────────

// Kode unik 3 digit atomik, sama pola dengan reserveKodeTiket.
export async function reserveKodeMerch() {
  try {
    const updated = await incrementCounterUrutMerch();
    return { success: true, kodeUnik: String(updated.counterUrut % 1000).padStart(3, "0") };
  } catch (e) {
    console.error("reserveKodeMerch error:", e);
    return { success: false };
  }
}

export async function pesanMerchandise(data: FormData, userId?: string) {
  const nama = ((data.get("nama") as string) || "").trim();
  const email = ((data.get("email") as string) || "").trim();
  const noHp = ((data.get("noHp") as string) || "").trim();
  const bukti = data.get("bukti") as File | null;
  const metodePembayaran = (data.get("metodePembayaran") as string) || "TRANSFER";
  const kodeUnik = data.get("kodeUnik") as string | null;

  if (!nama || !email || !noHp) return { success: false, message: "Data pemesan wajib diisi lengkap" };
  if (metodePembayaran !== "TRANSFER" && metodePembayaran !== "QRIS")
    return { success: false, message: "Metode pembayaran hanya QRIS atau Transfer" };
  if (metodePembayaran === "TRANSFER" && (!bukti || bukti.size === 0))
    return { success: false, message: "Bukti pembayaran wajib diunggah" };
  if (!kodeUnik || !/^\d{3}$/.test(kodeUnik))
    return { success: false, message: "Kode pembayaran tidak valid, silakan muat ulang halaman" };

  // Keranjang dari klien hanya dipercaya untuk id/ukuran/jumlah — nama & harga
  // selalu diambil ulang dari database.
  let keranjang: { merchId: string; ukuran: string | null; jumlah: number }[];
  try {
    keranjang = JSON.parse((data.get("items") as string) || "[]");
  } catch {
    return { success: false, message: "Data pesanan tidak valid" };
  }
  if (!Array.isArray(keranjang) || keranjang.length === 0)
    return { success: false, message: "Pilih minimal 1 produk" };

  const konfig = await findKonfigMerch();
  if (!poTerbuka(konfig)) return { success: false, message: "Pre-order sedang ditutup" };

  const produkList = await prisma.merchandise.findMany({
    where: { id: { in: keranjang.map((k) => k.merchId) }, aktif: true },
  });
  const items: ItemPesanan[] = [];
  for (const k of keranjang) {
    const p = produkList.find((x) => x.id === k.merchId);
    if (!p) return { success: false, message: "Ada produk yang sudah tidak tersedia, muat ulang halaman" };
    const jumlah = Number(k.jumlah);
    if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > MAKS_JUMLAH_PER_ITEM)
      return { success: false, message: `Jumlah ${p.nama} tidak valid` };
    const pilihan = daftarUkuran(p.ukuran);
    const ukuran = pilihan.length ? k.ukuran : null;
    if (pilihan.length && (!ukuran || !pilihan.includes(ukuran)))
      return { success: false, message: `Pilih ukuran untuk ${p.nama}` };
    items.push({ merchId: p.id, nama: p.nama, ukuran, harga: p.harga, jumlah });
  }
  const subtotal = items.reduce((s, i) => s + i.harga * i.jumlah, 0);
  const totalBayar = subtotal + parseInt(kodeUnik);

  let buktiUrl: string | undefined;
  if (bukti && bukti.size > 0) {
    const cek = await validateUploadFile(bukti);
    if (!cek.valid) return { success: false, message: cek.message };
    const upload = await imageUploader(Buffer.from(await bukti.arrayBuffer()));
    if (upload.error) return { success: false, message: upload.message };
    buktiUrl = upload.data?.url;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const dipakai = await tx.pesananMerch.findFirst({
        where: { kodeUnik, status: { in: ["PENDING", "VERIFIED"] } },
      });
      if (dipakai) throw new Error("KODE_UNIK_DIPAKAI");
      await tx.pesananMerch.create({
        data: {
          nama,
          email,
          noHp,
          items,
          subtotal,
          kodeUnik,
          totalBayar,
          metodePembayaran,
          ...(buktiUrl ? { bukti: buktiUrl } : {}),
          ...(userId ? { user: { connect: { id: userId } } } : {}),
        },
      });
    });
    revalidatePath("/admin/merchandise");
    return { success: true };
  } catch (e: any) {
    if (e?.message === "KODE_UNIK_DIPAKAI")
      return { success: false, message: "Kode unik sudah terpakai, silakan coba lagi" };
    console.error("pesanMerchandise error:", e);
    return { success: false, message: "Gagal memproses pesanan" };
  }
}

// ─── Admin: Verifikasi & Pengambilan ──────────────────────────────────────────

export async function verifikasiPesananMerch(id: string) {
  await requireAdminOrBendahara();
  try {
    const pesanan = await prisma.pesananMerch.findUnique({ where: { id } });
    if (!pesanan) return { success: false };
    if (pesanan.status !== "PENDING") return { success: false, message: "Pesanan sudah diproses" };

    const items = pesanan.items as ItemPesanan[];
    const label = labelItems(items);
    await prisma.$transaction([
      prisma.pesananMerch.update({ where: { id }, data: { status: "VERIFIED" } }),
      // Nominal kas = yang benar-benar ditransfer (subtotal + kode unik).
      prisma.kasTransaksi.create({
        data: {
          tipe: "PEMASUKAN",
          keterangan: `Merchandise PO: ${label} (${pesanan.nama}) [#${pesanan.kodeUnik}]`,
          jumlah: pesanan.totalBayar,
          kategori: "MERCHANDISE",
          sumber: "MERCHANDISE",
          referensiId: id,
        },
      }),
    ]);
    await catatLog("VERIFIKASI_MERCH", `${label} (${pesanan.nama}) — Rp${pesanan.totalBayar}`);

    await kirimEmailBuktiPesanan(pesanan);

    revalidatePath("/admin/merchandise");
    revalidatePath("/admin/kas");
    return { success: true };
  } catch (e) {
    console.error("verifikasiPesananMerch error:", e);
    return { success: false };
  }
}

export async function tolakPesananMerch(id: string) {
  await requireAdminOrBendahara();
  try {
    const pesanan = await prisma.pesananMerch.update({
      where: { id, status: "PENDING" },
      data: { status: "REJECTED" },
    });
    await catatLog("TOLAK_MERCH", `${labelItems(pesanan.items as ItemPesanan[])} (${pesanan.nama})`);
    revalidatePath("/admin/merchandise");
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function tandaiDiambilMerch(id: string) {
  await requireAdminOrBendahara();
  try {
    const pesanan = await prisma.pesananMerch.update({
      where: { id, status: "VERIFIED" },
      data: { status: "DIAMBIL", diambilAt: new Date() },
    });
    await catatLog("MERCH_DIAMBIL", `${pesanan.nama} [#${pesanan.kodeUnik}]`);
    revalidatePath("/admin/merchandise");
    return { success: true };
  } catch {
    return { success: false };
  }
}
