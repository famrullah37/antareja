import { findAnggotas } from "@/queries/anggota.query";
import { findTim, findTimByParam } from "@/queries/tim.query";
import { notFound, redirect } from "next/navigation";
import TimForm from "./components/Form";
import ProfileTim from "./components/ProfileTim";
import { TimWithRelations } from "@/types/entityRelations";
import { isUuid, timSlug } from "@/lib/timSlug";
import prisma from "@/lib/prisma";
import StatusGugurTim from "../../components/StatusGugurTim";

export default async function TimEdit({ params }: { params: { id: string } }) {
  const tim = await findTimByParam(params.id);
  if (!tim) return notFound();

  // URL kanonis = slug; UUID mentah dari link/bookmark lama dirapikan otomatis.
  if (isUuid(params.id)) redirect(`/admin/tim/${timSlug(tim)}`);

  const [anggotas, timLengkap, status] = await Promise.all([
    findAnggotas({ timId: tim.id }),
    findTim({ id: tim.id }, { anggotas: true, pembayaran: true, penilaian: true, user: true }),
    prisma.tim.findUnique({
      where: { id: tim.id },
      select: { presensiDP: { select: { id: true } }, penilaianBaru: { select: { published: true } } },
    }),
  ]);

  return (
    <>
      {/* Mengundurkan diri (bisa jauh hari) / tidak hadir — lihat lib/gugurTim.ts. */}
      <div className="mb-4 flex flex-col">
        <StatusGugurTim
          timId={tim.id}
          namaTim={tim.nama_tim}
          confirmed={tim.confirmed}
          sudahPresensi={!!status?.presensiDP}
          nilaiDipublish={!!status?.penilaianBaru?.published}
          data={{
            gugurAt: tim.gugurAt?.toISOString() ?? null,
            gugurJenis: tim.gugurJenis,
            gugurAlasan: tim.gugurAlasan,
            gugurOleh: tim.gugurOleh,
            gugurTanpaVote: tim.gugurTanpaVote,
          }}
        />
      </div>
      <TimForm data={tim} edit={true} id={tim.id} dataAnggota={anggotas} />
      <ProfileTim tim={timLengkap as TimWithRelations} />
    </>
  );
}
