import { allRecords, bySource, issuers, summary } from "@/lib/dashboard/records";
import { recentSignatures } from "@/lib/dashboard/chain";
import { PageHeader } from "@/components/dashboard/ui";
import { ExplorerCharts } from "@/components/dashboard/explorer-charts";

export const revalidate = 60;

export default async function ExplorerPage() {
  const records = allRecords();
  const showcased = records
    .filter((r) => r.programIdBase58)
    .map((r) => ({ address: r.attestation, label: r.subject }));
  const signatures = await recentSignatures(showcased, 8);

  return (
    <>
      <PageHeader
        title="Explorer"
        description="Pick a view. Every chart is drawn from the published attestation set, and the transaction list is read from devnet at request time for the four showcased accounts."
      />
      <ExplorerCharts
        records={records.map((r) => ({
          attestation: r.attestation,
          subject: r.subject,
          source: r.source,
          test: r.test,
          status: r.status,
          credential: r.credential,
          schemaVersion: r.schemaVersion,
          verificationTimestamp: r.verificationTimestamp,
          programIdBase58: r.programIdBase58,
        }))}
        sources={bySource().map((r) => ({
          test: r.test,
          label: r.label,
          attestations: r.attestations,
          programs: r.programs,
        }))}
        issuers={issuers().map((i, index) => ({
          credential: i.credential,
          label: `issuer-${index + 1}`,
          attestations: i.attestations,
        }))}
        summary={summary()}
        signatures={signatures}
      />
    </>
  );
}
