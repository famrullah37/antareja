export const dynamic = "force-dynamic";

import { getServerSession } from "@/lib/next-auth";
import { findTimsByUser } from "@/queries/tim.query";
import { redirect } from "next/navigation";
import Heading from "./components/Heading";
import ProfileTim from "./components/ProfileTim";
import { TimWithRelations } from "@/types/entityRelations";
import { findTransaksiTikets } from "@/queries/tiket.query";
import { findPenilaianBaru } from "@/queries/penilaianBaru.query";
import { findSertifikatByTim } from "@/queries/sertifikat.query";
import TiketSayaSection from "./components/TiketSayaSection";
import NilaiAkhirSection from "./components/NilaiAkhirSection";
import SertifikatSection from "./components/SertifikatSection";
import UjiCobaSection from "./components/UjiCobaSection";
import MenginapSection from "./components/MenginapSection";
import BasecampSection from "./components/BasecampSection";
import MakananSection from "./components/MakananSection";
import GrupWaSection from "./components/GrupWaSection";
import PelunasanSection from "./components/PelunasanSection";
import MenuDashboard from "./components/MenuDashboard";
import TiketWajibSection from "./components/TiketWajibSection";
import { findTikets } from "@/queries/tiket.query";
import { siapkanPelunasan } from "@/lib/pelunasan";
import { biayaPendaftaran } from "@/actions/pembayaran";
import { getKonfigUmum } from "@/queries/konfigUmum.query";
import {
  DOKUMEN_JENIS,
  dokumenUrl,
  isDokumenKey,
  type DokumenJenis,
  type DokumenKey,
  type DokumenPeserta,
} from "@/lib/dokumenPeserta";

export default async function TimDashboard() {
  const session = await getServerSession();
  if (!session) return redirect("/auth/login");

  const tims = await findTimsByUser(session.user!.id, {
    anggotas: true,
    pembayaran: true,
    penilaian: true,
  });
  if (tims.length === 0) return redirect("/form");

  const tim = tims[0] as TimWithRelations;

  const [transaksiTikets, penilaianBaru, sertifikat, biayaDasar, konfig, tiketWajib] = await Promise.all([
    findTransaksiTikets({ userId: session.user!.id }),
    findPenilaianBaru({ timId: tim.id }),
    findSertifikatByTim(tim.id),
    biayaPendaftaran(tim.jenjang, tim.pembayaran?.isDP ?? false),
    getKonfigUmum(),
    findTikets({ khususTim: true }),
  ]);
  // Jumlah tiket wajib (khususTim) milik akun tim ini, per status.
  const trWajib = transaksiTikets.filter((t) => t.tiket.khususTim);
  const tiketWajibLunas = trWajib.filter((t) => t.status === "VERIFIED").reduce((n, t) => n + t.jumlah, 0);
  const tiketWajibMenunggu = trWajib.filter((t) => t.status === "PENDING").reduce((n, t) => n + t.jumlah, 0);
  const pelunasan = tim.confirmed && tim.pembayaran?.isDP ? await siapkanPelunasan(tim.id) : null;

  // Surat undangan & surat rekomendasi Diknas sesuai jenjang tim (hanya SMP/SMA).
  const daftarDokumen = (konfig.dokumenPeserta ?? {}) as DokumenPeserta;
  const dokumen = (Object.keys(DOKUMEN_JENIS) as DokumenJenis[]).flatMap((jenis) => {
    const key = `${jenis}-${tim.jenjang}`;
    const info = isDokumenKey(key) ? daftarDokumen[key] : undefined;
    return info ? [{ jenis, label: DOKUMEN_JENIS[jenis], url: dokumenUrl(key as DokumenKey, info) }] : [];
  });

  return (
    // scroll-mt: anchor menu tidak tertutup navbar yang fixed di atas
    <div className="[&_section]:scroll-mt-28">
      <Heading />
      <MenuDashboard
        adaPelunasan={!!pelunasan}
        adaTiket={transaksiTikets.length > 0}
        adaTiketWajib={tiketWajib.length > 0}
      />
      <ProfileTim tim={tim} penilaian={tim.penilaian ?? null} biayaDasar={biayaDasar} dokumen={dokumen} />
      {pelunasan && (
        <PelunasanSection
          info={pelunasan}
          rekening={{ noRek: konfig.bankNoRek, bank: konfig.bankNama, atasNama: konfig.bankAtasNama }}
          terkirim={
            tim.pembayaran?.pelunasanBukti
              ? {
                  bukti: tim.pembayaran.pelunasanBukti,
                  bank: tim.pembayaran.pelunasanBank,
                  namaRek: tim.pembayaran.pelunasanNamaRek,
                  at: tim.pembayaran.pelunasanAt?.toISOString() ?? null,
                }
              : null
          }
        />
      )}
      <TiketWajibSection
        jenisWajib={tiketWajib.map((t) => t.jenis)}
        lunas={tiketWajibLunas}
        menunggu={tiketWajibMenunggu}
      />
      <GrupWaSection confirmed={tim.confirmed} url={konfig.grupWaUrl} />
      <BasecampSection timId={tim.id} ruanganId={tim.ruanganId} />
      <UjiCobaSection timId={tim.id} confirmed={tim.confirmed} batas={konfig.ujiCobaBatas} />
      <MenginapSection
        timId={tim.id}
        confirmed={tim.confirmed}
        aktif={konfig.menginapAktif}
        info={konfig.menginapInfo}
      />
      <MakananSection
        timId={tim.id}
        confirmed={tim.confirmed}
        aktif={konfig.makananAktif}
        info={konfig.makananInfo}
      />
      <NilaiAkhirSection penilaianBaru={penilaianBaru as any} />
      <SertifikatSection sertifikat={sertifikat as any} />
      <TiketSayaSection transaksis={transaksiTikets as any} />
    </div>
  );
}
