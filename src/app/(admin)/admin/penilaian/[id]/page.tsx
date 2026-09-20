import { findPenilaian } from "@/queries/penilaian.query";
import { resolvePenilaianId } from "@/queries/slug.query";
import { makeSlug, isUuid } from "@/lib/timSlug";
import { notFound, redirect } from "next/navigation";
import { findTims } from "@/queries/tim.query";
import PenilaianForm from "./components/Form";

export default async function UserEdit({ params }: { params: { id: string } }) {
  if (params.id === "new") {
    const trygetTims = await findTims({ penilaian: null });
    return <PenilaianForm tims={trygetTims} />;
  }

  const id = await resolvePenilaianId(params.id);
  const penilaian = id ? await findPenilaian({ id }) : null;
  if (!penilaian) return notFound();

  const trygetTims = await findTims();
  // URL kanonis = slug (nama tim + id penilaian); UUID lama di-redirect.
  if (isUuid(params.id)) {
    const tim = trygetTims.find((t) => t.id === penilaian.tim_id);
    redirect(`/admin/penilaian/${makeSlug(tim?.nama_tim ?? "", penilaian.id, "penilaian")}`);
  }

  return <PenilaianForm data={penilaian} edit={true} id={penilaian.id} tims={trygetTims} />;
}
