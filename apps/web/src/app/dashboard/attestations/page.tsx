import { allRecords } from "@/lib/dashboard/records";
import { PageHeader } from "@/components/dashboard/ui";
import { AttestationsTable } from "@/components/dashboard/attestations-table";

export default async function AttestationsPage({
  searchParams,
}: {
  searchParams: Promise<{ test?: string; status?: string }>;
}) {
  const params = await searchParams;
  const records = allRecords();
  return (
    <>
      <PageHeader
        title="Attestations"
        description="Every attestation the validation suite and the registry cross-check published on devnet. Each row is a real account you can open in Solana Explorer."
      />
      <AttestationsTable
        records={records}
        initialTest={params.test}
        initialStatus={params.status}
      />
    </>
  );
}
