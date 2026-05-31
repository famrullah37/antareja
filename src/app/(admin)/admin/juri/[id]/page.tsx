import { findJuri } from "@/queries/juri.query";
import { notFound } from "next/navigation";
import JuriForm from "./components/Form";

export default async function JuriEditPage({ params }: { params: { id: string } }) {
  if (params.id === "new") {
    return <JuriForm />;
  }

  const juri = await findJuri({ id: params.id });
  if (!juri) return notFound();

  return <JuriForm data={juri} edit id={params.id} />;
}
