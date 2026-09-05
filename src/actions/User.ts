"use server";

import { revalidatePath } from "next/cache";
import { generateHash } from "@/lib/hash";
import { createUser, updateUser } from "@/queries/user.query";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/next-auth";

async function requireAdmin() {
  const session = await getServerSession();
  if (session?.user?.role !== "ADMIN") throw new Error("Forbidden");
}

export async function createStaffUser(data: FormData) {
  await requireAdmin();
  const nama = data.get("nama") as string;
  const email = data.get("email") as string;
  const password = data.get("password") as string;
  const role = data.get("role") as Role;

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
  const email = data.get("email") as string;
  const password = data.get("password") as string;
  const role = data.get("role") as Role;

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
  const email = data.get("email") as string;
  const password = (data.get("password") as string) || undefined;
  const role = data.get("role") as Role;
  const verified = data.get("verified") === "true";

  if (password && password.length < 8)
    return { success: false, message: "Password minimal 8 karakter" };

  try {
    if (password) {
      const hashedPass = generateHash(password);
      await updateUser(
        { id: id },
        {
          nama: name,
          email: email,
          password: hashedPass,
          role: role,
        }
      );
      revalidatePath("/", "layout");
      return { success: true };
    }
    await updateUser(
      { id: id },
      {
        nama: name,
        email: email,
        role: role,
        verified : verified,
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

  const nama = data.get("nama") as string;
  const password = (data.get("password") as string) || undefined;

  if (password && password.length < 8)
    return { success: false, message: "Password minimal 8 karakter" };

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
      await tx.user.delete({ where: { id } });
    });
    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { success: false };
  }
}
