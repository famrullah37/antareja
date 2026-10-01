"use server";

import { generateHash } from "@/lib/hash";
import { sendMailTo } from "@/lib/mailer";
import { createUser, findUserByEmail, normalizeEmail, updateUser } from "@/queries/user.query";
import { verifyEmailTemplate } from "@/utils/emailTemplate";
import { revalidatePath } from "next/cache";

export default async function signUp(data: FormData) {
  const email = normalizeEmail((data.get("email") as string) ?? "");
  const nama = data.get("nama") as string;
  const password = data.get("password") as string;

  if (!email || !nama || !password) {
    return { success: false, message: "Data tidak lengkap" };
  }
  if (password.length < 8) {
    return { success: false, message: "Password minimal 8 karakter" };
  }

  // Email yang sudah ada selalu ditolak, termasuk yang belum diverifikasi —
  // pemiliknya diarahkan kirim ulang verifikasi dari halaman login.
  const existing = await findUserByEmail(email);
  if (existing) {
    return {
      success: false,
      message: existing.verified
        ? "Email sudah terdaftar!"
        : "Email sudah terdaftar tapi belum diverifikasi. Cek inbox/spam, atau kirim ulang email verifikasi dari halaman login.",
    };
  }

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
      verifyTokenSentAt: new Date(),
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

const RESEND_COOLDOWN_MS = 60 * 1000;

// Dipanggil dari halaman login saat user gagal masuk karena akunnya belum
// diverifikasi — sebelumnya kalau email pertama gagal terkirim (kuota Gmail
// API dsb.), user terkunci total tanpa jalan keluar sendiri (lihat PRD §7).
// Cooldown 60 detik (dicatat di DB, bukan in-memory — tetap benar walau
// serverless instance-nya beda-beda) mencegah endpoint publik ini dipakai
// untuk spam email verifikasi berulang-ulang ke alamat yang sama.
export async function resendVerificationEmail(email: string) {
  if (!email) return { success: false, message: "Email wajib diisi" };

  // Jawaban sama untuk email yang tidak terdaftar / sudah terverifikasi,
  // supaya fitur ini tidak bisa dipakai menebak email siapa yang terdaftar.
  const pesanUmum = {
    success: true,
    message: "Jika email terdaftar dan belum terverifikasi, email verifikasi sudah dikirim ulang. Cek inbox/spam Anda.",
  };
  const user = await findUserByEmail(email);
  if (!user || user.verified) return pesanUmum;

  if (user.verifyTokenSentAt) {
    const elapsed = Date.now() - new Date(user.verifyTokenSentAt).getTime();
    // Dalam masa jeda: diam-diam tidak kirim, jawabannya tetap sama.
    if (elapsed < RESEND_COOLDOWN_MS) return pesanUmum;
  }

  try {
    const token = crypto.randomUUID();
    await updateUser({ id: user.id }, { token, verifyTokenSentAt: new Date() });

    const verifyLink = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/auth/verify?token=${token}`;
    await sendMailTo({
      to: email,
      subject: "Verifikasi Akun Antareja 2026",
      html: verifyEmailTemplate(user.nama, verifyLink),
    });

    return pesanUmum;
  } catch {
    return { success: false, message: "Gagal mengirim ulang email, coba lagi nanti." };
  }
}
