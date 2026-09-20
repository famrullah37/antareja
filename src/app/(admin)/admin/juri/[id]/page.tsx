import { findJuri } from "@/queries/juri.query";
import { resolveJuriId } from "@/queries/slug.query";
import { makeSlug, isUuid } from "@/lib/timSlug";
import { notFound, redirect } from "next/navigation";
import JuriForm from "./components/Form";

export default async function JuriEditPage({ params }: { params: { id: string } }) {
  if (params.id === "new") {
    return <JuriForm />;
  }

  const id = await resolveJuriId(params.id);
  const juri = id ? await findJuri({ id }) : null;
  if (!juri) return notFound();

  // URL kanonis = slug; UUID mentah dari link/bookmark lama dirapikan otomatis.
  if (isUuid(params.id)) redirect(`/admin/juri/${makeSlug(juri.nama, juri.id, "juri")}`);

  return <JuriForm data={juri} edit id={juri.id} />;
}
