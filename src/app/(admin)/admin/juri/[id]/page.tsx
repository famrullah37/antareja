import { findJuri } from "@/queries/juri.query";
import { findJuriKategoris, findKategoriLombas } from "@/queries/penilaianBaru.query";
import { resolveJuriId } from "@/queries/slug.query";
import { makeSlug, isUuid } from "@/lib/timSlug";
import { notFound, redirect } from "next/navigation";
import JuriForm from "./components/Form";

export default async function JuriEditPage({ params }: { params: { id: string } }) {
  const kategoris = (await findKategoriLombas()).map((k) => k.nama);

  if (params.id === "new") {
    return <JuriForm kategoris={kategoris} />;
  }

  const id = await resolveJuriId(params.id);
  const juri = id ? await findJuri({ id }) : null;
  if (!juri) return notFound();

  // URL kanonis = slug; UUID mentah dari link/bookmark lama dirapikan otomatis.
  if (isUuid(params.id)) redirect(`/admin/juri/${makeSlug(juri.nama, juri.id, "juri")}`);

  const terpilih = (await findJuriKategoris({ juriId: juri.id })).map((jk) => jk.kategori);

  return <JuriForm data={juri} edit id={juri.id} kategoris={kategoris} terpilih={terpilih} />;
}
