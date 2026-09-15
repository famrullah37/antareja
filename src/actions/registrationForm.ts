"use server";
import { Jenjang, Tipe } from "@prisma/client";
import { imageUploader, validateUploadFile } from "./fileUploader";
import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/next-auth";
import prisma from "@/lib/prisma";

const VALID_JENJANG: Jenjang[] = ["SD", "SMP", "SMA"];
const VALID_TIPE: Tipe[] = ["SMALL", "NORMAL"];

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

  if (!nama_tim || !pelatih || !asal_sekolah || !no_pelatih || !bank || !nama_rek)
    return { success: false, message: "Mohon lengkapi semua data" };
  if (!VALID_JENJANG.includes(jenjang)) return { success: false, message: "Jenjang tidak valid" };
  if (!VALID_TIPE.includes(tipe_tim)) return { success: false, message: "Jumlah pasukan tidak valid" };

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
      const timCount = await tx.tim.count({ where: { jenjang, confirmed: true } });
      if (timCount >= 30) throw new Error("KUOTA_PENUH");

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
              isDP: tipe_pembayaran === "TRUE",
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
