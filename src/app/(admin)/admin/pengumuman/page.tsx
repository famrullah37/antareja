export const dynamic = "force-dynamic";
import { PrimaryLinkButton } from "@/app/components/global/LinkButton";
import { H1, H2 } from "@/app/components/global/Text";
import { getPengumumans } from "@/queries/pengumuman.query";
import { findPenilaianBarus } from "@/queries/penilaianBaru.query";
import PengumumanTable from "./components/Table";
import RankingPreview from "./components/RankingPreview";

export default async function PengumumanAdminPage() {
  const [pengumumans, rankings] = await Promise.all([
    getPengumumans(),
    findPenilaianBarus({ published: true }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <H1>Pengumuman</H1>
          <PrimaryLinkButton href="/admin/pengumuman/new">New</PrimaryLinkButton>
        </div>
        <PengumumanTable data={pengumumans} />
      </div>

      <div>
        <H2 className="mb-4">Ranking Sementara (Nilai Terbesar)</H2>
        <RankingPreview rankings={rankings as any} />
      </div>
    </div>
  );
}
