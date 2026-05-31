export const dynamic = "force-dynamic";
import { findJuris } from "@/queries/juri.query";
import { PrimaryLinkButton } from "@/app/components/global/LinkButton";
import { H1 } from "@/app/components/global/Text";
import JuriTable from "./components/Table";

export default async function JuriPage() {
  const juris = await findJuris();

  return (
    <div className="py-6">
      <div className="flex items-center justify-between">
        <H1>Juri</H1>
        <PrimaryLinkButton href="/admin/juri/new">New</PrimaryLinkButton>
      </div>
      <div className="mt-4">
        <JuriTable data={juris} />
      </div>
    </div>
  );
}
