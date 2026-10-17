import prisma from "@/lib/prisma";
import { getKonfigUmum } from "@/queries/konfigUmum.query";
import InfoPopupClient, { type KuotaJenjang } from "./parts/InfoPopupClient";

// Popup informasi saat beranda dibuka — diatur admin di Pengaturan
// (popupAktif/Judul/Isi/TampilKuota). Sisa kuota memakai hitungan yang sama
// dengan pengecekan pendaftaran: tim terkonfirmasi per jenjang (lihat
// getKuotaJenjang di registrationForm.ts).
export default async function InfoPopup() {
  const konfig = await getKonfigUmum();
  if (!konfig.popupAktif) return null;

  let kuota: KuotaJenjang[] = [];
  if (konfig.popupTampilKuota) {
    const counts = await prisma.tim.groupBy({ by: ["jenjang"], where: { confirmed: true }, _count: { _all: true } });
    const terisi = (j: string) => counts.find((c) => c.jenjang === j)?._count._all ?? 0;
    kuota = [
      { label: "SD", jenjang: "SD", aktif: konfig.sdAktif, kuota: konfig.kuotaSD },
      { label: "SMP", jenjang: "SMP", aktif: konfig.smpAktif, kuota: konfig.kuotaSMP },
      { label: "SMA", jenjang: "SMA", aktif: konfig.smaAktif, kuota: konfig.kuotaSMA },
      { label: "Purna", jenjang: "PURNA", aktif: konfig.purnaAktif, kuota: konfig.kuotaPurna },
    ]
      .filter((j) => j.aktif)
      .map((j) => ({ label: j.label, kuota: j.kuota, terisi: terisi(j.jenjang) }));
  }

  const deadline = konfig.popupTampilKuota ? konfig.pendaftaranDeadline : null;

  // Kunci "sudah ditutup" ikut berubah kalau isi popup diubah admin, supaya
  // pengumuman baru tetap muncul ke pengunjung yang sudah pernah menutupnya.
  const kunci = [konfig.popupJudul, konfig.popupIsi, konfig.popupTampilKuota].join("|");

  return (
    <InfoPopupClient
      judul={konfig.popupJudul}
      isi={konfig.popupIsi}
      kuota={kuota}
      deadline={deadline ? deadline.toISOString() : null}
      kunci={kunci}
    />
  );
}
