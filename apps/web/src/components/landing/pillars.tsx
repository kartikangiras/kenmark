import Link from "next/link";
import { GITHUB_URL } from "@/lib/site";
import { FunnelGlyph, OrbitGlyph, SchemaGlyph } from "./illustrations";

const PILLARS = [
  {
    title: (
      <>
        The predicate schema
        <br />
        and attestation layout
      </>
    ),
    glyph: <SchemaGlyph />,
    body: "A fixed set of typed predicates on the Solana Attestation Service. VerifiedBuild is live on devnet with a versioned on-chain schema; eight more are on the roadmap.",
    links: [
      { label: "Read the schema", href: `${GITHUB_URL}/tree/main/packages/spec`, external: true },
      { label: "Open docs", href: "/docs" },
    ],
  },
  {
    title: (
      <>
        The stateless
        <br />
        aggregator
      </>
    ),
    glyph: <FunnelGlyph />,
    body: "One getProgramAccounts call with two memcmp filters, then per-record schema resolution. Anyone re-running it against raw RPC gets the same answer, and a hosted API serves it over HTTP.",
    links: [{ label: "Verify a program", href: "/dashboard/verify" }],
  },
  {
    title: (
      <>
        Issuer-neutral
        <br />
        by design
      </>
    ),
    glyph: <OrbitGlyph />,
    body: "Any security firm publishes under its own credential. Two issuers coexist for the same program without collision, proven on devnet.",
    links: [
      { label: "See the issuers", href: "/dashboard/issuers" },
      { label: "Check yours", href: "/dashboard/verify?mode=credential" },
    ],
  },
];

export function Pillars() {
  return (
    <section
      aria-label="What Kenmark is"
      className="mt-6 grid grid-cols-1 overflow-hidden rounded-2xl bg-ink-card md:grid-cols-3 md:divide-x divide-y md:divide-y-0 divide-white/10"
    >
      {PILLARS.map((p, i) => (
        <article key={i} className="flex min-h-[520px] flex-col p-8 lg:p-10">
          <h2 className="text-[24px] leading-[1.2] tracking-tight text-white">{p.title}</h2>
          <div className="flex flex-1 items-center justify-start py-10">{p.glyph}</div>
          <p className="mb-6 max-w-xs text-[13px] leading-relaxed text-white/55">{p.body}</p>
          <div className="flex flex-wrap gap-2">
            {p.links.map((l) =>
              l.external ? (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-white/10 px-4 py-2 text-[13px] text-white transition-colors hover:bg-white/20 outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  {l.label}
                </a>
              ) : (
                <Link
                  key={l.label}
                  href={l.href}
                  className="rounded-full bg-white/10 px-4 py-2 text-[13px] text-white transition-colors hover:bg-white/20 outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  {l.label}
                </Link>
              ),
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
