export const dynamic = "force-dynamic";
import { H1 } from "@/app/components/global/Text";
import { getKonfigUmum } from "@/queries/konfigUmum.query";
import PengaturanForm from "./components/PengaturanForm";

export default async function PengaturanPage() {
  const konfig = await getKonfigUmum();

  return (
    <div className="flex flex-col gap-6">
      <H1>Pengaturan</H1>
      <PengaturanForm konfig={konfig} />
    </div>
  );
}
