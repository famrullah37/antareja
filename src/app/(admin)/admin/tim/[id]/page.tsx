import { findAnggotas } from "@/queries/anggota.query";
import { findTim, findTimByParam } from "@/queries/tim.query";
import { notFound, redirect } from "next/navigation";
import TimForm from "./components/Form";
import ProfileTim from "./components/ProfileTim";
import { TimWithRelations } from "@/types/entityRelations";
import { isUuid, timSlug } from "@/lib/timSlug";

export default async function TimEdit({ params }: { params: { id: string } }) {
  const tim = await findTimByParam(params.id);
  if (!tim) return notFound();

  // URL kanonis = slug; UUID mentah dari link/bookmark lama dirapikan otomatis.
  if (isUuid(params.id)) redirect(`/admin/tim/${timSlug(tim)}`);

  const [anggotas, timLengkap] = await Promise.all([
    findAnggotas({ timId: tim.id }),
    findTim({ id: tim.id }, { anggotas: true, pembayaran: true, penilaian: true, user: true }),
  ]);

  return (
    <>
      <TimForm data={tim} edit={true} id={tim.id} dataAnggota={anggotas} />
      <ProfileTim tim={timLengkap as TimWithRelations} />
    </>
  );
}
