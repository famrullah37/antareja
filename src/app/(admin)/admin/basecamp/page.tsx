export const dynamic = "force-dynamic";

import { H1 } from "@/app/components/global/Text";
import { findRuanganAdmin, findTimPenempatan } from "@/queries/ruangan.query";
import KelolaRuangan from "./components/KelolaRuangan";
import DaftarBasecamp from "./components/DaftarBasecamp";

export default async function BasecampPage() {
  const [ruangan, tims] = await Promise.all([findRuanganAdmin(), findTimPenempatan()]);
  const sudah = tims.filter((t) => t.ruanganId).length;
  const kapasitas = ruangan.reduce((s, r) => s + r.kapasitas, 0);

  return (
    <div className="py-6 flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <H1>Basecamp Tim</H1>
        <p className="text-sm text-gray-500">
          {sudah} dari {tims.length} tim sudah mendapat ruangan · {ruangan.length} ruangan, kapasitas total{" "}
          {kapasitas} tim. Ruangan tim tampil di dashboard tim masing-masing.
        </p>
      </div>
      <KelolaRuangan ruangan={ruangan} />
      <DaftarBasecamp
        tims={tims}
        ruangan={ruangan.map((r) => ({ id: r.id, nama: r.nama, kapasitas: r.kapasitas, terisi: r._count.tims }))}
      />
    </div>
  );
}
