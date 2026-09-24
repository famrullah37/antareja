import prisma from "@/lib/prisma";

// Dibatasi 500 baris terbaru — log ini bisa tumbuh cepat (login + tiap aksi
// verifikasi/tolak), belum perlu paginasi penuh di iterasi pertama ini.
export async function getActivityLogs() {
  return prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });
}
