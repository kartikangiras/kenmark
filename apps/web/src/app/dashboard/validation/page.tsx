import { ArrowUpRight, Boxes, FileCheck2, Radio, ShieldCheck } from "lucide-react";
import spec from "../../../../../../packages/spec/predicates/v1/verified-build.schema.json";
import { allRecords, type AttestationRecord } from "@/lib/dashboard/records";
import { checkTotals, loadReports } from "@/lib/dashboard/reports";
import { liveAttestations, type LiveAttestation } from "@/lib/dashboard/chain";
import { formatIso, formatUtc } from "@/lib/format";
import { API_URL, GITHUB_URL, VALIDATION_URL, explorerAddressUrl, explorerTxUrl } from "@/lib/site";
import { cn, truncateAddress } from "@/lib/utils";
import {
  Address,
  BlackCard,
  CardTitle,
  GlassCard,
  PageHeader,
  StatWidget,
  StatusPill,
} from "@/components/dashboard/ui";
import Link from "next/link";

export const revalidate = 60;

const PROGRAM_NOTES: Record<string, string> = {
  PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY:
    "Ellipsis Labs' on-chain order book. The registry reports a verified build.",
  MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD:
    "Marinade's liquid staking program. The registry's two hashes disagree, so the status is Mismatch.",
  KaminoLendkCC8gK7iCK6oCEQaefsUEC1BeXKcm5cVc:
    "Kamino Lend. The registry holds no verification data at all, which maps to Unknown rather than to a failure.",
  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA:
    "The SPL Token program. Its binary hash was recomputed from a fresh mainnet read and its commit fetched from GitHub before publishing.",
};

function mainnetExplorer(address: string) {
  return `https://explorer.solana.com/address/${address}`;
}

function Hash({ value, highlight }: { value: string; highlight?: boolean }) {
  const zero = /^0+$/.test(value);
  return (
    <span
      className={cn(
        "break-all font-mono text-[11px]",
        highlight && "text-amber-300",
        zero && "text-white/40",
      )}
      title={value}
    >
      {zero ? "absent (all zeros)" : value}
    </span>
  );
}

function Badge({ ok, label }: { ok: boolean | null; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-wider",
        ok === true && "bg-db-up/15 text-db-up",
        ok === false && "bg-db-down/15 text-db-down",
        ok === null && "bg-white/10 text-white/60",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          ok === true && "bg-db-up",
          ok === false && "bg-db-down",
          ok === null && "bg-white/40",
        )}
      />
      {label}
    </span>
  );
}

function ProgramWidget({
  record,
  pass,
  live,
}: {
  record: AttestationRecord;
  pass: boolean | null;
  live: LiveAttestation | undefined | null;
}) {
  const programId = record.programIdBase58!;
  const liveMatch =
    live === undefined || live === null
      ? null
      : live.exists && live.binaryHash === record.binaryHash && live.status === record.status;
  return (
    <GlassCard
      className="p-6"
      data-testid="validation-program"
      data-program={programId}
      data-status={record.status}
      data-pass={pass === null ? "unknown" : pass ? "PASS" : "FAIL"}
      data-live={liveMatch === null ? "unavailable" : liveMatch ? "match" : "differs"}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{record.subject}</CardTitle>
          <a
            href={mainnetExplorer(programId)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-db-card-muted hover:text-white"
          >
            {truncateAddress(programId, 10, 8)} <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
        <StatusPill status={record.status} />
      </div>

      <p className="mb-5 text-sm leading-relaxed text-db-card-muted">{PROGRAM_NOTES[programId]}</p>

      <dl className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-[150px_1fr]">
        {record.registry ? (
          <>
            <dt className="text-db-card-muted">Registry says</dt>
            <dd>
              {record.registry.message || <span className="text-white/40">(no message)</span>}
              {record.registry.repoUrl && (
                <>
                  {" · "}
                  <a
                    href={record.registry.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4"
                  >
                    source
                  </a>
                </>
              )}
            </dd>
            <dt className="text-db-card-muted">Registry checked</dt>
            <dd>
              {record.registry.lastVerifiedAt ? (
                formatIso(record.registry.lastVerifiedAt)
              ) : (
                <span className="text-white/40">never</span>
              )}
            </dd>
            <dt className="text-db-card-muted">On-chain hash</dt>
            <dd>
              <Hash value={record.registry.onChainHash || "0"} />
            </dd>
            <dt className="text-db-card-muted">Executable hash</dt>
            <dd>
              <Hash
                value={record.registry.executableHash || "0"}
                highlight={record.status === "Mismatch"}
              />
            </dd>
          </>
        ) : (
          <>
            <dt className="text-db-card-muted">Binary hash</dt>
            <dd>
              <Hash value={record.binaryHash} />
            </dd>
            <dt className="text-db-card-muted">Source commit</dt>
            <dd>
              <a
                href={`https://github.com/solana-program/token/commit/${record.sourceCommit}`}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all font-mono text-[11px] underline underline-offset-4"
              >
                {record.sourceCommit}
              </a>
            </dd>
          </>
        )}
        <dt className="text-db-card-muted">Devnet attestation</dt>
        <dd>
          <Address
            value={record.attestation}
            href={explorerAddressUrl(record.attestation)}
            lead={10}
            tail={8}
            className="text-white"
          />
        </dd>
        <dt className="text-db-card-muted">Publish transaction</dt>
        <dd>
          <Address
            value={record.publishSignature}
            href={explorerTxUrl(record.publishSignature)}
            lead={10}
            tail={8}
          />
        </dd>
        <dt className="text-db-card-muted">Attested at</dt>
        <dd>{formatUtc(record.verificationTimestamp)}</dd>
      </dl>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Badge
          ok={pass}
          label={
            pass === null ? "round-trip unknown" : pass ? "round-trip pass" : "round-trip fail"
          }
        />
        <Badge
          ok={liveMatch}
          label={
            liveMatch === null
              ? "live read unavailable"
              : liveMatch
                ? "devnet matches now"
                : "devnet differs now"
          }
        />
        <Link
          href={`/dashboard/verify?program=${programId}`}
          className="ml-auto inline-flex items-center gap-1 rounded-full bg-white px-4 py-1.5 text-xs text-black transition-colors hover:bg-white/90 outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          Verify live <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </GlassCard>
  );
}

export default async function ValidationPage() {
  const records = allRecords().filter((r) => r.programIdBase58);
  const reports = loadReports();
  const checks = checkTotals(reports);
  const crossCheck = reports.find((r) => r.file === "real-world-cross-check-report.md");
  const mainnetCheck = reports.find((r) => r.file === "cross-validation-report.md");
  const live = await liveAttestations(records.map((r) => r.attestation));
  const latest = reports.reduce((max, r) => (r.modifiedAt > max ? r.modifiedAt : max), "");

  const passFor = (r: AttestationRecord): boolean | null => {
    if (r.registry)
      return crossCheck?.roundTrips.find((rt) => rt.subject === r.subject)?.pass ?? null;
    return mainnetCheck ? mainnetCheck.result === "PASS" : null;
  };
  const liveMatches = live
    ? records.filter((r) => {
        const l = live[r.attestation];
        return l?.exists && l.binaryHash === r.binaryHash && l.status === r.status;
      }).length
    : null;
  const schemaAddress = records[0]?.schema;

  return (
    <>
      <PageHeader
        title="Real-world integration validation"
        description="Real mainnet programs, attested on devnet from data Kenmark did not produce, and read back through the same aggregator anyone can run. Every address below opens in Solana Explorer."
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatWidget
          icon={Boxes}
          value={String(records.length)}
          label="Mainnet programs"
          note="attested on devnet"
        />
        <StatWidget
          icon={FileCheck2}
          value={
            crossCheck
              ? `${crossCheck.roundTrips.filter((rt) => rt.pass).length}/${crossCheck.roundTrips.length}`
              : "—"
          }
          label="Registry round-trips"
          note="OtterSec verify.osec.io"
          tone="up"
        />
        <StatWidget
          icon={Radio}
          value={liveMatches === null ? "—" : `${liveMatches}/${records.length}`}
          label="Match devnet right now"
          note={live ? "read at request time" : "RPC unavailable"}
          tone={liveMatches === records.length ? "up" : "down"}
        />
        <StatWidget
          testId="kpi-checks"
          icon={ShieldCheck}
          value={checks.total ? `${checks.passed}/${checks.total}` : "—"}
          label="Checks passed"
          note={latest ? formatIso(latest) : undefined}
          tone={checks.passed === checks.total ? "up" : "down"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {records.map((r) => (
          <ProgramWidget
            key={r.attestation}
            record={r}
            pass={passFor(r)}
            live={live ? live[r.attestation] : live}
          />
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <BlackCard data-testid="schema-widget">
          <CardTitle className="mb-1">The schema behind every record</CardTitle>
          <p className="mb-5 text-sm text-white/55">
            Field order and types are on-chain in the Schema account, so a reader never trusts
            Kenmark to decode an attestation.
          </p>
          <dl className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-[150px_1fr]">
            <dt className="text-white/50">Predicate</dt>
            <dd className="font-mono">
              {spec.predicateType} · v{spec.version}
            </dd>
            <dt className="text-white/50">Layout</dt>
            <dd className="font-mono">[{spec.layout.join(", ")}]</dd>
            <dt className="text-white/50">Fields</dt>
            <dd className="font-mono">{spec.field_names.join(" · ")}</dd>
            <dt className="text-white/50">Status values</dt>
            <dd className="font-mono">0 Verified · 1 Mismatch · 2 Unknown</dd>
            <dt className="text-white/50">Nonce</dt>
            <dd className="font-mono">{spec.nonce.formula}</dd>
            {schemaAddress && (
              <>
                <dt className="text-white/50">Schema account</dt>
                <dd>
                  <Address
                    value={schemaAddress}
                    href={explorerAddressUrl(schemaAddress)}
                    lead={10}
                    tail={8}
                    className="text-white"
                  />
                </dd>
              </>
            )}
            <dt className="text-white/50">Spec file</dt>
            <dd>
              <a
                href={`${GITHUB_URL}/blob/main/packages/spec/predicates/v1/verified-build.schema.json`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                packages/spec/predicates/v1/verified-build.schema.json
              </a>
            </dd>
          </dl>
        </BlackCard>

        <BlackCard data-testid="reproduce-widget">
          <CardTitle className="mb-1">Check it without trusting this page</CardTitle>
          <p className="mb-5 text-sm text-white/55">
            Same aggregator, your machine or any HTTP client.
          </p>
          <pre className="db-scroll overflow-x-auto rounded-xl bg-black/50 p-4 font-mono text-[11px] leading-relaxed text-white/80">
            {`curl ${API_URL}/programs/${records[0]?.programIdBase58 ?? "<programId>"}/security

git clone ${GITHUB_URL}.git && cd kenmark && npm install
npm run devnet:setup && npm run devnet:cross-check`}
          </pre>
          <p className="mt-4 text-xs leading-relaxed text-white/55">
            Scope, stated plainly: a matching hash and commit prove the attestation round-trips
            through the chain unchanged. They do not prove that the commit produced the binary; that
            needs reproducible builds, which Kenmark does not provide.
          </p>
          <p className="mt-3 text-xs text-white/55">
            Six synthetic devnet tests also pass on every run (data fidelity, multi-issuer
            isolation, memcmp filter accuracy, binary round-trip, mainnet cross-validation, schema
            versions).{" "}
            <a
              href={VALIDATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              Reports on GitHub
            </a>
            .
          </p>
        </BlackCard>
      </div>
    </>
  );
}
