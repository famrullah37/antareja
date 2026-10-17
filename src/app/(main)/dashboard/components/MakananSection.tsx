import { H2 } from "@/app/components/global/Text";
import SectionWrapper from "@/app/components/global/Wrapper";
import { sesiTerbuka, type ItemMakanan } from "@/lib/makanan";
import { findPesananMakananByTim, findSesiMakanTim } from "@/queries/makanan.query";
import { findKonfigTiket } from "@/queries/tiket.query";
import FormMakanan from "./parts/FormMakanan";

// Pemesanan makanan: tampil kalau panitia membuka pemesanan (KonfigUmum.makananAktif)
// atau tim sudah pernah memesan (statusnya tetap terlihat).
export default async function MakananSection({
  timId,
  confirmed,
  aktif,
  info,
}: {
  timId: string;
  confirmed: boolean;
  aktif: boolean;
  info: string | null;
}) {
  const [pesanan, sesiList, konfigTiket] = await Promise.all([
    findPesananMakananByTim(timId),
    aktif ? findSesiMakanTim() : [],
    findKonfigTiket(),
  ]);
  if (!aktif && pesanan.length === 0) return null;

  const sesiTersedia = sesiList
    .filter((s) => sesiTerbuka(s) && s.menus.length > 0)
    .map((s) => ({
      id: s.id,
      nama: s.nama,
      waktu: s.waktu.toISOString(),
      batasPesan: (s.batasPesan ?? s.waktu).toISOString(),
      menus: s.menus.map((m) => ({ id: m.id, nama: m.nama, deskripsi: m.deskripsi, harga: m.harga })),
    }));

  return (
    <SectionWrapper id="makanan">
      <H2 className="mb-2">Pemesanan Makanan</H2>
      {!confirmed ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-4 text-sm">
          Pemesanan makanan dibuka setelah pembayaran tim diverifikasi panitia.
        </div>
      ) : (
        <>
          {info && <p className="text-sm text-gray-500 mb-4 whitespace-pre-line">{info}</p>}
          <FormMakanan
            aktif={aktif}
            sesi={sesiTersedia}
            qrisUrl={konfigTiket?.qrisUrl ?? null}
            pesanan={pesanan.map((p) => ({
              id: p.id,
              sesiNama: p.sesi.nama,
              sesiWaktu: p.sesi.waktu.toISOString(),
              items: p.items as ItemMakanan[],
              totalBayar: p.totalBayar,
              kodeUnik: p.kodeUnik,
              catatan: p.catatan,
              status: p.status,
              catatanAdmin: p.catatanAdmin,
            }))}
          />
        </>
      )}
    </SectionWrapper>
  );
}
