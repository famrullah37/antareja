export const dynamic = "force-dynamic";
import { findTims } from "@/queries/tim.query";
import { H1 } from "@/app/components/global/Text";
import TimTable from "./components/Table";
import ExportDataTimButton from "./components/ExportDataTimButton";

export default async function Tim() {
  const tims = await findTims();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <H1>Tim</H1>
        <ExportDataTimButton label="Unduh Data Semua Tim (Excel)" />
      </div>
      <div className="mt-4">
        <TimTable data={tims} />
      </div>
    </div>
  );
}
