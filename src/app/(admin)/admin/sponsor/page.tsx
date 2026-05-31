export const dynamic = "force-dynamic";

import { findSponsors } from "@/queries/sponsor.query";
import { H1 } from "@/app/components/global/Text";
import SponsorForm from "./components/SponsorForm";
import SponsorTable from "./components/SponsorTable";

export default async function SponsorPage() {
  const sponsors = await findSponsors();

  return (
    <div className="py-6 flex flex-col gap-8">
      <H1>Sponsor & Media Partner</H1>
      <SponsorForm />
      <SponsorTable data={sponsors} />
    </div>
  );
}
