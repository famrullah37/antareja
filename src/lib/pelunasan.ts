import prisma from "@/lib/prisma";
import { biayaPendaftaran } from "@/actions/pembayaran";
import { Jenjang } from "@prisma/client";

export type InfoPelunasan = {
  sisa: number; // biaya lunas - biaya DP, tanpa kode unik
  kodeUnik: string;
  total: number; // yang harus ditransfer = sisa + kode unik
};

export async function sisaPelunasan(jenjang: Jenjang) {
  const [lunas, dp] = await Promise.all([biayaPendaftaran(jenjang, false), biayaPendaftaran(jenjang, true)]);
  return Math.max(lunas - dp, 0);
}

// Dipanggil dari dashboard tim yang sudah terkonfirmasi DP: cadangkan kode unik
// pelunasan sekali saja (nominal harus tetap sama tiap kali dashboard dibuka,
// karena peserta bisa sudah transfer). Kode diambil dari counter yang sama
// dengan pendaftaran, dan tidak boleh bentrok dengan kode pelunasan tim lain.
export async function siapkanPelunasan(timId: string): Promise<InfoPelunasan | null> {
  const tim = await prisma.tim.findUnique({ where: { id: timId }, include: { pembayaran: true } });
  const p = tim?.pembayaran;
  if (!tim?.confirmed || !p?.isDP) return null;

  if (p.pelunasanKodeUnik && p.pelunasanTotal != null) {
    return { sisa: p.pelunasanTotal - parseInt(p.pelunasanKodeUnik, 10), kodeUnik: p.pelunasanKodeUnik, total: p.pelunasanTotal };
  }

  const sisa = await sisaPelunasan(tim.jenjang);
  for (let i = 0; i < 20; i++) {
    const updated = await prisma.konfigUmum.update({
      where: { id: "singleton" },
      data: { counterUrutPendaftaran: { increment: 1 } },
    });
    const kodeUnik = String(updated.counterUrutPendaftaran % 1000).padStart(3, "0");
    const dipakai = await prisma.pembayaran.findFirst({ where: { pelunasanKodeUnik: kodeUnik } });
    if (dipakai) continue;
    // Hanya mengisi kalau masih kosong — dua tab dashboard yang terbuka
    // bersamaan tidak boleh menghasilkan dua nominal berbeda.
    await prisma.pembayaran.updateMany({
      where: { tim_id: timId, pelunasanKodeUnik: null },
      data: { pelunasanKodeUnik: kodeUnik, pelunasanTotal: sisa + parseInt(kodeUnik, 10) },
    });
    const akhir = await prisma.pembayaran.findUnique({ where: { tim_id: timId } });
    if (!akhir?.pelunasanKodeUnik || akhir.pelunasanTotal == null) return null;
    return {
      sisa: akhir.pelunasanTotal - parseInt(akhir.pelunasanKodeUnik, 10),
      kodeUnik: akhir.pelunasanKodeUnik,
      total: akhir.pelunasanTotal,
    };
  }
  return null;
}
