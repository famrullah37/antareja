"use server";

import { generateHash } from "@/lib/hash";
import { sendMailTo } from "@/lib/mailer";
import { createUser, findUser, updateUser } from "@/queries/user.query";
import { verifyEmailTemplate } from "@/utils/emailTemplate";
import { revalidatePath } from "next/cache";

export default async function signUp(data: FormData) {
  const email = data.get("email") as string;
  const nama = data.get("nama") as string;
  const password = data.get("password") as string;

  if (!email || !nama || !password) {
    return { success: false, message: "Data tidak lengkap" };
  }
  if (password.length < 8) {
    return { success: false, message: "Password minimal 8 karakter" };
  }

  const existing = await findUser({ email });
  if (existing) return { success: false, message: "Email sudah terdaftar!" };

  try {
    const hashedPass = generateHash(password);
    const token = crypto.randomUUID();

    await createUser({
      email,
      nama,
      password: hashedPass,
      role: "USER",
      verified: false,
      token,
    });

    const verifyLink = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/auth/verify?token=${token}`;
    await sendMailTo({
      to: email,
      subject: "Verifikasi Akun Antareja 2026",
      html: verifyEmailTemplate(nama, verifyLink),
    }).catch(() => {
      // email failure is non-fatal; user can request resend later
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { success: false, message: "Gagal mendaftar, coba periksa kembali data Anda!" };
  }
}

// Dipanggil dari halaman login saat user gagal masuk karena akunnya belum
// diverifikasi — sebelumnya kalau email pertama gagal terkirim (kuota Gmail
// API dsb.), user terkunci total tanpa jalan keluar sendiri (lihat PRD §7).
export async function resendVerificationEmail(email: string) {
  if (!email) return { success: false, message: "Email wajib diisi" };

  const user = await findUser({ email });
  if (!user) return { success: false, message: "Email tidak ditemukan" };
  if (user.verified) return { success: false, message: "Akun sudah terverifikasi, silakan login." };

  try {
    const token = crypto.randomUUID();
    await updateUser({ id: user.id }, { token });

    const verifyLink = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/auth/verify?token=${token}`;
    await sendMailTo({
      to: email,
      subject: "Verifikasi Akun Antareja 2026",
      html: verifyEmailTemplate(user.nama, verifyLink),
    });

    return { success: true, message: "Email verifikasi sudah dikirim ulang, cek inbox/spam Anda." };
  } catch {
    return { success: false, message: "Gagal mengirim ulang email, coba lagi nanti." };
  }
}
