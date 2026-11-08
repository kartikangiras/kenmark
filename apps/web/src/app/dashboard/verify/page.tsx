import { PageHeader } from "@/components/dashboard/ui";
import { VerifyPanel } from "@/components/dashboard/verify-panel";

export default function VerifyPage() {
  return (
    <>
      <PageHeader
        title="Verify"
        description="Read what devnet holds right now. A program ID returns every attestation about it; a credential returns the issuer account and everything published under it; a wallet lists the credentials it controls. Nothing here is stored by Kenmark."
      />
      <VerifyPanel />
    </>
  );
}
