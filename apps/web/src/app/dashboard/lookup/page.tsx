import { PageHeader } from "@/components/dashboard/ui";
import { LookupPanel } from "@/components/dashboard/lookup-panel";

export default async function LookupPage({
  searchParams,
}: {
  searchParams: Promise<{ program?: string }>;
}) {
  const { program } = await searchParams;
  return (
    <>
      <PageHeader
        title="Lookup"
        description="Runs the stateless aggregator against devnet: one getProgramAccounts call with memcmp filters on the discriminator and the programId, then schema resolution and decoding for every record found."
      />
      <LookupPanel initialProgram={program ?? ""} />
    </>
  );
}
