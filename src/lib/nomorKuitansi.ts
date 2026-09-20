import prisma from "@/lib/prisma";
import { formatNomorKuitansi } from "@/lib/kuitansi";

// Nomor kuitansi = satu nomor per kuitansi yang DITERBITKAN. Generate ulang / unduh ulang untuk
// status pembayaran yang sama memakai nomor & tanggal terbit yang sama; kalau status berubah
// (DP → Lunas) terbit kuitansi baru dengan nomor baru. Nomor tidak pernah dipakai ulang.
// (Sengaja bukan server action — tidak boleh bisa dipanggil langsung dari browser.)
export async function ensureNomorKuitansi(timId: string) {
  return prisma.$transaction(async (tx) => {
    const p = await tx.pembayaran.findUnique({ where: { tim_id: timId } });
    if (!p) return null;
    if (p.nomorKuitansi && p.kuitansiTanggal && p.kuitansiIsDP === p.isDP) {
      return { nomor: p.nomorKuitansi, tanggal: p.kuitansiTanggal };
    }
    const konfig = await tx.konfigUmum.upsert({
      where: { id: "singleton" },
      update: { counterKuitansi: { increment: 1 } },
      create: { id: "singleton", counterKuitansi: 1 },
    });
    const tanggal = new Date();
    const nomor = formatNomorKuitansi(konfig.counterKuitansi, tanggal);
    await tx.pembayaran.update({
      where: { tim_id: timId },
      data: { nomorKuitansi: nomor, kuitansiTanggal: tanggal, kuitansiIsDP: p.isDP },
    });
    return { nomor, tanggal };
  });
}
