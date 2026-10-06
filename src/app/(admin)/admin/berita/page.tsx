export const dynamic = "force-dynamic";

import { findBeritas } from "@/queries/berita.query";
import { H1 } from "@/app/components/global/Text";
import { PrimaryLinkButton } from "@/app/components/global/LinkButton";
import BeritaTable from "./components/BeritaTable";

export default async function BeritaPage() {
  const beritas = await findBeritas();

  return (
    <div className="py-6 flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <H1>Berita</H1>
        <PrimaryLinkButton href="/admin/berita/new">Tulis Berita</PrimaryLinkButton>
      </div>
      <BeritaTable data={beritas} />
    </div>
  );
}
