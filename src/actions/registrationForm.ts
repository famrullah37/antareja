"use server";
import { batasiAksi } from "@/lib/rateLimit";
import { Jenjang, Tipe } from "@prisma/client";
import { imageUploader, validateUploadFile } from "./fileUploader";
import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/next-auth";
import prisma from "@/lib/prisma";
import { biayaPendaftaran } from "./pembayaran";
import { notifPembayaranMasuk } from "@/lib/emailPembayaran";
import { cariVoucherSekolah, cekVoucher, hitungPotongan } from "@/lib/voucher";

const VALID_JENJANG: Jenjang[] = ["SD", "SMP", "SMA", "PURNA"];
const VALID_TIPE: Tipe[] = ["SMALL", "NORMAL"];

// Batas maksimal tim per jenjang, diatur Sie Lomba/admin lewat /admin/tim
// (KonfigUmum.kuotaSD/SMP/SMA/Purna). null berarti tidak dibatasi. Menerima
// client Prisma biasa ATAU transaksi (tx) supaya bisa dipakai atomic di
// submitFormRegistrasi.
async function getKuotaJenjang(
  client: { konfigUmum: Pick<typeof prisma.konfigUmum, "findUnique"> },
  jenjang: Jenjang
): Promise<number | null> {
  const konfig = await client.konfigUmum.findUnique({ where: { id: "singleton" } });
  const map: Record<Jenjang, number | null> = {
    SD: konfig?.kuotaSD ?? null,
    SMP: konfig?.kuotaSMP ?? null,
    SMA: konfig?.kuotaSMA ?? null,
    PURNA: konfig?.kuotaPurna ?? null,
  };
  return map[jenjang];
}

// Cadangkan kode unik 3 digit sebelum user transfer — dipanggil dari form
// begitu jenjang & tipe pembayaran dipilih, supaya nominal yang ditampilkan
// (biaya + kode unik) sudah pasti sebelum uang benar-benar ditransfer.
//
// Voucher hanya dihitung untuk pratinjau di sini — kodeUnik tetap dicadangkan
// walau voucher ditolak, supaya peserta tetap bisa lanjut tanpa voucher.
// Tanpa kode, voucher yang dikunci ke asal sekolah dicari otomatis
// (cariVoucherSekolah). Validasi final ada di submitFormRegistrasi.
export async function reserveKodePendaftaran(
  jenjang: Jenjang,
  isDP: boolean,
  voucher?: { kode: string; asalSekolah: string }
) {
  const dibatasi = await batasiAksi("kode", 120, 10 * 60 * 1000);
  if (dibatasi) return { success: false, message: dibatasi };
  if (!VALID_JENJANG.includes(jenjang)) return { success: false, message: "Jenjang tidak valid" };

  const kuota = await getKuotaJenjang(prisma, jenjang);
  if (kuota !== null) {
    const timCount = await prisma.tim.count({ where: { jenjang, confirmed: true } });
    if (timCount >= kuota) return { success: false, message: `Kuota jenjang ${jenjang} telah penuh!` };
  }

  try {
    let potongan = 0;
    let voucherKode: string | null = null;
    let voucherGagal: string | null = null;
    let voucherOtomatis = false;
    if (voucher?.kode.trim()) {
      const cek = await cekVoucher(prisma, voucher.kode, { jenjang, asalSekolah: voucher.asalSekolah ?? "" });
      if (cek.ok) {
        potongan = hitungPotongan(cek.voucher, await biayaPendaftaran(jenjang, false));
        voucherKode = cek.voucher.kode;
      } else {
        voucherGagal = cek.message;
      }
    } else if (voucher?.asalSekolah.trim()) {
      const v = await cariVoucherSekolah(prisma, voucher.asalSekolah, jenjang);
      if (v) {
        potongan = hitungPotongan(v, await biayaPendaftaran(jenjang, false));
        voucherKode = v.kode;
        voucherOtomatis = true;
      }
    }

    const updated = await prisma.konfigUmum.update({
      where: { id: "singleton" },
      data: { counterUrutPendaftaran: { increment: 1 } },
    });
    const kodeUnik = String(updated.counterUrutPendaftaran % 1000).padStart(3, "0");
    const hargaDasar = await biayaPendaftaran(jenjang, isDP, potongan);
    const totalBayar = hargaDasar + parseInt(kodeUnik);
    return { success: true, kodeUnik, hargaDasar, totalBayar, potongan, voucherKode, voucherGagal, voucherOtomatis };
  } catch (e) {
    console.error("reserveKodePendaftaran error:", e);
    return { success: false, message: "Gagal menyiapkan kode pembayaran" };
  }
}

export default async function submitFormRegistrasi(data: FormData) {
  const dibatasi = await batasiAksi("daftarTim", 20, 60 * 60 * 1000);
  if (dibatasi) return { success: false, message: dibatasi };
  const session = await getServerSession();
  if (!session?.user?.id) return { success: false, message: "Anda harus login terlebih dahulu" };
  const userId = session.user.id;

  const nama_tim = data.get("namatim") as string;
  const official = data.get("official") as string;
  const asal_sekolah = data.get("asal") as string;
  const jenjang = data.get("jenjang") as Jenjang;
  const tipe_tim = data.get("size") as Tipe;
  const bukti = data.get("bukti") as File;
  const bank = data.get("namabank") as string;
  const nama_rek = data.get("namarek") as string;
  const tipe_pembayaran = data.get("tipe-pembayaran") as string;
  const no_official = data.get("no-official") as string;
  const kodeUnik = data.get("kodeUnik") as string;
  const kodeVoucher = ((data.get("kodeVoucher") as string) ?? "").trim();
  const isDP = tipe_pembayaran === "TRUE";

  if (!nama_tim || !official || !asal_sekolah || !no_official || !bank || !nama_rek)
    return { success: false, message: "Mohon lengkapi semua data" };
  if (!VALID_JENJANG.includes(jenjang)) return { success: false, message: "Jenjang tidak valid" };
  if (!VALID_TIPE.includes(tipe_tim)) return { success: false, message: "Jumlah pasukan tidak valid" };
  if (!kodeUnik || !/^\d{3}$/.test(kodeUnik)) {
    return { success: false, message: "Kode pembayaran tidak valid, silakan pilih ulang jenjang & tipe pembayaran" };
  }

  // Pastikan kode unik ini belum pernah dipakai tim lain — nominal transfer
  // harus presisi unik supaya bendahara gampang cocokkan mutasi.
  const kodeDipakai = await prisma.pembayaran.findFirst({ where: { kodeUnik } });
  if (kodeDipakai) {
    return { success: false, message: "Kode pembayaran sudah terpakai, silakan pilih ulang jenjang & tipe pembayaran untuk dapat kode baru" };
  }

  // Pengecekan awal (tanpa kunci) supaya voucher yang jelas tidak berlaku
  // ditolak sebelum bukti transfer diupload. Dicek ulang di dalam transaksi.
  if (kodeVoucher) {
    const cek = await cekVoucher(prisma, kodeVoucher, { jenjang, asalSekolah: asal_sekolah });
    if (!cek.ok) return { success: false, message: `${cek.message}. Hapus kode voucher lalu pilih ulang jenjang & tipe pembayaran.` };
  }
  const biayaLunas = await biayaPendaftaran(jenjang, false);
  let totalBayar = 0;

  const fileCheck = await validateUploadFile(bukti);
  if (!fileCheck.valid) return { success: false, message: fileCheck.message };

  // Cukup cek keberadaan (Tim.userId sekarang @unique) — tidak perlu tarik
  // anggotas/pembayaran/penilaian segala tim milik user hanya untuk cek ini.
  const existingTimCount = await prisma.tim.count({ where: { userId } });
  if (existingTimCount > 0)
    return { success: false, message: "Akun Anda sudah memiliki tim terdaftar." };

  // Upload bukti dulu sebelum masuk transaksi DB
  const tryUploadImage = await imageUploader(Buffer.from(await bukti.arrayBuffer()));
  if (tryUploadImage.error)
    return { success: false, message: "Gagal upload bukti pembayaran" };

  try {
    // Atomic: cek kuota + buat tim dalam satu transaksi
    await prisma.$transaction(async (tx) => {
      const kuota = await getKuotaJenjang(tx, jenjang);
      if (kuota !== null) {
        const timCount = await tx.tim.count({ where: { jenjang, confirmed: true } });
        if (timCount >= kuota) throw new Error("KUOTA_PENUH");
      }

      // Voucher dikunci di dalam transaksi supaya kuotanya tidak terlewati
      // oleh dua pendaftaran yang masuk bersamaan.
      let voucherId: string | null = null;
      let potongan = 0;
      if (kodeVoucher) {
        const cek = await cekVoucher(tx, kodeVoucher, { jenjang, asalSekolah: asal_sekolah }, true);
        if (!cek.ok) throw new Error(`VOUCHER:${cek.message}`);
        voucherId = cek.voucher.id;
        potongan = hitungPotongan(cek.voucher, biayaLunas);
        await tx.voucher.update({ where: { id: voucherId }, data: { jumlahDipakai: { increment: 1 } } });
      }
      totalBayar = (await biayaPendaftaran(jenjang, isDP, potongan)) + parseInt(kodeUnik);

      await tx.tim.create({
        data: {
          nama_tim,
          asal_sekolah,
          jenjang,
          official,
          tipe_tim,
          no_official,
          user: { connect: { id: userId } },
          pembayaran: {
            create: {
              bank,
              bukti_tf: tryUploadImage.data!.url,
              nama_rek,
              isDP,
              kodeUnik,
              totalBayar,
              voucherId,
              potongan,
            },
          },
        },
      });
    });

    notifPembayaranMasuk({
      jenis: "Pendaftaran Tim",
      pathAdmin: "/admin/pembayaran",
      nama: `${nama_tim} — ${asal_sekolah}`,
      kontak: session.user.email,
      totalBayar,
      kodeUnik,
      metodePembayaran: "TRANSFER",
      buktiUrl: tryUploadImage.data!.url,
      detail: `Jenjang ${jenjang} · ${isDP ? "DP" : "Lunas"}${kodeVoucher ? ` · Voucher ${kodeVoucher.toUpperCase()}` : ""} · ${bank} a.n. ${nama_rek}`,
    });

    revalidatePath("/", "layout");
    return { success: true, message: "Berhasil membuat Tim!" };
  } catch (e: any) {
    if (e?.message === "KUOTA_PENUH")
      return { success: false, message: `Kuota jenjang ${jenjang} telah penuh!` };
    if (typeof e?.message === "string" && e.message.startsWith("VOUCHER:"))
      return { success: false, message: `${e.message.slice(8)}. Hapus kode voucher lalu pilih ulang jenjang & tipe pembayaran.` };
    // Tim.userId sekarang @unique di database — jaring pengaman kalau dua
    // submit nyaris bersamaan lolos dari pengecekan existingTim di atas.
    if (e?.code === "P2002")
      return { success: false, message: "Akun Anda sudah memiliki tim terdaftar." };
    return { success: false, message: "Gagal membuat Tim" };
  }
}
