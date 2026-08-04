"use server";

import { generateHash } from "@/lib/hash";
import { sendMailTo } from "@/lib/mailer";
import { createUser, findUser } from "@/queries/user.query";
import { verifyEmailTemplate } from "@/utils/emailTemplate";
import { revalidatePath } from "next/cache";

export default async function signUp(data: FormData) {
  const email = data.get("email") as string;
  const nama = data.get("nama") as string;
  const password = data.get("password") as string;

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
