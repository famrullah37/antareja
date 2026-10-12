"use server";

import { revalidatePath } from "next/cache";
import { generateHash, validateHash } from "@/lib/hash";
import { createUser, findUserByEmail, normalizeEmail, updateUser } from "@/queries/user.query";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/next-auth";

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

export async function deleteUserForm(id: string) {
  try {
    await requireAdmin();
    if (await akunSendiri(id)) return { success: false, message: "Tidak bisa menghapus akun sendiri" };
    await prisma.$transaction(async (tx) => {
      const tims = await tx.tim.findMany({ where: { userId: id } });
      for (const tim of tims) {
        await tx.penilaianBaru.deleteMany({ where: { timId: tim.id } });
        await tx.penilaian.deleteMany({ where: { tim_id: tim.id } });
        await tx.tim.delete({ where: { id: tim.id } });
      }
      await tx.juri.updateMany({ where: { userId: id }, data: { userId: null } });
      await tx.transaksiTiket.updateMany({ where: { userId: id }, data: { userId: null } });
      await tx.transaksiFoto.updateMany({ where: { userId: id }, data: { userId: null } });
      await tx.transaksiVoting.updateMany({ where: { userId: id }, data: { userId: null } });
      await tx.pesananMerch.updateMany({ where: { userId: id }, data: { userId: null } });
      await tx.user.delete({ where: { id } });
    });
    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { success: false };
  }
}
