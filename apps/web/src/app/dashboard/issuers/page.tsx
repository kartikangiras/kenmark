import { issuers } from "@/lib/dashboard/records";
import { credentialDetails, onChainCounts } from "@/lib/dashboard/chain";
import { explorerAddressUrl, SAS_URL } from "@/lib/site";
import {
  Address,
  ArrowLink,
  BlackCard,
  Card,
  CardTitle,
  EmptyNote,
  Kpi,
  PageHeader,
} from "@/components/dashboard/ui";
import { IssuerLookup } from "@/components/dashboard/issuer-lookup";

export const revalidate = 60;

export default async function IssuersPage() {
  const list = issuers();
  const credentials = list.map((i) => i.credential);
  const [details, live] = await Promise.all([
    credentialDetails(credentials),
    onChainCounts(credentials),
  ]);

  return (
    <>
      <PageHeader
        title="Issuers"
        description="Each issuer is a Solana Attestation Service credential. Check any credential or wallet below, or scroll to Kenmark's own two issuers, whose authority and name are read from the chain on every refresh."
      />

      <div className="mb-8">
        <IssuerLookup
          presets={list.map((i, index) => ({
            label:
              details?.find((d) => d.credential === i.credential)?.name ?? `issuer-${index + 1}`,
            credential: i.credential,
          }))}
        />
      </div>

      {!details && (
        <div className="mb-6 text-sm">
          <EmptyNote>
            Devnet RPC did not answer, so the live authority and counts are hidden. The artifact
            columns still reflect the last recorded run.
          </EmptyNote>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {list.map((issuer, index) => {
          const detail = details?.find((d) => d.credential === issuer.credential);
          const liveCount = live?.byCredential[issuer.credential];
          return (
            <Card
              key={issuer.credential}
              data-testid="issuer-card"
              data-credential={issuer.credential}
              data-authority={detail?.authority ?? ""}
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{detail?.name ?? issuer.label}</CardTitle>
                  <p className="mt-1 text-sm text-db-card-muted">
                    Issuer {index + 1} · SAS credential
                  </p>
                </div>
                <ArrowLink
                  href={explorerAddressUrl(issuer.credential)}
                  label="Open credential in Solana Explorer"
                />
              </div>

              <div className="mb-8 grid grid-cols-2 gap-4">
                <Kpi
                  testId="issuer-artifact"
                  value={String(issuer.attestations)}
                  label="In the artifact"
                  tone="flat"
                />
                <Kpi
                  testId="issuer-live"
                  value={liveCount === undefined ? "—" : String(liveCount)}
                  label="Live on devnet"
                  delta={
                    liveCount === undefined
                      ? undefined
                      : liveCount > issuer.attestations
                        ? `+${liveCount - issuer.attestations} from other runs`
                        : "matches"
                  }
                  tone="up"
                />
              </div>

              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-db-card-muted">Credential</dt>
                  <dd>
                    <Address
                      value={issuer.credential}
                      href={explorerAddressUrl(issuer.credential)}
                      lead={8}
                      tail={6}
                    />
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-db-card-muted">Authority</dt>
                  <dd>
                    {detail?.authority ? (
                      <Address
                        value={detail.authority}
                        href={explorerAddressUrl(detail.authority)}
                        lead={8}
                        tail={6}
                      />
                    ) : (
                      <span className="text-db-card-muted">unavailable</span>
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-db-card-muted">Authorized signers</dt>
                  <dd>{detail ? detail.authorizedSigners.length : "—"}</dd>
                </div>
                {issuer.schemas.map((schema) => (
                  <div key={schema.address} className="flex items-center justify-between gap-4">
                    <dt className="text-db-card-muted">Schema v{schema.version}</dt>
                    <dd>
                      <Address
                        value={schema.address}
                        href={explorerAddressUrl(schema.address)}
                        lead={8}
                        tail={6}
                      />
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          );
        })}
      </div>

      <BlackCard className="mt-4">
        <CardTitle className="mb-3">How issuers work</CardTitle>
        <p className="max-w-3xl text-sm leading-relaxed text-white/70">
          Anyone can publish under their own credential; Kenmark does not decide who may attest. The
          credential PDA is derived from the authority and the credential name, and each schema PDA
          from the credential and the predicate name, so an issuer&apos;s attestations are
          attributable without a registry. Both issuers here were provisioned by{" "}
          <code className="font-mono">scripts/setup-devnet.ts</code> on the{" "}
          <a
            href={SAS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            Solana Attestation Service
          </a>
          .
        </p>
      </BlackCard>
    </>
  );
}
