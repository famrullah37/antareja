export const dynamic = "force-dynamic";
import { findTikets } from "@/queries/tiket.query";
import { H1 } from "@/app/components/global/Text";
import JualOfflineForm from "../components/JualOfflineForm";

export default async function POSPage() {
  const tikets = await findTikets();

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <H1>POS — Jual Langsung</H1>
      <JualOfflineForm tikets={tikets as any} />
    </div>
  );
}
