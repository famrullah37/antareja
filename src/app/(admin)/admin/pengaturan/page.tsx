export const dynamic = "force-dynamic";
import { H1 } from "@/app/components/global/Text";
import { getKonfigUmum, type TimelineItem } from "@/queries/konfigUmum.query";
import PengaturanForm from "./components/PengaturanForm";
import DokumenPesertaForm from "./components/DokumenPesertaForm";
import type { DokumenPeserta } from "@/lib/dokumenPeserta";

export default async function PengaturanPage() {
  const konfig = await getKonfigUmum();

  return (
    <div className="flex flex-col gap-6">
      <H1>Pengaturan</H1>
      <PengaturanForm konfig={{ ...konfig, timeline: konfig.timeline as TimelineItem[] | null }} />
      {/* Form terpisah (bukan bagian PengaturanForm) — tiap file diupload
          sendiri supaya tidak ikut menambah ukuran submit pengaturan umum. */}
      <DokumenPesertaForm dokumen={(konfig.dokumenPeserta ?? {}) as DokumenPeserta} />
    </div>
  );
}
