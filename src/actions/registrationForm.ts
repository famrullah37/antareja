"use server";
import { Jenjang, PrismaClient, Tipe } from "@prisma/client";
import { imageUploader, validateUploadFile } from "./fileUploader";
import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/next-auth";
import prisma from "@/lib/prisma";
import { biayaPendaftaran } from "./pembayaran";

const VALID_JENJANG: Jenjang[] = ["SD", "SMP", "SMA", "PURNA"];
const VALID_TIPE: Tipe[] = ["SMALL", "NORMAL"];

// Batas maksimal tim per jenjang, dikonfigurasi admin lewat /admin/pengaturan
// (KonfigUmum.kuotaSD/SMP/SMA/Purna). null berarti tidak dibatasi. Menerima
// client Prisma biasa ATAU transaksi (tx) supaya bisa dipakai atomic di
// submitFormRegistrasi.
async function getKuotaJenjang(
  client: Pick<PrismaClient, "konfigUmum">,
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
export async function reserveKodePendaftaran(jenjang: Jenjang, isDP: boolean) {
  if (!VALID_JENJANG.includes(jenjang)) return { success: false, message: "Jenjang tidak valid" };

  const kuota = await getKuotaJenjang(prisma, jenjang);
  if (kuota !== null) {
    const timCount = await prisma.tim.count({ where: { jenjang, confirmed: true } });
    if (timCount >= kuota) return { success: false, message: `Kuota jenjang ${jenjang} telah penuh!` };
  }

  try {
    const updated = await prisma.konfigUmum.update({
      where: { id: "singleton" },
      data: { counterUrutPendaftaran: { increment: 1 } },
    });
    const kodeUnik = String(updated.counterUrutPendaftaran % 1000).padStart(3, "0");
    const hargaDasar = await biayaPendaftaran(jenjang, isDP);
    const totalBayar = hargaDasar + parseInt(kodeUnik);
    return { success: true, kodeUnik, hargaDasar, totalBayar };
  } catch (e) {
    console.error("reserveKodePendaftaran error:", e);
    return { success: false, message: "Gagal menyiapkan kode pembayaran" };
  }
}

export default async function submitFormRegistrasi(data: FormData) {
  const session = await getServerSession();
  if (!session?.user?.id) return { success: false, message: "Anda harus login terlebih dahulu" };
  const userId = session.user.id;

  const nama_tim = data.get("namatim") as string;
  const pelatih = data.get("pelatih") as string;
  const asal_sekolah = data.get("asal") as string;
  const jenjang = data.get("jenjang") as Jenjang;
  const tipe_tim = data.get("size") as Tipe;
  const bukti = data.get("bukti") as File;
  const bank = data.get("namabank") as string;
  const nama_rek = data.get("namarek") as string;
  const tipe_pembayaran = data.get("tipe-pembayaran") as string;
  const no_pelatih = data.get("no-pelatih") as string;
  const kodeUnik = data.get("kodeUnik") as string;
  const isDP = tipe_pembayaran === "TRUE";

  if (!nama_tim || !pelatih || !asal_sekolah || !no_pelatih || !bank || !nama_rek)
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

  const hargaDasar = await biayaPendaftaran(jenjang, isDP);
  const totalBayar = hargaDasar + parseInt(kodeUnik);

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

      await tx.tim.create({
        data: {
          nama_tim,
          asal_sekolah,
          jenjang,
          pelatih,
          tipe_tim,
          no_pelatih,
          user: { connect: { id: userId } },
          pembayaran: {
            create: {
              bank,
              bukti_tf: tryUploadImage.data!.url,
              nama_rek,
              isDP,
              kodeUnik,
              totalBayar,
            },
          },
        },
      });
    });

    revalidatePath("/", "layout");
    return { success: true, message: "Berhasil membuat Tim!" };
  } catch (e: any) {
    if (e?.message === "KUOTA_PENUH")
      return { success: false, message: `Kuota jenjang ${jenjang} telah penuh!` };
    // Tim.userId sekarang @unique di database — jaring pengaman kalau dua
    // submit nyaris bersamaan lolos dari pengecekan existingTim di atas.
    if (e?.code === "P2002")
      return { success: false, message: "Akun Anda sudah memiliki tim terdaftar." };
    return { success: false, message: "Gagal membuat Tim" };
  }
}
