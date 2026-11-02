"use server";

import { revalidatePath } from "next/cache";
import { generateHash, validateHash } from "@/lib/hash";
import { createUser, findUserByEmail, normalizeEmail, updateUser } from "@/queries/user.query";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/next-auth";
import { sendMailTo } from "@/lib/mailer";
import { verifyEmailTemplate } from "@/utils/emailTemplate";
import { catatLog } from "@/lib/activityLog";
import { ringkasTimDihapus, tandaiKasTimDihapus } from "@/lib/hapusTim";

async function akunSendiri(id: string) {
  return (await getServerSession())?.user?.id === id;
}

async function requireAdmin() {
  const session = await getServerSession();
  if (session?.user?.role !== "ADMIN") throw new Error("Forbidden");
}

export async function createStaffUser(data: FormData) {
  await requireAdmin();
  const nama = data.get("nama") as string;
  const email = normalizeEmail((data.get("email") as string) ?? "");
  const password = data.get("password") as string;
  const role = data.get("role") as Role;

  if (await findUserByEmail(email)) return { success: false, message: "Email sudah terdaftar" };

  try {
    const hashedPass = generateHash(password);
    await prisma.user.create({
      data: { nama, email, password: hashedPass, role, verified: true },
    });
    revalidatePath("/admin/user");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Email sudah terdaftar" };
  }
}

export async function createUserForm(data: FormData) {
  await requireAdmin();
  const name = data.get("nama") as string;
  const email = normalizeEmail((data.get("email") as string) ?? "");
  const password = data.get("password") as string;
  const role = data.get("role") as Role;

  if (await findUserByEmail(email)) return { success: false, message: "Email sudah terdaftar" };

  try {
    const hashedPass = generateHash(password);
    await createUser({
      nama: name,
      email: email,
      password: hashedPass,
      role: role,
      verified: true,
    });
    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function updateUserForm(data: FormData, id: string) {
  await requireAdmin();
  const name = data.get("nama") as string;
  const email = normalizeEmail((data.get("email") as string) ?? "");
  const password = (data.get("password") as string) || undefined;
  const role = data.get("role") as Role;
  const verified = data.get("verified") === "true";

  if (!Object.values(Role).includes(role)) return { success: false, message: "Role tidak valid" };
  // Cegah admin mengunci dirinya sendiri keluar dari panel admin.
  if ((await akunSendiri(id)) && role !== "ADMIN")
    return { success: false, message: "Tidak bisa menurunkan role akun sendiri" };
  if (password && password.length < 8)
    return { success: false, message: "Password minimal 8 karakter" };
  if (await findUserByEmail(email, id))
    return { success: false, message: "Email sudah dipakai akun lain" };

  try {
    await updateUser(
      { id: id },
      {
        nama: name,
        email: email,
        role: role,
        verified: verified,
        // Bug lama: cabang ganti password sebelumnya tidak menyertakan
        // `verified`, jadi kalau admin ganti password & centang "Verified"
        // di submit yang sama, status verified-nya diam-diam tidak tersimpan.
        ...(password ? { password: generateHash(password) } : {}),
      }
    );
    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function updateProfileUser(data: FormData) {
  const session = await getServerSession();
  if (!session?.user?.id) return { success: false };
  const userId = session.user.id;

  const nama = ((data.get("nama") as string) || "").trim();
  const password = (data.get("password") as string) || undefined;
  const passwordLama = (data.get("passwordLama") as string) || "";

  if (!nama || nama.length > 100) return { success: false, message: "Nama tidak valid" };
  if (password && (password.length < 8 || password.length > 72))
    return { success: false, message: "Password 8–72 karakter" };
  // Ganti password wajib menyertakan password lama — sesi yang tertinggal
  // terbuka di perangkat lain tidak cukup untuk mengambil alih akun.
  if (password) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
    if (!user || !passwordLama || !validateHash(passwordLama, user.password))
      return { success: false, message: "Password lama salah" };
  }

  try {
    if (password) {
      await updateUser({ id: userId }, { nama, password: generateHash(password) });
    } else {
      await updateUser({ id: userId }, { nama });
    }
    revalidatePath("/dashboard/profile");
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function updateRoleUser(userId: string, role: Role) {
  try {
    await requireAdmin();
    if (!Object.values(Role).includes(role)) return { success: false, message: "Role tidak valid" };
    if ((await akunSendiri(userId)) && role !== "ADMIN")
      return { success: false, message: "Tidak bisa menurunkan role akun sendiri" };
    await updateUser({ id: userId }, { role });
    revalidatePath("/admin/user");
    return { success: true };
  } catch {
    return { success: false };
  }
}

// Menghapus user ikut menghapus timnya. Kalau timnya sudah terkonfirmasi,
// pemanggil harus mengulang dengan paksa=true setelah admin menyetujui
// peringatan kedua (lihat Table.tsx admin/user).
export async function deleteUserForm(id: string, paksa = false) {
  try {
    await requireAdmin();
    if (await akunSendiri(id)) return { success: false, message: "Tidak bisa menghapus akun sendiri" };
    const user = await prisma.user.findUnique({
      where: { id },
      include: { tims: { include: { pembayaran: { select: { isDP: true } } } } },
    });
    if (!user) return { success: false, message: "User tidak ditemukan" };
    const timTerkonfirmasi = user.tims.filter((t) => t.confirmed);
    if (timTerkonfirmasi.length > 0 && !paksa) {
      return {
        success: false,
        perluKonfirmasi: true,
        message: `User ini punya tim yang pembayarannya SUDAH DIKONFIRMASI: ${timTerkonfirmasi.map(ringkasTimDihapus).join("; ")}. Tim, anggota & data pembayarannya ikut terhapus permanen.`,
      };
    }
    await prisma.$transaction(async (tx) => {
      for (const tim of user.tims) {
        await tx.penilaianBaru.deleteMany({ where: { timId: tim.id } });
        await tx.penilaian.deleteMany({ where: { tim_id: tim.id } });
        await tx.tim.delete({ where: { id: tim.id } });
      }
      await tandaiKasTimDihapus(tx, user.tims.map((t) => t.id));
      await tx.juri.updateMany({ where: { userId: id }, data: { userId: null } });
      await tx.transaksiTiket.updateMany({ where: { userId: id }, data: { userId: null } });
      await tx.transaksiFoto.updateMany({ where: { userId: id }, data: { userId: null } });
      await tx.album.updateMany({ where: { fotograferId: id }, data: { fotograferId: null } });
      await tx.foto.updateMany({ where: { fotograferId: id }, data: { fotograferId: null } });
      await tx.penarikanFotografer.deleteMany({ where: { fotograferId: id } });
      await tx.transaksiVoting.updateMany({ where: { userId: id }, data: { userId: null } });
      await tx.pesananMerch.updateMany({ where: { userId: id }, data: { userId: null } });
      await tx.user.delete({ where: { id } });
    });
    const timInfo = user.tims.length ? ` | ${user.tims.map(ringkasTimDihapus).join("; ")}` : "";
    await catatLog("HAPUS_USER", `${user.nama} <${user.email}> (${user.role})${timInfo}`);
    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { success: false };
  }
}

// Untuk pendaftar yang email verifikasinya tidak sampai: admin kirim ulang
// tanpa cooldown, dan pesan error SMTP-nya ditampilkan apa adanya supaya
// panitia tahu penyebabnya (beda dengan resendVerificationEmail yang publik).
export async function kirimUlangVerifikasiAdmin(id: string) {
  try {
    await requireAdmin();
  } catch {
    return { success: false, message: "Tidak diizinkan" };
  }
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { success: false, message: "User tidak ditemukan" };
  if (user.verified) return { success: false, message: "User sudah terverifikasi" };

  const token = crypto.randomUUID();
  try {
    await updateUser({ id }, { token, verifyTokenSentAt: new Date() });
    const verifyLink = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/auth/verify?token=${token}`;
    await sendMailTo({
      to: user.email,
      subject: "Verifikasi Akun Antareja 2026",
      html: verifyEmailTemplate(user.nama, verifyLink),
    });
    revalidatePath("/admin/user");
    return { success: true };
  } catch (e) {
    await updateUser({ id }, { verifyTokenSentAt: null }).catch(() => {});
    revalidatePath("/admin/user");
    return { success: false, message: `Gagal kirim: ${e instanceof Error ? e.message : "error tidak dikenal"}` };
  }
}
