import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { truncateAddress } from "@/lib/utils";
import { Eyebrow } from "@/components/ui/eyebrow";
import { CodeBlock } from "@/components/docs/code-block";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { StatusBadge } from "@/components/docs/status-badge";
import { DOCS_SECTIONS } from "@/components/docs/sections";
import { GITHUB_URL, VALIDATION_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Kenmark Docs — machine-readable Solana program security",
  description:
    "How Kenmark works, what's live on devnet today, the sample verify → policy → verdict workflow, and the roadmap for the full nine-predicate schema.",
};

/* ---------------------------------------------------------------- content */

const workflowSteps = [
  {
    number: "01",
    title: "Issuers publish",
    body: "An auditor or build registry writes a JSON fields file for one predicate and publishes it as an on-chain attestation through the Solana Attestation Service — signed under their own credential.",
  },
  {
    number: "02",
    title: "The chain stores facts",
    body: "Each attestation is just a Solana account: flat binary fields tied to a program ID and an issuer. No verdicts, no server, no database.",
  },
  {
    number: "03",
    title: "Anyone aggregates",
    body: "One raw-RPC query collects every attestation about a program into a single security profile JSON — all nine signal types plus the raw records. Stateless: anyone re-running it gets identical output.",
  },
  {
    number: "04",
    title: "You judge",
    body: "Your own policy.yaml declares what “good enough” means. Checking the profile against it yields PASS, FAIL, or INDETERMINATE — with exit codes 0, 1, 2 for CI.",
  },
];

const liveFeatures = [
  {
    name: "VerifiedBuildAttestation v1",
    detail:
      "The first of nine predicate schemas, versioned on-chain. Records whether a program's deployed hash matches its claimed source build.",
  },
  {
    name: "Stateless aggregator",
    detail:
      "The core library scans raw RPC — a getProgramAccounts call with two memcmp filters, then fixed-offset decoding. No indexer, no database, no server in the trust path.",
  },
  {
    name: "Devnet publish round-trip",
    detail:
      "Real attestations published under real credentials and read back byte-for-byte from chain — the full write-then-read pipeline.",
  },
  {
    name: "Validation artifact",
    detail:
      "Fully verified and tested end-to-end on real devnet. Re-runs from a clean checkout with three commands; every result is a real transaction you can open in an explorer.",
  },
  {
    name: "Registry cross-check",
    detail:
      "Real mainnet programs pulled live from public verified-build registries (OtterSec's verify.osec.io) and republished as devnet attestations — spanning Verified, Mismatch, and Unknown.",
  },
  {
    name: "Typed error matrix",
    detail:
      "Every read and write failure mapped to a typed error, so integrators handle RPC loss, missing schemas, and rejected publishes explicitly.",
  },
];

/**
 * Every row is a real devnet attestation from validation/real-world-attestations.json,
 * built from a live public verified-build registry (OtterSec's verify.osec.io) for real
 * mainnet programs. The three were chosen because their live data spans all three
 * verificationStatus values without any synthetic construction. Update alongside the
 * validation artifact.
 */
const crossChecks = [
  {
    subject: "Phoenix",
    programId: "PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY",
    attestation: "BrzgqUkwdiCiCyDmPRemvYYwzAzczcnMKhmZRWfX4cka",
    status: "Verified" as const,
    note: "On-chain hash matches the build",
  },
  {
    subject: "Marinade",
    programId: "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD",
    attestation: "7TVoiKVfrYGb6kS6qWJijrMFMTNijugzCBxMjajSvj1R",
    status: "Mismatch" as const,
    note: "Registry hashes genuinely disagree",
  },
  {
    subject: "Kamino",
    programId: "KaminoLendkCC8gK7iCK6oCEQaefsUEC1BeXKcm5cVc",
    attestation: "Fhjs9dduo3DFbWaCfw7ahKNyu2Xs6GgTdum3XX8mBUkZ",
    status: "Unknown" as const,
    note: "No verification data exists",
  },
];

const statusDot: Record<(typeof crossChecks)[number]["status"], string> = {
  Verified: "bg-status-verified",
  Mismatch: "bg-status-mismatch",
  Unknown: "bg-status-unknown",
};

const roadmap = [
  {
    status: "dev" as const,
    phase: "Next",
    title: "Integrity & completed-check predicates",
    items: [
      "UpgradeAuthorityAttestation — immutable, multisig, timelocked, DAO-governed",
      "AuditAttestation — auditor, open critical findings, report URI",
      "StaticAnalysisAttestation — tool and findings summary",
      "BugBountyAttestation — platform, max payout, active status",
    ],
  },
  {
    status: "soon" as const,
    phase: "After that",
    title: "Full profile, served",
    items: [
      "Remaining predicates — formal verification, runtime observation, supply chain, incidents",
      "Hosted aggregation API — GET /programs/{programId}/security",
      "Issuer trust allowlist — a versioned, forkable default-issuers.json",
    ],
  },
  {
    status: "planned" as const,
    phase: "Then",
    title: "SDKs, CLI, and gates",
    items: [
      "TypeScript and Rust SDKs, published",
      "CLI — kenmark publish, verify, and policy check",
      "Reference CI gate — a GitHub Actions example blocking on exit codes",
      "The Kenmark Playground — paste a program ID, test a policy in the browser",
    ],
  },
];

const references = [
  { name: "GitHub repository", desc: "All source, MIT licensed", href: GITHUB_URL },
  {
    name: "Validation artifact",
    desc: "The re-runnable devnet evidence behind every claim on this page",
    href: VALIDATION_URL,
  },
  {
    name: "Solana Attestation Service",
    desc: "The on-chain primitive Kenmark builds on",
    href: "https://attest.solana.com",
  },
  {
    name: "Verified Builds",
    desc: "Solana's guide to reproducible program builds",
    href: "https://solana.com/developers/guides/advanced/verified-builds",
  },
  {
    name: "Verified-build registries",
    desc: "Public registries Kenmark cross-checks against — e.g. OtterSec's verify.osec.io",
    href: "https://verify.osec.io",
  },
];

/* ------------------------------------------------------------ code samples */

const profileJson = `{
  "programId": "PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY",
  "queriedAtSlot": 371482910,

  "verifiedBuild": {
    "status": "Verified",
    "issuer": { "credential": "3Kx9pTvQ…dRwM", "name": "OtterSec" },
    "timestamp": 1754899200
  },
  "upgradeAuthority": {
    "authorityType": "Multisig",
    "multisig": { "threshold": 3, "totalSigners": 5 }
  },
  "audits": [
    {
      "issuer": { "credential": "9Bn4mKwE…hLp2", "name": "Zellic" },
      "criticalFindingsOpen": 0,
      "reportUri": "https://reports.zellic.io/phoenix-v1.pdf"
    }
  ],
  "bugBounty": { "isActive": true, "platform": "Immunefi", "maxPayoutUsd": 500000 },
  "incidents": [],

  "rawAttestations": [
    "BrzgqUkwdiCiCyDmPRemvYYwzAzczcnMKhmZRWfX4cka",
    "7TVoiKVfrYGb6kS6qWJijrMFMTNijugzCBxMjajSvj1R"
  ]
}`;

const policyYaml = `verifiedBuild: required
upgradeAuthority:
  authorityType: [Multisig, Timelocked, DaoGoverned]
criticalFindingsOpen: 0
minAudits: 1`;

function SectionHeading({
  id,
  number,
  eyebrow,
  title,
  children,
}: {
  id: string;
  number: string;
  eyebrow: string;
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-10">
      <Eyebrow className="mb-6">
        {number} · {eyebrow}
      </Eyebrow>
      {/* scroll-mt clears the mobile sticky bar when jumping to an anchor */}
      <h2 id={id} className="scroll-mt-20 font-display text-4xl lg:text-5xl tracking-tight leading-[0.95]">
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12 lg:grid lg:grid-cols-[260px_1fr] lg:gap-16">
        <DocsSidebar />

        <main id="main" className="max-w-3xl py-14 lg:py-20">
          {/* Page header */}
          <header className="mb-20">
            <Eyebrow className="mb-8">Developer docs</Eyebrow>
            <h1 className="font-display text-5xl lg:text-7xl tracking-tight leading-[0.92]">
              Build against
              <br />
              <span className="text-muted-foreground">checkable security.</span>
            </h1>
            <p className="mt-8 text-lg text-muted-foreground leading-relaxed">
              Everything on this page is marked as it is: what runs on devnet today, what is in
              development, and what is planned. Evidence over assertion — every shipped claim
              traces to a re-runnable devnet transaction.
            </p>
          </header>

          {/* Mobile TOC */}
          <nav aria-label="On this page" className="lg:hidden mb-16 border border-foreground/10 p-6">
            <span className="mb-4 block font-mono text-xs uppercase tracking-wider text-muted-foreground">
              On this page
            </span>
            <ul>
              {DOCS_SECTIONS.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="inline-flex items-baseline gap-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 outline-none"
                  >
                    <span className="font-mono text-xs opacity-60">{section.number}</span>
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* 01 · Overview */}
          <section aria-labelledby="overview" className="mb-24">
            <SectionHeading id="overview" number="01" eyebrow="Overview" title="One query, any program." />
            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <p>
                Kenmark resolves every security signal about a Solana program — verified builds,
                audits, upgrade authority, bounties, incidents — into one on-chain,
                machine-readable profile. It is built on the{" "}
                <a
                  href="https://attest.solana.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground"
                >
                  Solana Attestation Service
                </a>
                : issuers attest under their own credentials, and the profile is reproducible by
                anyone from raw RPC.
              </p>
              <div className="border border-foreground/10 p-6">
                <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  The one design rule
                </span>
                <p className="mt-3 text-foreground">
                  Facts on-chain, opinion client-side. The chain stores what issuers attested —
                  no score, no &ldquo;safe: true&rdquo;. You decide which issuers to trust and what
                  &ldquo;good enough&rdquo; means.
                </p>
              </div>

              <div>
                <p>
                  Kenmark invents no security data of its own — it gives signals that already
                  exist one queryable, machine-readable schema. Every primitive it builds on is
                  live today:
                </p>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    { name: "Solana Attestation Service", desc: "Live, permissionless claims program" },
                    { name: "Verified Builds", desc: "Public registries already publish them — OtterSec, Sec3" },
                    { name: "Upgrade Authority", desc: "Already on-chain for every program" },
                    { name: "Security Ecosystem", desc: "Audit firms, bounties, static analysis" },
                  ].map((primitive) => (
                    <li key={primitive.name} className="border border-foreground/10 p-4">
                      <span className="mb-1 flex items-center gap-2">
                        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-status-verified" />
                        <span className="font-medium text-foreground">{primitive.name}</span>
                      </span>
                      <span className="block text-sm">{primitive.desc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* 02 · How it works */}
          <section aria-labelledby="how-it-works" className="mb-24">
            <SectionHeading
              id="how-it-works"
              number="02"
              eyebrow="How it works"
              title={
                <>
                  Publish. Store.
                  <br />
                  <span className="text-muted-foreground">Aggregate. Judge.</span>
                </>
              }
            />

            <CodeBlock title="the whole pipeline" className="mb-10">
              {`fields.json ──publish──▶ attestation account ──query──▶ profile JSON ──policy.yaml──▶ verdict
(issuer)                 (on-chain, SAS)          (raw RPC)                    (PASS / FAIL /
                                                                                INDETERMINATE)`}
            </CodeBlock>

            <ol className="space-y-0 border-t border-foreground/10">
              {workflowSteps.map((step) => (
                <li key={step.number} className="grid grid-cols-[3rem_1fr] gap-4 border-b border-foreground/10 py-6">
                  <span className="font-mono text-sm text-muted-foreground">{step.number}</span>
                  <div>
                    <h3 className="mb-2 font-medium">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* 03 · Use cases */}
          <section aria-labelledby="use-cases" className="mb-24">
            <SectionHeading
              id="use-cases"
              number="03"
              eyebrow="Use cases"
              title={
                <>
                  Same computation,
                  <br />
                  <span className="text-muted-foreground">four doors.</span>
                </>
              }
            >
              <p className="mt-6 text-muted-foreground leading-relaxed">
                Pick the surface by asking one question: where does the decision happen? In code →
                SDK. In a pipeline → CLI. In a browser → API or playground. In a wallet, the user
                picks nothing — their wallet already did.
              </p>
            </SectionHeading>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Who uses Kenmark, at which moment, through which surface</caption>
                <thead>
                  <tr className="border-b border-foreground/10">
                    <th scope="col" className="py-3 pr-4 font-mono text-xs font-normal uppercase tracking-wider text-muted-foreground">
                      Who
                    </th>
                    <th scope="col" className="py-3 pr-4 font-mono text-xs font-normal uppercase tracking-wider text-muted-foreground">
                      Moment
                    </th>
                    <th scope="col" className="py-3 pr-4 font-mono text-xs font-normal uppercase tracking-wider text-muted-foreground">
                      Surface
                    </th>
                    <th scope="col" className="py-3 font-mono text-xs font-normal uppercase tracking-wider text-muted-foreground">
                      Exactly how
                    </th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    {
                      who: "Wallet",
                      moment: "Signing time",
                      surface: "TS SDK",
                      how: "getSecurityPosture(programId) → render shield or warning",
                    },
                    {
                      who: "CI pipeline",
                      moment: "Merge / deploy",
                      surface: "CLI",
                      how: "kenmark policy check $PROGRAM policy.yaml → exit 0/1/2",
                    },
                    {
                      who: "Explorer",
                      moment: "Page render",
                      surface: "API",
                      how: "GET /programs/{id}/security → Security tab",
                    },
                    {
                      who: "DAO / treasury",
                      moment: "Proposal review",
                      surface: "CLI",
                      how: "Policy verdict attached to the proposal — re-runnable by any voter",
                    },
                    {
                      who: "Bot / service",
                      moment: "Before routing funds",
                      surface: "Rust or TS SDK",
                      how: "Same read path, in-process",
                    },
                    {
                      who: "Auditor / registry",
                      moment: "Once per engagement",
                      surface: "CLI / SDK",
                      how: "kenmark publish audit fields.json --credential …",
                    },
                    {
                      who: "Human researcher",
                      moment: "Due diligence",
                      surface: "Playground",
                      how: "Paste a program ID in the browser — the query runs client-side",
                    },
                    {
                      who: "End user",
                      moment: "Never",
                      surface: "—",
                      how: "Sees the results a wallet or explorer already rendered",
                    },
                  ].map((row) => (
                    <tr key={row.who} className="border-b border-foreground/5 align-top">
                      <td className="py-3 pr-4 text-foreground whitespace-nowrap">{row.who}</td>
                      <td className="py-3 pr-4 whitespace-nowrap">{row.moment}</td>
                      <td className="py-3 pr-4 font-mono text-xs whitespace-nowrap">{row.surface}</td>
                      <td className="py-3 font-mono text-xs leading-relaxed">{row.how}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
              Every row is the same stateless query and decode running in a different place —
              issuers write once, and each surface is another window onto the identical result.
              The aggregation these run on is live today; the CLI, API, and packaged SDKs ship per
              the <a href="#roadmap" className="text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground">roadmap</a>.
            </p>
          </section>

          {/* 04 · Live today */}
          <section aria-labelledby="live-today" className="mb-24">
            <SectionHeading
              id="live-today"
              number="04"
              eyebrow="Live today"
              title={
                <>
                  What runs
                  <br />
                  <span className="text-muted-foreground">right now.</span>
                </>
              }
            >
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <StatusBadge status="live" />
                <span className="text-sm text-muted-foreground">
                  Fully verified and tested on devnet — re-runnable from a clean checkout.
                </span>
              </div>
            </SectionHeading>

            <div className="grid gap-4 sm:grid-cols-2">
              {liveFeatures.map((feature) => (
                <div key={feature.name} className="border border-foreground/10 p-6">
                  <div className="mb-3 flex items-center gap-2">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-status-verified" />
                    <h3 className="font-medium">{feature.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.detail}</p>
                </div>
              ))}
            </div>

            {/* Registry cross-check detail */}
            <div className="mt-14">
              <h3 id="registry-cross-check" className="scroll-mt-20 mb-2 font-medium">
                Cross-checked against live public registries
              </h3>
              <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
                Three real mainnet programs, pulled live from a public verified-build registry
                (OtterSec&apos;s verify.osec.io) and republished as devnet attestations —
                deliberately spanning all three verification outcomes, including a genuine hash
                mismatch and genuinely absent data. Each attestation link opens the real on-chain
                account.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">
                    Mainnet programs cross-checked against a live verified-build registry
                  </caption>
                  <thead>
                    <tr className="border-b border-foreground/10">
                      <th scope="col" className="py-3 pr-4 font-mono text-xs font-normal uppercase tracking-wider text-muted-foreground">
                        Program
                      </th>
                      <th scope="col" className="py-3 pr-4 font-mono text-xs font-normal uppercase tracking-wider text-muted-foreground">
                        Status
                      </th>
                      <th scope="col" className="hidden md:table-cell py-3 pr-4 font-mono text-xs font-normal uppercase tracking-wider text-muted-foreground">
                        Why
                      </th>
                      <th scope="col" className="py-3 font-mono text-xs font-normal uppercase tracking-wider text-muted-foreground">
                        Attestation
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {crossChecks.map((row) => (
                      <tr key={row.subject} className="border-b border-foreground/5">
                        <td className="py-4 pr-4">
                          <span className="block font-medium">{row.subject}</span>
                          <span className="mt-1 block font-mono text-xs text-muted-foreground">
                            {truncateAddress(row.programId)}
                          </span>
                        </td>
                        <td className="py-4 pr-4">
                          <span className="inline-flex items-center gap-2">
                            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${statusDot[row.status]}`} />
                            <span>{row.status}</span>
                          </span>
                        </td>
                        <td className="hidden md:table-cell py-4 pr-4 text-muted-foreground">{row.note}</td>
                        <td className="py-4">
                          <a
                            href={`https://explorer.solana.com/address/${row.attestation}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group inline-flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 outline-none"
                          >
                            {truncateAddress(row.attestation, 6, 5)}
                            <ArrowUpRight
                              aria-hidden="true"
                              className="h-3 w-3 opacity-50 transition-opacity group-hover:opacity-100"
                            />
                            <span className="sr-only">
                              {" "}
                              — open {row.subject} attestation on Solana Explorer (devnet)
                            </span>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* 05 · Sample workflow */}
          <section aria-labelledby="workflow" className="mb-24">
            <SectionHeading
              id="workflow"
              number="05"
              eyebrow="Sample workflow"
              title={
                <>
                  Two steps:
                  <br />
                  <span className="text-muted-foreground">evidence, then verdict.</span>
                </>
              }
            >
              <div className="mt-6 border border-foreground/10 p-4 text-sm text-muted-foreground leading-relaxed">
                <span className="mr-2 inline-flex align-middle">
                  <StatusBadge status="soon">Target interface</StatusBadge>
                </span>
                The profile shape and CLI below are the target interface. What runs today is the
                verified-build slice, through the library; the rest ships per the roadmap.
              </div>
            </SectionHeading>

            <div className="space-y-12">
              <div>
                <h3 className="mb-2 flex items-baseline gap-3 font-medium">
                  <span className="font-mono text-sm text-muted-foreground">step 1</span>
                  Query the profile — all details, no verdict
                </h3>
                <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
                  One query pulls everything known about a program. Empty arrays mean &ldquo;no
                  attestation exists&rdquo;, and <code className="font-mono text-foreground/90">rawAttestations</code>{" "}
                  lets you bypass the summary and read the on-chain accounts yourself.
                </p>
                <CodeBlock title="terminal" className="mb-4">
                  {`$ kenmark verify PhoeNiXZ8ByJ…FHGqdXY --output json`}
                </CodeBlock>
                <CodeBlock title="security-profile.json">{profileJson}</CodeBlock>
              </div>

              <div>
                <h3 className="mb-2 flex items-baseline gap-3 font-medium">
                  <span className="font-mono text-sm text-muted-foreground">step 2</span>
                  Declare your policy — your judgment, not Kenmark&apos;s
                </h3>
                <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
                  A YAML file states what you require. Different consumers hold the same program to
                  different standards — a wallet, a CI pipeline, and a DAO can each ship their own.
                </p>
                <CodeBlock title="policy.yaml">{policyYaml}</CodeBlock>
              </div>

              <div>
                <h3 className="mb-2 flex items-baseline gap-3 font-medium">
                  <span className="font-mono text-sm text-muted-foreground">step 3</span>
                  Check it — one answer, three possible states
                </h3>
                <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
                  Everything collapses into a per-requirement breakdown and one exit code.
                </p>
                <CodeBlock title="terminal" className="mb-4">
                  <span className="text-muted-foreground">
                    $ kenmark policy check PhoeNiXZ8ByJ…FHGqdXY policy.yaml
                  </span>
                  {"\n\n"}
                  <span className="text-status-verified">✓</span>
                  {" verifiedBuild: required                     Verified — OtterSec\n"}
                  <span className="text-status-verified">✓</span>
                  {" upgradeAuthority in [Multisig, Timelocked]  Multisig 3/5\n"}
                  <span className="text-status-verified">✓</span>
                  {" criticalFindingsOpen: 0                     0 open (Zellic)\n"}
                  <span className="text-status-verified">✓</span>
                  {" minAudits: 1                                1 live audit\n\n"}
                  <span className="text-status-verified">PASS</span>
                  <span className="text-muted-foreground">  (exit code 0)</span>
                </CodeBlock>
                <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
                  The third state is the interesting one. Same policy, a program with no audit
                  attestation at all — not FAIL, because &ldquo;no audit exists&rdquo; is a
                  different claim than &ldquo;an audit found problems&rdquo;:
                </p>
                <CodeBlock title="terminal" className="mb-6">
                  <span className="text-status-verified">✓</span>
                  {" verifiedBuild: required                     Verified — OtterSec\n"}
                  <span className="text-status-mismatch">✗</span>
                  {" minAudits: 1                                no audit attestation found\n\n"}
                  <span className="text-status-mismatch">INDETERMINATE</span>
                  <span className="text-muted-foreground">  (exit code 2)</span>
                </CodeBlock>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">Exit codes for CI gating</caption>
                    <thead>
                      <tr className="border-b border-foreground/10">
                        <th scope="col" className="py-3 pr-4 font-mono text-xs font-normal uppercase tracking-wider text-muted-foreground">
                          Exit code
                        </th>
                        <th scope="col" className="py-3 pr-4 font-mono text-xs font-normal uppercase tracking-wider text-muted-foreground">
                          Verdict
                        </th>
                        <th scope="col" className="py-3 font-mono text-xs font-normal uppercase tracking-wider text-muted-foreground">
                          Meaning
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b border-foreground/5">
                        <td className="py-3 pr-4 font-mono">0</td>
                        <td className="py-3 pr-4 text-foreground">PASS</td>
                        <td className="py-3">Every requirement met by a live attestation</td>
                      </tr>
                      <tr className="border-b border-foreground/5">
                        <td className="py-3 pr-4 font-mono">1</td>
                        <td className="py-3 pr-4 text-foreground">FAIL</td>
                        <td className="py-3">A requirement was checked and is unmet</td>
                      </tr>
                      <tr className="border-b border-foreground/5">
                        <td className="py-3 pr-4 font-mono">2</td>
                        <td className="py-3 pr-4 text-foreground">INDETERMINATE</td>
                        <td className="py-3">No relevant attestation exists — CI decides whether that blocks</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          {/* 06 · Roadmap */}
          <section aria-labelledby="roadmap" className="mb-24">
            <SectionHeading
              id="roadmap"
              number="06"
              eyebrow="Roadmap"
              title={
                <>
                  Marked planned,
                  <br />
                  <span className="text-muted-foreground">until it isn&apos;t.</span>
                </>
              }
            />

            <div className="space-y-4">
              {roadmap.map((group) => (
                <div key={group.title} className="border border-foreground/10 p-6 lg:p-8">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-display text-2xl tracking-tight">{group.title}</h3>
                    <StatusBadge status={group.status} />
                  </div>
                  <ul className="space-y-3">
                    {group.items.map((item) => (
                      <li key={item} className="flex gap-3 text-sm text-muted-foreground leading-relaxed">
                        <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-foreground/30" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* 07 · Reference */}
          <section aria-labelledby="reference" className="mb-24">
            <SectionHeading
              id="reference"
              number="07"
              eyebrow="Reference"
              title={
                <>
                  Read the source,
                  <br />
                  <span className="text-muted-foreground">not the pitch.</span>
                </>
              }
            />

            <ul className="border-t border-foreground/10">
              {references.map((ref) => (
                <li key={ref.name} className="border-b border-foreground/10">
                  <a
                    href={ref.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between gap-4 py-5 transition-colors hover:bg-foreground/[0.03] focus-visible:ring-2 focus-visible:ring-ring/50 outline-none"
                  >
                    <span>
                      <span className="block font-medium">{ref.name}</span>
                      <span className="mt-1 block text-sm text-muted-foreground">{ref.desc}</span>
                    </span>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-muted-foreground opacity-50 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <footer className="border-t border-foreground/10 pt-8 pb-4 text-sm text-muted-foreground">
            <p>
              Something missing?{" "}
              <a
                href={`${GITHUB_URL}/issues`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground"
              >
                Open an issue
              </a>{" "}
              — the design document is the source of truth, and these docs follow it.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
