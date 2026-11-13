"use server";
import { batasiAksi } from "@/lib/rateLimit";

import { getServerSession } from "@/lib/next-auth";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { catatLog } from "@/lib/activityLog";
import { sendMailTo } from "@/lib/mailer";
import { escapeHtml } from "@/lib/escapeHtml";
import { cekDataPemesan } from "@/lib/validasi";
import { parseWibDatetimeLocal } from "@/lib/datetime";
import { daftarUkuran, labelItems, poTerbuka, type ItemPesanan } from "@/lib/merchandise";
import { findKonfigMerch, incrementCounterUrutMerch } from "@/queries/merchandise.query";
import { compressPhoto, imageUploader, validateUploadFile, bufferBukti } from "./fileUploader";
import { notifPembayaranMasuk } from "@/lib/emailPembayaran";
import { cekTokenKode, terbitkanTokenKode } from "@/lib/kodeUnikToken";
import {
  batasBayarDariSekarang,
  BATAS_BAYAR_JAM,
  buatAksesToken,
  kedaluwarsakanPesananReady,
  kembalikanStokMerch,
  linkPesananMerch,
  STATUS_KODE_AKTIF,
  terbitkanKodeUnikMerch,
  tokenCocok,
} from "@/lib/merchReady";

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
  const hargaBeliRaw = ((data.get("hargaBeli") as string) || "").trim();
  const hargaBeli = hargaBeliRaw === "" ? null : parseInt(hargaBeliRaw);
  const ukuranList = daftarUkuran(data.get("ukuran") as string);
  const urutan = parseInt((data.get("urutan") as string) || "0") || 0;
  if (!nama) return { error: "Nama produk wajib diisi" };
  if (!Number.isFinite(harga) || harga <= 0) return { error: "Harga jual tidak valid" };
  if (hargaBeli !== null && (!Number.isFinite(hargaBeli) || hargaBeli < 0 || hargaBeli > 10_000_000))
    return { error: "Harga beli tidak valid" };
  return {
    produk: { nama, deskripsi, harga, hargaBeli, ukuran: ukuranList.length ? ukuranList.join(",") : null, urutan },
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
  jenis?: string;
  ongkir?: number | null;
  pengiriman?: string | null;
}) {
  const items = pesanan.items as ItemPesanan[];
  const ready = pesanan.jenis === "READY";
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
          <p>${ready
            ? `Pembayaran merchandise Anda sudah diverifikasi panitia. ${pesanan.pengiriman === "KIRIM" ? "Pesanan segera kami kemas & kirim; nomor resi menyusul lewat email." : "Pesanan siap diambil."}`
            : "Pembayaran pre-order merchandise Anda sudah diverifikasi panitia. Pesanan Anda resmi masuk daftar produksi."}</p>
          <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:16px 0">
            <p style="margin:0 0 4px"><b>Kode Pesanan:</b> <span style="font-family:monospace;font-size:16px">#${pesanan.kodeUnik}</span></p>
            <p style="margin:0 0 4px"><b>Tanggal Pesan:</b> ${tanggal} WIB</p>
            <p style="margin:0 0 12px"><b>Status:</b> Lunas · ${pesanan.metodePembayaran === "QRIS" ? "QRIS" : "Transfer Bank"}</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              ${baris}
              ${pesanan.ongkir ? `<tr><td style="padding:6px 0">Ongkos kirim</td><td style="padding:6px 0;text-align:right">${rp(pesanan.ongkir)}</td></tr>` : ""}
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
    await catatLog(
      "TAMBAH_MERCHANDISE",
      `${merch.nama} — jual Rp${merch.harga}, beli ${merch.hargaBeli == null ? "-" : `Rp${merch.hargaBeli}`}`
    );
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
    const pr = parsed.produk!;
    await catatLog(
      "UBAH_MERCHANDISE",
      `${pr.nama} — jual Rp${pr.harga}, beli ${pr.hargaBeli == null ? "-" : `Rp${pr.hargaBeli}`}`
    );
    revalidateMerch();
    return { success: true };
  } catch (e) {
    console.error("updateMerchandise error:", e);
    return { success: false, message: "Gagal menyimpan produk" };
  }
}

// Harga beli disalin ke pesanan saat pesan, jadi pesanan yang masuk sebelum
// harga beli diisi tetap kosong. Aksi ini HANYA mengisi item yang masih kosong
// dengan harga beli produk sekarang — item yang sudah punya harga beli tidak diubah.
export async function isiHargaBeliPesananLamaMerch() {
  await requireAdminOrBendahara();
  try {
    const produk = await prisma.merchandise.findMany({ select: { id: true, hargaBeli: true } });
    const hargaBeliProduk = new Map(produk.filter((p) => p.hargaBeli != null).map((p) => [p.id, p.hargaBeli!]));
    const pesanan = await prisma.pesananMerch.findMany({ select: { id: true, items: true } });

    let barangTerisi = 0;
    let pesananDiubah = 0;
    for (const p of pesanan) {
      const items = p.items as ItemPesanan[];
      let berubah = false;
      const baru = items.map((i) => {
        if (i.hargaBeli != null) return i;
        const hb = hargaBeliProduk.get(i.merchId);
        if (hb == null) return i;
        berubah = true;
        barangTerisi += i.jumlah;
        return { ...i, hargaBeli: hb };
      });
      if (berubah) {
        await prisma.pesananMerch.update({ where: { id: p.id }, data: { items: baru } });
        pesananDiubah++;
      }
    }

    if (pesananDiubah > 0)
      await catatLog("ISI_HARGA_BELI_PESANAN_MERCH", `${barangTerisi} barang di ${pesananDiubah} pesanan`);
    revalidateMerch();
    return { success: true, barangTerisi, pesananDiubah };
  } catch (e) {
    console.error("isiHargaBeliPesananLamaMerch error:", e);
    return { success: false, message: "Gagal mengisi harga beli pesanan lama" };
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
  const readyAktif = data.get("readyAktif") === "on";
  const tutupRaw = data.get("tutupPada") as string;
  const tutupPada = parseWibDatetimeLocal(tutupRaw);
  if (tutupRaw && !tutupPada) return { success: false, message: "Batas PO tidak valid" };
  const infoPengambilan = ((data.get("infoPengambilan") as string) || "").trim() || null;

  try {
    const isi = { poAktif, tutupPada, infoPengambilan, readyAktif };
    await prisma.konfigMerch.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", ...isi },
      update: isi,
    });
    await catatLog(
      "UBAH_KONFIG_MERCH",
      `${poAktif ? "PO dibuka" : "PO ditutup"} · ready stock ${readyAktif ? "dibuka" : "ditutup"}`
    );
    revalidateMerch();
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ─── Publik: Pesan (PO) ───────────────────────────────────────────────────────

// Kode unik 3 digit atomik, sama pola dengan reserveKodeTiket.
export async function reserveKodeMerch() {
  const dibatasi = await batasiAksi("kode", 120, 10 * 60 * 1000);
  if (dibatasi) return { success: false, message: dibatasi };
  try {
    const updated = await incrementCounterUrutMerch();
    const kodeUnik = String(updated.counterUrut % 1000).padStart(3, "0");
    return { success: true, kodeUnik, ...terbitkanTokenKode(kodeUnik) };
  } catch (e) {
    console.error("reserveKodeMerch error:", e);
    return { success: false };
  }
}

export async function pesanMerchandise(data: FormData) {
  const dibatasi = await batasiAksi("beli", 40, 10 * 60 * 1000);
  if (dibatasi) return { success: false, message: dibatasi };
  // userId dari sesi, bukan dari klien — kalau dari klien, siapa pun bisa
  // menempelkan transaksinya ke akun orang lain.
  const userId = (await getServerSession())?.user?.id;
  const nama = ((data.get("nama") as string) || "").trim();
  const email = ((data.get("email") as string) || "").trim();
  const noHp = ((data.get("noHp") as string) || "").trim();
  const bukti = data.get("bukti") as File | null;
  const metodePembayaran = (data.get("metodePembayaran") as string) || "TRANSFER";
  const kodeUnik = data.get("kodeUnik") as string | null;

  const salahData = cekDataPemesan({ nama, email, noHp });
  if (salahData) return { success: false, message: salahData };
  if (metodePembayaran !== "TRANSFER" && metodePembayaran !== "QRIS")
    return { success: false, message: "Metode pembayaran hanya QRIS atau Transfer" };
  // Bukti WAJIB untuk Transfer maupun QRIS (aturan panitia).
  if (!bukti || bukti.size === 0)
    return { success: false, message: "Bukti pembayaran wajib diunggah — untuk QRIS, screenshot bukti berhasil dari aplikasi pembayaran" };
  if (!kodeUnik || !/^\d{3}$/.test(kodeUnik))
    return { success: false, message: "Kode pembayaran tidak valid, silakan muat ulang halaman" };
  if (metodePembayaran === "QRIS") {
    const salahKode = cekTokenKode(data.get("kodeToken"), kodeUnik);
    if (salahKode) return { success: false, message: salahKode };
  }

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
    items.push({ merchId: p.id, nama: p.nama, ukuran, harga: p.harga, hargaBeli: p.hargaBeli, jumlah });
  }
  const subtotal = items.reduce((s, i) => s + i.harga * i.jumlah, 0);
  const totalBayar = subtotal + parseInt(kodeUnik);

  let buktiUrl: string | undefined;
  if (bukti && bukti.size > 0) {
    const cek = await validateUploadFile(bukti);
    if (!cek.valid) return { success: false, message: cek.message };
    const upload = await imageUploader(await bufferBukti(bukti));
    if (upload.error) return { success: false, message: upload.message };
    buktiUrl = upload.data?.url;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const dipakai = await tx.pesananMerch.findFirst({
        where: { kodeUnik, status: { in: STATUS_KODE_AKTIF } },
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
    notifPembayaranMasuk({
      jenis: "Merchandise",
      pathAdmin: "/admin/merchandise",
      nama,
      kontak: `${email} · ${noHp}`,
      totalBayar,
      kodeUnik,
      metodePembayaran,
      buktiUrl,
      detail: labelItems(items),
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
      // Klaim atomik: status PENDING → VERIFIED sekali saja (tombol ganda tidak bikin kas dobel);
      // update dengan where status gagal (P2025) bila sudah diproses request lain.
      prisma.pesananMerch.update({ where: { id, status: "PENDING" }, data: { status: "VERIFIED" } }),
      // Nominal kas = yang benar-benar ditransfer (subtotal + kode unik).
      prisma.kasTransaksi.create({
        data: {
          tipe: "PEMASUKAN",
          keterangan: `Merchandise ${pesanan.jenis === "READY" ? "Ready" : "PO"}: ${label}${pesanan.ongkir ? ` + ongkir Rp${pesanan.ongkir}` : ""} (${pesanan.nama}) [#${pesanan.kodeUnik}]`,
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
    if ((e as { code?: string })?.code === "P2025") return { success: false, message: "Pesanan sudah diproses" };
    console.error("verifikasiPesananMerch error:", e);
    return { success: false };
  }
}

export async function tolakPesananMerch(id: string) {
  await requireAdminOrBendahara();
  try {
    const pesanan = await prisma.$transaction(async (tx) => {
      const p = await tx.pesananMerch.update({ where: { id, status: "PENDING" }, data: { status: "REJECTED" } });
      if (p.jenis === "READY") await kembalikanStokMerch(tx, p.items as ItemPesanan[]);
      return p;
    });
    revalidatePath("/merchandise");
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

// ─── Ready Stock (setelah PO ditutup) ─────────────────────────────────────────

const rpTeks = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

function revalidateReady(id?: string) {
  revalidateMerch();
  if (id) revalidatePath(`/merchandise/pesanan/${id}`);
}

// Tambah/kurangi stok ready secara relatif (atomik); stok tidak boleh < 0.
export async function ubahStokMerch(merchId: string, ukuran: string, delta: number) {
  await requireAdminOrBendahara();
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100000)
    return { success: false, message: "Jumlah perubahan stok tidak valid" };
  try {
    const p = await prisma.merchandise.findUnique({ where: { id: merchId } });
    if (!p) return { success: false, message: "Produk tidak ditemukan" };
    const pilihan = daftarUkuran(p.ukuran);
    if (pilihan.length ? !pilihan.includes(ukuran) : ukuran !== "")
      return { success: false, message: "Ukuran tidak valid" };

    if (delta > 0) {
      await prisma.stokMerch.upsert({
        where: { merchId_ukuran: { merchId, ukuran } },
        create: { merchId, ukuran, stok: delta },
        update: { stok: { increment: delta } },
      });
    } else {
      const r = await prisma.stokMerch.updateMany({
        where: { merchId, ukuran, stok: { gte: -delta } },
        data: { stok: { increment: delta } },
      });
      if (r.count === 0) return { success: false, message: "Stok tidak cukup untuk dikurangi" };
    }
    await catatLog("UBAH_STOK_MERCH", `${p.nama}${ukuran ? ` (${ukuran})` : ""} ${delta > 0 ? "+" : ""}${delta}`);
    revalidateMerch();
    return { success: true };
  } catch (e) {
    console.error("ubahStokMerch error:", e);
    return { success: false, message: "Gagal mengubah stok" };
  }
}

async function emailPesananReady(
  p: { id: string; nama: string; email: string; items: unknown; aksesToken: string | null },
  judul: string,
  isiHtml: string
) {
  if (!p.aksesToken) return;
  const link = linkPesananMerch(p.id, p.aksesToken);
  try {
    await sendMailTo({
      to: p.email,
      subject: `${judul} — Merchandise LPKBB Antareja 2026`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto">
          <h2 style="color:#F70048">${escapeHtml(judul)}</h2>
          <p>Halo <b>${escapeHtml(p.nama)}</b>,</p>
          ${isiHtml}
          <p style="background:#f9f9f9;border-radius:8px;padding:12px;font-size:14px">${escapeHtml(labelItems(p.items as ItemPesanan[]))}</p>
          <p><a href="${link}" style="display:inline-block;background:#F70048;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Lihat Pesanan</a></p>
          <p style="font-size:12px;color:#888">Simpan email ini — link di atas adalah akses ke pesanan Anda.</p>
          <p style="font-size:12px;color:#aaa">LPKBB Antareja 2026 — SMK Telkom Malang</p>
        </div>`,
    });
  } catch (e) {
    console.error("Gagal kirim email merch ready:", e);
  }
}

// Publik: pesan ready stock. KIRIM → menunggu ongkir dari admin; AMBIL →
// langsung bisa dibayar. Stok ditahan sejak pesanan dibuat.
export async function pesanMerchReady(data: FormData) {
  const dibatasi = await batasiAksi("beli", 40, 10 * 60 * 1000);
  if (dibatasi) return { success: false, message: dibatasi };
  const userId = (await getServerSession())?.user?.id;
  const nama = ((data.get("nama") as string) || "").trim();
  const email = ((data.get("email") as string) || "").trim();
  const noHp = ((data.get("noHp") as string) || "").trim();
  const pengiriman = data.get("pengiriman") as string;
  const alamat = ((data.get("alamat") as string) || "").trim().slice(0, 500);

  const salahData = cekDataPemesan({ nama, email, noHp });
  if (salahData) return { success: false, message: salahData };
  if (pengiriman !== "KIRIM" && pengiriman !== "AMBIL") return { success: false, message: "Pilih cara pengambilan" };
  if (pengiriman === "KIRIM" && alamat.length < 15)
    return { success: false, message: "Alamat pengiriman wajib diisi lengkap (jalan, kota, kode pos)" };

  let keranjang: { merchId: string; ukuran: string | null; jumlah: number }[];
  try {
    keranjang = JSON.parse((data.get("items") as string) || "[]");
  } catch {
    return { success: false, message: "Data pesanan tidak valid" };
  }
  if (!Array.isArray(keranjang) || keranjang.length === 0) return { success: false, message: "Pilih minimal 1 produk" };

  const konfig = await findKonfigMerch();
  if (!konfig?.readyAktif || poTerbuka(konfig))
    return { success: false, message: "Penjualan ready stock sedang tidak dibuka" };

  await kedaluwarsakanPesananReady();

  const produkList = await prisma.merchandise.findMany({
    where: { id: { in: keranjang.map((k) => k.merchId) }, aktif: true },
  });
  const gabung = new Map<string, ItemPesanan>();
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
    const key = `${p.id}|${ukuran ?? ""}`;
    const ada = gabung.get(key);
    if (ada) ada.jumlah += jumlah;
    else gabung.set(key, { merchId: p.id, nama: p.nama, ukuran, harga: p.harga, hargaBeli: p.hargaBeli, jumlah });
  }
  const items = Array.from(gabung.values());
  const subtotal = items.reduce((s, i) => s + i.harga * i.jumlah, 0);
  const aksesToken = buatAksesToken();

  try {
    const pesanan = await prisma.$transaction(async (tx) => {
      for (const i of items) {
        const r = await tx.stokMerch.updateMany({
          where: { merchId: i.merchId, ukuran: i.ukuran ?? "", stok: { gte: i.jumlah } },
          data: { stok: { decrement: i.jumlah } },
        });
        if (r.count === 0) throw new Error(`STOK:${i.nama}${i.ukuran ? ` (${i.ukuran})` : ""}`);
      }
      const ambil = pengiriman === "AMBIL";
      const kodeUnik = ambil ? await terbitkanKodeUnikMerch(tx) : "";
      return tx.pesananMerch.create({
        data: {
          nama,
          email,
          noHp,
          items,
          subtotal,
          kodeUnik,
          totalBayar: ambil ? subtotal + parseInt(kodeUnik) : subtotal,
          jenis: "READY",
          pengiriman,
          alamat: ambil ? null : alamat,
          status: ambil ? "MENUNGGU_BAYAR" : "MENUNGGU_ONGKIR",
          batasBayar: ambil ? batasBayarDariSekarang() : null,
          aksesToken,
          ...(userId ? { user: { connect: { id: userId } } } : {}),
        },
      });
    });

    await emailPesananReady(
      pesanan,
      pesanan.status === "MENUNGGU_BAYAR" ? "Pesanan Diterima — Silakan Bayar" : "Pesanan Diterima — Menunggu Ongkir",
      pesanan.status === "MENUNGGU_BAYAR"
        ? `<p>Pesanan Anda (ambil sendiri) sudah kami terima. Total yang harus dibayar <b>${rpTeks(pesanan.totalBayar)}</b> (termasuk kode unik). Bayar &amp; unggah bukti paling lambat <b>${BATAS_BAYAR_JAM} jam</b>, lewat dari itu pesanan otomatis batal.</p>`
        : `<p>Pesanan Anda sudah kami terima dan barangnya sudah kami sisihkan. Panitia akan menghitung <b>ongkos kirim</b> ke alamat Anda, lalu mengirim email berisi total pembayaran.</p>`
    );
    await catatLog("PESAN_MERCH_READY", `${labelItems(items)} (${nama}) — ${pengiriman}`);
    revalidateReady();
    return { success: true, link: `/merchandise/pesanan/${pesanan.id}?t=${aksesToken}` };
  } catch (e: any) {
    if (typeof e?.message === "string" && e.message.startsWith("STOK:"))
      return { success: false, message: `Stok ${e.message.slice(5)} tidak cukup, muat ulang halaman` };
    console.error("pesanMerchReady error:", e);
    return { success: false, message: "Gagal memproses pesanan" };
  }
}

// Admin: isi ongkir → pesanan siap dibayar (kode unik terbit, batas bayar mulai).
export async function konfirmasiOngkirMerch(id: string, ongkir: number) {
  await requireAdminOrBendahara();
  if (!Number.isInteger(ongkir) || ongkir < 0 || ongkir > 5_000_000)
    return { success: false, message: "Ongkir tidak valid" };
  try {
    const pesanan = await prisma.$transaction(async (tx) => {
      const p = await tx.pesananMerch.findUnique({ where: { id } });
      if (!p || p.status !== "MENUNGGU_ONGKIR") return null;
      const kodeUnik = await terbitkanKodeUnikMerch(tx);
      return tx.pesananMerch.update({
        where: { id, status: "MENUNGGU_ONGKIR" },
        data: {
          ongkir,
          kodeUnik,
          totalBayar: p.subtotal + ongkir + parseInt(kodeUnik),
          status: "MENUNGGU_BAYAR",
          batasBayar: batasBayarDariSekarang(),
        },
      });
    });
    if (!pesanan) return { success: false, message: "Pesanan sudah diproses" };
    await emailPesananReady(
      pesanan,
      "Ongkir Sudah Dihitung — Silakan Bayar",
      `<table style="width:100%;font-size:14px;border-collapse:collapse">
        <tr><td>Subtotal barang</td><td style="text-align:right">${rpTeks(pesanan.subtotal)}</td></tr>
        <tr><td>Ongkos kirim</td><td style="text-align:right">${rpTeks(ongkir)}</td></tr>
        <tr><td>Kode unik</td><td style="text-align:right">+${parseInt(pesanan.kodeUnik)}</td></tr>
        <tr><td style="font-weight:bold;border-top:1px solid #ddd">Total bayar</td><td style="text-align:right;font-weight:bold;border-top:1px solid #ddd">${rpTeks(pesanan.totalBayar)}</td></tr>
      </table>
      <p>Bayar dengan nominal <b>tepat</b> lalu unggah bukti di halaman pesanan paling lambat <b>${BATAS_BAYAR_JAM} jam</b>. Lewat dari itu pesanan otomatis batal.</p>`
    );
    await catatLog("ONGKIR_MERCH", `${pesanan.nama} — ongkir Rp${ongkir}, total Rp${pesanan.totalBayar}`);
    revalidateReady(id);
    return { success: true };
  } catch (e) {
    console.error("konfirmasiOngkirMerch error:", e);
    return { success: false, message: "Gagal menyimpan ongkir" };
  }
}

// Publik: pembeli mengunggah bukti bayar dari halaman pesanan.
export async function bayarMerchReady(data: FormData) {
  const dibatasi = await batasiAksi("beli", 40, 10 * 60 * 1000);
  if (dibatasi) return { success: false, message: dibatasi };
  const id = data.get("id") as string;
  const token = data.get("t") as string;
  const metodePembayaran = (data.get("metodePembayaran") as string) || "TRANSFER";
  const bukti = data.get("bukti") as File | null;
  if (metodePembayaran !== "TRANSFER" && metodePembayaran !== "QRIS")
    return { success: false, message: "Metode pembayaran hanya QRIS atau Transfer" };
  if (!bukti || bukti.size === 0) return { success: false, message: "Bukti pembayaran wajib diunggah" };

  await kedaluwarsakanPesananReady();
  const p = await prisma.pesananMerch.findUnique({ where: { id } });
  if (!p || !tokenCocok(p.aksesToken, token)) return { success: false, message: "Pesanan tidak ditemukan" };
  if (p.status !== "MENUNGGU_BAYAR")
    return {
      success: false,
      message: p.status === "BATAL" ? "Pesanan sudah batal (lewat batas bayar)" : "Pesanan tidak sedang menunggu pembayaran",
    };

  const cek = await validateUploadFile(bukti);
  if (!cek.valid) return { success: false, message: cek.message };
  const upload = await imageUploader(await bufferBukti(bukti));
  if (upload.error) return { success: false, message: upload.message };

  try {
    const r = await prisma.pesananMerch.updateMany({
      where: { id, status: "MENUNGGU_BAYAR" },
      data: { status: "PENDING", metodePembayaran, bukti: upload.data?.url },
    });
    if (r.count === 0) return { success: false, message: "Pesanan tidak sedang menunggu pembayaran" };
    notifPembayaranMasuk({
      jenis: "Merchandise (Ready Stock)",
      pathAdmin: "/admin/merchandise",
      nama: p.nama,
      kontak: `${p.email} · ${p.noHp}`,
      totalBayar: p.totalBayar,
      kodeUnik: p.kodeUnik,
      metodePembayaran,
      buktiUrl: upload.data?.url,
      detail: labelItems(p.items as ItemPesanan[]),
    });
    revalidateReady(id);
    return { success: true };
  } catch (e) {
    console.error("bayarMerchReady error:", e);
    return { success: false, message: "Gagal menyimpan pembayaran" };
  }
}

// Admin: batalkan pesanan READY yang belum dibayar → stok kembali.
export async function batalPesananMerchReady(id: string, alasan: string) {
  await requireAdminOrBendahara();
  const catatan = (alasan ?? "").trim().slice(0, 200);
  if (!catatan) return { success: false, message: "Alasan wajib diisi" };
  try {
    const p = await prisma.$transaction(async (tx) => {
      const klaim = await tx.pesananMerch.updateMany({
        where: { id, jenis: "READY", status: { in: ["MENUNGGU_ONGKIR", "MENUNGGU_BAYAR"] } },
        data: { status: "BATAL", catatanAdmin: catatan },
      });
      if (klaim.count === 0) return null;
      const row = await tx.pesananMerch.findUniqueOrThrow({ where: { id } });
      await kembalikanStokMerch(tx, row.items as ItemPesanan[]);
      return row;
    });
    if (!p) return { success: false, message: "Pesanan sudah diproses" };
    await emailPesananReady(p, "Pesanan Dibatalkan", `<p>Pesanan Anda dibatalkan panitia. Alasan: ${escapeHtml(catatan)}</p>`);
    await catatLog("BATAL_MERCH_READY", `${p.nama} — ${catatan}`);
    revalidateReady(id);
    return { success: true };
  } catch (e) {
    console.error("batalPesananMerchReady error:", e);
    return { success: false, message: "Gagal membatalkan" };
  }
}

// Admin: pesanan KIRIM yang sudah lunas → dikirim + nomor resi.
export async function tandaiDikirimMerch(id: string, kurir: string, resi: string) {
  await requireAdminOrBendahara();
  const k = (kurir ?? "").trim().slice(0, 50);
  const r = (resi ?? "").trim().slice(0, 80);
  if (!k || !r) return { success: false, message: "Kurir & nomor resi wajib diisi" };
  try {
    const p = await prisma.pesananMerch.update({
      where: { id, status: "VERIFIED", pengiriman: "KIRIM" },
      data: { status: "DIKIRIM", kurir: k, resi: r, dikirimAt: new Date() },
    });
    await emailPesananReady(
      p,
      "Pesanan Sudah Dikirim",
      `<p>Pesanan Anda sudah dikirim lewat <b>${escapeHtml(k)}</b> dengan nomor resi <b style="font-family:monospace">${escapeHtml(r)}</b>.</p>`
    );
    await catatLog("MERCH_DIKIRIM", `${p.nama} — ${k} ${r}`);
    revalidateReady(id);
    return { success: true };
  } catch {
    return { success: false, message: "Pesanan belum lunas atau sudah diproses" };
  }
}
