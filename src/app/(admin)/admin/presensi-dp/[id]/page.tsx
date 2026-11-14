export const dynamic = "force-dynamic";

import { findTimByParam } from "@/queries/tim.query";
import { findPresensiDPTim } from "@/queries/presensiDp.query";
import { isUuid, timSlug } from "@/lib/timSlug";
import { posisiPresensi, statusAnggota } from "@/lib/presensiDp";
import { notFound, redirect } from "next/navigation";
import PresensiTim from "./components/PresensiTim";

export default async function PresensiDPTimPage({ params }: { params: { id: string } }) {
  const t = await findTimByParam(params.id);
  if (!t) return notFound();
  if (isUuid(params.id)) redirect(`/admin/presensi-dp/${timSlug(t)}`);

  const tim = await findPresensiDPTim(t.id);
  if (!tim) return notFound();

  // Satu slot per posisi wajib — slot yang belum diisi tim tetap tampil sebagai "kosong".
  const anggotaPerPosisi = new Map(tim.anggotas.map((a) => [a.posisi as string, a]));
  const slot = posisiPresensi(tim.tipe_tim).map((posisi) => {
    const a = anggotaPerPosisi.get(posisi);
    return {
      posisi,
      anggota: a
        ? {
            id: a.id,
            nama: a.nama,
            foto: a.foto,
            nisn: a.nisn,
            kelas: a.kelas,
            tanggalLahir: a.tanggal_lahir?.toISOString().slice(0, 10) ?? null,
            status: statusAnggota(a.presensiDP),
            olehNama: a.presensiDP?.olehNama ?? null,
          }
        : null,
    };
  });

  return (
    <PresensiTim
      tim={{
        id: tim.id,
        nama_tim: tim.nama_tim,
        asal_sekolah: tim.asal_sekolah,
        jenjang: tim.jenjang,
        tipe_tim: tim.tipe_tim,
        noUrut: tim.noUrut,
        confirmed: tim.confirmed,
        foto: tim.foto,
      }}
      gugur={{
        gugurAt: tim.gugurAt?.toISOString() ?? null,
        gugurJenis: tim.gugurJenis,
        gugurAlasan: tim.gugurAlasan,
        gugurOleh: tim.gugurOleh,
        gugurTanpaVote: tim.gugurTanpaVote,
      }}
      nilaiDipublish={!!tim.penilaianBaru?.published}
      presensi={
        tim.presensiDP
          ? {
              hadirAt: tim.presensiDP.hadirAt.toISOString(),
              olehNama: tim.presensiDP.olehNama,
            }
          : null
      }
      slot={slot}
    />
  );
}
