"use server";

import prisma from "@/lib/prisma";
import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { Jenjang } from "@prisma/client";
import { getServerSession } from "@/lib/next-auth";
import { catatLog } from "@/lib/activityLog";
import { labelNilai, normalisasiKode } from "@/lib/voucher";
import { sendMailTo } from "@/lib/mailer";
import { escapeHtml } from "@/lib/escapeHtml";

// Voucher memengaruhi pemasukan pendaftaran — sama aksesnya dengan /admin/pembayaran.
async function requireAdmin() {
  const session = await getServerSession();
  if (!["ADMIN", "BENDAHARA"].includes(session?.user?.role ?? "")) throw new Error("Forbidden");
}

const VALID_JENJANG: Jenjang[] = ["SD", "SMP", "SMA", "PURNA"];
// Tanpa huruf/angka yang mirip (0/O, 1/I/L) — kode dibacakan/diketik ulang peserta.
const HURUF_KODE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function kodeAcak(prefix: string) {
  let s = "";
  for (let i = 0; i < 6; i++) s += HURUF_KODE[randomInt(HURUF_KODE.length)];
  return `${prefix}-${s}`;
}

const teks = (data: FormData, key: string) => ((data.get(key) as string) ?? "").trim();
const angkaOpsional = (data: FormData, key: string) => {
  const s = teks(data, key);
  return s === "" ? null : Number(s);
};

type Hasil = { success: boolean; message?: string };

// Bagian yang sama antara voucher umum & massal: jenis + besar potongan.
function bacaPotongan(data: FormData): { persen: boolean; nilai: number; maksPotongan: number | null } | string {
  const persen = teks(data, "jenis") === "PERSEN";
  const nilai = Number(teks(data, "nilai"));
  const maksPotongan = persen ? angkaOpsional(data, "maksPotongan") : null;
  if (!Number.isInteger(nilai) || nilai < 1) return "Besar potongan harus bilangan bulat positif";
  if (persen && nilai > 100) return "Potongan persen maksimal 100";
  if (maksPotongan != null && (!Number.isInteger(maksPotongan) || maksPotongan < 1))
    return "Maksimal potongan harus bilangan bulat positif";
  return { persen, nilai, maksPotongan };
}

function bacaJenjang(data: FormData): Jenjang | null | "invalid" {
  const j = teks(data, "jenjang");
  if (!j) return null;
  return VALID_JENJANG.includes(j as Jenjang) ? (j as Jenjang) : "invalid";
}

function segarkan() {
  revalidatePath("/admin/voucher");
  revalidatePath("/dashboard");
}

export async function buatVoucher(data: FormData): Promise<Hasil> {
  try {
    await requireAdmin();
    const potongan = bacaPotongan(data);
    if (typeof potongan === "string") return { success: false, message: potongan };
    const jenjang = bacaJenjang(data);
    if (jenjang === "invalid") return { success: false, message: "Jenjang tidak valid" };
    const kuota = angkaOpsional(data, "kuota");
    if (kuota != null && (!Number.isInteger(kuota) || kuota < 1))
      return { success: false, message: "Kuota harus bilangan bulat positif" };
    const asalSekolah = teks(data, "asalSekolah") || null;
    const keterangan = teks(data, "keterangan").slice(0, 200) || null;

    let kode = normalisasiKode(teks(data, "kode"));
    if (kode && !/^[A-Z0-9-]{3,40}$/.test(kode))
      return { success: false, message: "Kode hanya boleh huruf, angka, dan tanda -, panjang 3-40" };
    if (!kode) kode = kodeAcak("ANT");

    await prisma.voucher.create({
      data: { kode, keterangan, ...potongan, jenjang, asalSekolah, kuota, aktif: data.get("aktif") === "on" },
    });
    await catatLog("BUAT_VOUCHER", `Voucher ${kode}`);
    segarkan();
    return { success: true, message: `Voucher ${kode} dibuat` };
  } catch (e: any) {
    if (e?.code === "P2002") return { success: false, message: "Kode voucher sudah dipakai, gunakan kode lain" };
    console.error("buatVoucher error:", e);
    return { success: false, message: "Gagal membuat voucher" };
  }
}

// Voucher pribadi untuk kegiatan berikutnya: satu kode per tim terpilih,
// dikunci ke asal sekolah DAN jenjang tim itu, sekali pakai. Tim yang sudah punya voucher
// pribadi dilewati supaya klik ulang tidak menggandakan voucher.
export async function buatVoucherMassal(data: FormData): Promise<Hasil> {
  try {
    await requireAdmin();
    const potongan = bacaPotongan(data);
    if (typeof potongan === "string") return { success: false, message: potongan };
    const timIds = Array.from(new Set(data.getAll("timId").map(String))).filter(Boolean);
    if (timIds.length === 0) return { success: false, message: "Pilih minimal satu tim" };
    const aktif = data.get("aktif") === "on";
    const keterangan = teks(data, "keterangan").slice(0, 200) || null;

    const [tims, sudahAda] = await Promise.all([
      prisma.tim.findMany({
        where: { id: { in: timIds } },
        select: {
          id: true,
          nama_tim: true,
          asal_sekolah: true,
          jenjang: true,
          no_official: true,
          user: { select: { email: true } },
        },
      }),
      prisma.voucher.findMany({ where: { sumberTimId: { in: timIds } }, select: { sumberTimId: true } }),
    ]);
    const lewati = new Set(sudahAda.map((v) => v.sumberTimId));
    const target = tims.filter((t) => !lewati.has(t.id));

    let dibuat = 0;
    for (const t of target) {
      // Kode acak bisa bentrok (kecil sekali kemungkinannya) — coba ulang.
      for (let percobaan = 0; percobaan < 5; percobaan++) {
        try {
          await prisma.voucher.create({
            data: {
              kode: kodeAcak("ANT"),
              keterangan: keterangan ?? `Voucher ${t.nama_tim}`,
              ...potongan,
              // Voucher berlaku per jenjang: hadiah tim SMP hanya untuk tim SMP
              // sekolah itu (sekolah/yayasan bisa punya SMP & SMA dengan nama mirip).
              jenjang: t.jenjang,
              asalSekolah: t.asal_sekolah,
              kuota: 1,
              aktif,
              sumberTimId: t.id,
              // Snapshot — tim & user direset setelah kegiatan.
              penerimaNama: `${t.nama_tim} — ${t.asal_sekolah}`,
              penerimaEmail: t.user?.email ?? null,
              penerimaTelp: t.no_official ?? null,
            },
          });
          dibuat++;
          break;
        } catch (e: any) {
          if (e?.code !== "P2002") throw e;
        }
      }
    }

    await catatLog("BUAT_VOUCHER_MASSAL", `${dibuat} voucher pribadi`);
    segarkan();
    const dilewati = tims.length - target.length;
    return {
      success: true,
      message: `${dibuat} voucher dibuat${dilewati ? `, ${dilewati} tim dilewati karena sudah punya voucher` : ""}`,
    };
  } catch (e) {
    console.error("buatVoucherMassal error:", e);
    return { success: false, message: "Gagal membuat voucher" };
  }
}

export async function setAktifVoucher(ids: string[], aktif: boolean): Promise<Hasil> {
  try {
    await requireAdmin();
    if (ids.length === 0) return { success: false, message: "Tidak ada voucher dipilih" };
    const r = await prisma.voucher.updateMany({ where: { id: { in: ids } }, data: { aktif } });
    await catatLog(aktif ? "AKTIFKAN_VOUCHER" : "NONAKTIFKAN_VOUCHER", `${r.count} voucher`);
    segarkan();
    return { success: true, message: `${r.count} voucher ${aktif ? "diaktifkan" : "dinonaktifkan"}` };
  } catch (e) {
    console.error("setAktifVoucher error:", e);
    return { success: false, message: "Gagal mengubah status voucher" };
  }
}

// Voucher pribadi dicocokkan otomatis lewat nama sekolah — kalau ejaannya
// keliru/berubah (mis. sekolah ganti nama), panitia membetulkannya di sini.
export async function ubahSekolahVoucher(id: string, asalSekolah: string): Promise<Hasil> {
  try {
    await requireAdmin();
    const nama = asalSekolah.trim().slice(0, 150);
    if (!nama) return { success: false, message: "Nama sekolah tidak boleh kosong" };
    const v = await prisma.voucher.update({ where: { id }, data: { asalSekolah: nama } });
    await catatLog("UBAH_SEKOLAH_VOUCHER", `Voucher ${v.kode} → ${nama}`);
    segarkan();
    return { success: true, message: "Nama sekolah voucher diperbarui" };
  } catch (e) {
    console.error("ubahSekolahVoucher error:", e);
    return { success: false, message: "Gagal mengubah nama sekolah" };
  }
}

// Kirim kode voucher pribadi ke email penerima (snapshot penerimaEmail). WAJIB
// dilakukan sebelum data tim/user direset — setelah itu kode tidak lagi tampil
// di dashboard tim. Dikirim satu per satu; yang gagal dilaporkan, yang berhasil
// dicatat emailTerkirimAt sehingga bisa diulang khusus yang belum terkirim.
export async function kirimEmailVoucher(ids: string[]): Promise<Hasil> {
  try {
    await requireAdmin();
    const vouchers = await prisma.voucher.findMany({ where: { id: { in: ids }, penerimaEmail: { not: null } } });
    if (vouchers.length === 0) return { success: false, message: "Tidak ada voucher dengan email penerima" };

    let terkirim = 0;
    const gagal: string[] = [];
    for (const v of vouchers) {
      const syarat = [
        v.jenjang ? `jenjang ${v.jenjang}` : null,
        v.asalSekolah ? `khusus tim dari ${escapeHtml(v.asalSekolah)}` : null,
      ]
        .filter(Boolean)
        .join(", ");
      try {
        await sendMailTo({
          to: v.penerimaEmail!,
          subject: `Kode Voucher Pendaftaran LPKBB Antareja Berikutnya — ${v.kode}`,
          html:
            `<p>Halo ${escapeHtml(v.penerimaNama ?? "Peserta")},</p>` +
            `<p>Terima kasih telah berpartisipasi di LPKBB Antareja. Berikut kode voucher potongan biaya pendaftaran ` +
            `untuk kegiatan Antareja berikutnya:</p>` +
            `<p style="font-size:22px;font-weight:bold;letter-spacing:3px;font-family:monospace">${v.kode}</p>` +
            `<p>Potongan: <b>${labelNilai(v)}</b> dari biaya pendaftaran lunas${syarat ? ` (${syarat})` : ""}. ` +
            `Voucher berlaku satu kali dan <b>terpasang otomatis</b> saat tim dari sekolah tersebut mendaftar ` +
            `(pastikan nama sekolah diisi sama). Kode di atas bisa dipakai bila voucher tidak terpasang otomatis.</p>` +
            `<p>Akun dan data tim tahun ini akan dihapus setelah kegiatan; mohon teruskan informasi ini ke ` +
            `pembina/pelatih sekolah.</p><p>Sampai jumpa di Antareja berikutnya!</p>`,
        });
        await prisma.voucher.update({ where: { id: v.id }, data: { emailTerkirimAt: new Date() } });
        terkirim++;
      } catch {
        gagal.push(v.kode);
      }
    }

    await catatLog("KIRIM_EMAIL_VOUCHER", `${terkirim} terkirim${gagal.length ? `, gagal: ${gagal.join(", ")}` : ""}`);
    revalidatePath("/admin/voucher");
    return {
      success: terkirim > 0,
      message: `${terkirim} email terkirim${gagal.length ? `, ${gagal.length} gagal (${gagal.slice(0, 5).join(", ")})` : ""}`,
    };
  } catch (e) {
    console.error("kirimEmailVoucher error:", e);
    return { success: false, message: "Gagal mengirim email voucher" };
  }
}

// Voucher yang masih dirujuk pembayaran tim kegiatan ini tidak bisa dihapus —
// nonaktifkan saja. Setelah reset data tim, voucher lama bisa dibersihkan.
export async function hapusVoucher(id: string): Promise<Hasil> {
  try {
    await requireAdmin();
    const terpakai = await prisma.pembayaran.count({ where: { voucherId: id } });
    if (terpakai > 0) return { success: false, message: "Voucher sudah dipakai tim, nonaktifkan saja" };
    const v = await prisma.voucher.delete({ where: { id } });
    await catatLog("HAPUS_VOUCHER", `Voucher ${v.kode}`);
    segarkan();
    return { success: true };
  } catch (e) {
    console.error("hapusVoucher error:", e);
    return { success: false, message: "Gagal menghapus voucher" };
  }
}
