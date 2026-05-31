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

  const [transaksiTikets, penilaianBaru, sertifikat] = await Promise.all([
    findTransaksiTikets({ userId: session.user!.id }),
    findPenilaianBaru({ timId: tim.id }),
    findSertifikatByTim(tim.id),
  ]);

  return (
    <>
      <Heading />
      <ProfileTim tim={tim} penilaian={tim.penilaian ?? null} />
      <NilaiAkhirSection penilaianBaru={penilaianBaru as any} />
      <SertifikatSection sertifikat={sertifikat as any} />
      <TiketSayaSection transaksis={transaksiTikets as any} />
    </>
  );
}
