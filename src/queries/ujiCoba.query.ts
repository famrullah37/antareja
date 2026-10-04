import prisma from "@/lib/prisma";

// Untuk dashboard tim: slot terisi cukup timId & mulai — nama tim lain tidak dikirim ke browser.
export async function findSesiUjiCobaPublik() {
  return prisma.sesiUjiCoba.findMany({
    orderBy: { mulai: "asc" },
    include: { bookings: { select: { timId: true, mulai: true } } },
  });
}

// Untuk admin: lengkap dengan identitas tim di tiap slot.
export async function findSesiUjiCobaAdmin() {
  return prisma.sesiUjiCoba.findMany({
    orderBy: { mulai: "asc" },
    include: {
      bookings: {
        orderBy: { mulai: "asc" },
        include: { tim: { select: { id: true, nama_tim: true, asal_sekolah: true, jenjang: true } } },
      },
    },
  });
}

// Tim yang pembayarannya sudah diverifikasi (syarat ikut uji coba).
export async function findTimBolehUjiCoba() {
  return prisma.tim.findMany({
    where: { confirmed: true },
    orderBy: [{ jenjang: "asc" }, { nama_tim: "asc" }],
    select: { id: true, nama_tim: true, asal_sekolah: true, jenjang: true, ujiCoba: { select: { id: true } } },
  });
}
