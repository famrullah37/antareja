export const dynamic = "force-dynamic";

import { H1 } from "@/app/components/global/Text";
import { getServerSession } from "@/lib/next-auth";
import { formatTanggalWib } from "@/app/(main)/merchandise/format";
import type { ItemMakanan } from "@/lib/makanan";
import { getKonfigUmum } from "@/queries/konfigUmum.query";
import { findPesananMakananAdmin, findSesiMakanAdmin } from "@/queries/makanan.query";
import PengaturanMakanan from "./components/PengaturanMakanan";
import SesiMenuMakanan from "./components/SesiMenuMakanan";
import PesananMakananTable from "./components/PesananMakananTable";

export default async function AdminMakananPage() {
  const [session, konfig, sesi, pesanan] = await Promise.all([
    getServerSession(),
    getKonfigUmum(),
    findSesiMakanAdmin(),
    findPesananMakananAdmin(),
  ]);
  const bolehVerifikasi = ["ADMIN", "BENDAHARA"].includes(session?.user?.role ?? "");

  // Rekap per sesi: porsi per menu dari pesanan lunas (VERIFIED/DIAMBIL) — angka
  // yang dipesan ke katering; porsi yang masih menunggu verifikasi ditampilkan terpisah.
  const rekap = sesi.map((s) => {
    const menu = new Map<string, { nama: string; lunas: number; menunggu: number }>();
    let totalMasuk = 0;
    for (const p of pesanan) {
      if (p.sesiId !== s.id) continue;
      const lunas = p.status === "VERIFIED" || p.status === "DIAMBIL";
      if (!lunas && p.status !== "PENDING") continue;
      if (lunas) totalMasuk += p.totalBayar;
      for (const i of p.items as ItemMakanan[]) {
        const r = menu.get(i.nama) ?? { nama: i.nama, lunas: 0, menunggu: 0 };
        if (lunas) r.lunas += i.jumlah;
        else r.menunggu += i.jumlah;
        menu.set(i.nama, r);
      }
    }
    return { id: s.id, nama: s.nama, waktu: s.waktu, totalMasuk, menu: Array.from(menu.values()) };
  });
  const menunggu = pesanan.filter((p) => p.status === "PENDING").length;

  return (
    <div className="py-6 flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <H1>Pemesanan Makanan</H1>
        <p className="text-sm text-gray-500">
          {pesanan.length} pesanan · {menunggu} menunggu verifikasi
        </p>
      </div>

      <PengaturanMakanan aktif={konfig.makananAktif} info={konfig.makananInfo} />

      <SesiMenuMakanan sesi={sesi} />

      <div>
        <h2 className="text-xl font-semibold mb-1">Rekap Porsi per Sesi</h2>
        <p className="text-sm text-gray-500 mb-3">Porsi lunas = yang dipesan ke katering.</p>
        {rekap.every((r) => r.menu.length === 0) ? (
          <p className="text-gray-400 text-sm">Belum ada pesanan.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rekap
              .filter((r) => r.menu.length > 0)
              .map((r) => (
                <div key={r.id} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                  <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                    <div className="font-semibold">{r.nama}</div>
                    <div className="text-xs text-gray-500">
                      {formatTanggalWib(r.waktu)} · Pemasukan Rp{r.totalMasuk.toLocaleString("id-ID")}
                    </div>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="text-neutral-500">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Menu</th>
                        <th className="px-4 py-2 text-right font-medium">Lunas</th>
                        <th className="px-4 py-2 text-right font-medium">Menunggu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {r.menu.map((m) => (
                        <tr key={m.nama}>
                          <td className="px-4 py-2">{m.nama}</td>
                          <td className="px-4 py-2 text-right font-semibold">{m.lunas}</td>
                          <td className="px-4 py-2 text-right text-gray-400">{m.menunggu}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Pesanan</h2>
        <PesananMakananTable
          bolehVerifikasi={bolehVerifikasi}
          sesi={sesi.map((s) => ({ id: s.id, nama: s.nama }))}
          pesanan={pesanan.map((p) => ({
            id: p.id,
            sesiId: p.sesiId,
            sesiNama: p.sesi.nama,
            namaTim: p.tim.nama_tim,
            asalSekolah: p.tim.asal_sekolah,
            jenjang: p.tim.jenjang,
            noHp: p.tim.no_official ?? p.tim.no_pelatih ?? "",
            items: p.items as ItemMakanan[],
            totalBayar: p.totalBayar,
            kodeUnik: p.kodeUnik,
            bukti: p.bukti,
            catatan: p.catatan,
            catatanAdmin: p.catatanAdmin,
            status: p.status,
            createdAt: p.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
