"use server";

import { createHash, randomBytes } from "crypto";
import prisma from "@/lib/prisma";
import { generateHash } from "@/lib/hash";
import { sendMailTo } from "@/lib/mailer";
import { batasiAksi, resetLoginGagal } from "@/lib/rateLimit";
import { findUserByEmail, normalizeEmail } from "@/queries/user.query";
import { resetPasswordTemplate } from "@/utils/emailTemplate";

const BERLAKU_MS = 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// Jawaban selalu sama untuk email terdaftar / tidak, supaya halaman ini tidak
// bisa dipakai menebak email siapa yang terdaftar (sama seperti kirim ulang verifikasi).
export async function mintaResetPassword(emailMentah: string) {
  const dibatasi = await batasiAksi("lupaPassword", 10, 60 * 60 * 1000);
  if (dibatasi) return { success: false, message: dibatasi };
  const email = normalizeEmail(emailMentah ?? "");
  if (!email) return { success: false, message: "Email wajib diisi" };

  const pesanUmum = {
    success: true,
    message: "Jika email terdaftar, link reset password sudah dikirim. Cek inbox/spam Anda.",
  };
  const user = await findUserByEmail(email);
  if (!user) return pesanUmum;

  // Token yang masih berlaku & dibuat < 60 detik lalu: diam-diam tidak kirim
  // lagi — mencegah endpoint publik ini dipakai spam email ke alamat yang sama.
  if (user.resetTokenExpiresAt && user.resetTokenExpiresAt.getTime() - Date.now() > BERLAKU_MS - RESEND_COOLDOWN_MS)
    return pesanUmum;

  try {
    const token = randomBytes(32).toString("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: hashToken(token), resetTokenExpiresAt: new Date(Date.now() + BERLAKU_MS) },
    });

    const link = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/auth/reset-password?token=${token}`;
    await sendMailTo({
      to: user.email,
      subject: "Reset Password Akun Antareja 2026",
      html: resetPasswordTemplate(user.nama, link),
    });
    return pesanUmum;
  } catch {
    return { success: false, message: "Gagal mengirim email, coba lagi nanti." };
  }
}

export async function cekTokenReset(token: string) {
  if (!token) return false;
  const user = await prisma.user.findUnique({
    where: { resetToken: hashToken(token) },
    select: { resetTokenExpiresAt: true },
  });
  return !!user?.resetTokenExpiresAt && user.resetTokenExpiresAt > new Date();
}

export async function resetPassword(token: string, password: string) {
  const dibatasi = await batasiAksi("resetPassword", 20, 60 * 60 * 1000);
  if (dibatasi) return { success: false, message: dibatasi };
  if (!password || password.length < 8 || password.length > 72)
    return { success: false, message: "Password 8–72 karakter" };

  const pesanKedaluwarsa = { success: false, message: "Link reset tidak valid atau sudah kedaluwarsa. Minta link baru." };
  if (!token) return pesanKedaluwarsa;
  const user = await prisma.user.findUnique({ where: { resetToken: hashToken(token) } });
  if (!user?.resetTokenExpiresAt || user.resetTokenExpiresAt <= new Date()) return pesanKedaluwarsa;

  try {
    // updateMany dengan syarat token yang sama: dua submit bersamaan tidak bisa
    // sama-sama memakai satu link. Link dari email membuktikan kepemilikan
    // email, jadi akun yang belum terverifikasi ikut terverifikasi.
    const { count } = await prisma.user.updateMany({
      where: { id: user.id, resetToken: user.resetToken },
      data: {
        password: generateHash(password),
        resetToken: null,
        resetTokenExpiresAt: null,
        verified: true,
        token: null,
      },
    });
    if (count === 0) return pesanKedaluwarsa;
    await resetLoginGagal(user.email);
    return { success: true };
  } catch {
    return { success: false, message: "Gagal menyimpan password, coba lagi." };
  }
}
