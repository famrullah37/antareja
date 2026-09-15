export const dynamic = "force-dynamic";
import { H1 } from "@/app/components/global/Text";
import { getKonfigUmum, type TimelineItem } from "@/queries/konfigUmum.query";
import PengaturanForm from "./components/PengaturanForm";

export default async function PengaturanPage() {
  const konfig = await getKonfigUmum();

  return (
    <div className="flex flex-col gap-6">
      <H1>Pengaturan</H1>
      <PengaturanForm konfig={{ ...konfig, timeline: konfig.timeline as TimelineItem[] | null }} />
    </div>
  );
}
