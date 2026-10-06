export const dynamic = "force-dynamic";

import { findBerita } from "@/queries/berita.query";
import { isUuid } from "@/lib/timSlug";
import { notFound } from "next/navigation";
import { H1 } from "@/app/components/global/Text";
import BeritaForm from "../components/BeritaForm";

export default async function BeritaEdit({ params }: { params: { id: string } }) {
  if (params.id === "new") {
    return (
      <div className="py-6 flex flex-col gap-8">
        <H1>Tulis Berita</H1>
        <BeritaForm />
      </div>
    );
  }

  const berita = isUuid(params.id) ? await findBerita({ id: params.id }) : null;
  if (!berita) return notFound();

  return (
    <div className="py-6 flex flex-col gap-8">
      <H1>Edit Berita</H1>
      <BeritaForm data={berita} />
    </div>
  );
}
