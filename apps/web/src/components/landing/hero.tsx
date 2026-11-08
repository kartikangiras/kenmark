import Link from "next/link";
import { LogoMark } from "@/components/dashboard/logo";
import { GITHUB_URL, VALIDATION_URL } from "@/lib/site";
import { ParticleSphere } from "./particle-sphere";

const NAV = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Docs", href: "/docs" },
  { label: "Validation", href: VALIDATION_URL, external: true },
  { label: "GitHub", href: GITHUB_URL, external: true },
  { label: "Contact", href: "mailto:angiraskartik@gmail.com", external: true },
];

export function TopBar() {
  return (
    <div className="flex items-center justify-between border-b border-white/15 pb-4 text-[11px] text-white/70">
      <span>Machine-readable security attestations</span>
      <span>Built on the Solana Attestation Service</span>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative isolate flex min-h-[640px] flex-col pt-10 lg:min-h-[min(calc(100vh-110px),940px)]">
      {/* Sphere sits right of centre and behind the text, as in the reference */}
      <div className="pointer-events-none absolute left-1/2 top-[2%] -z-10 w-[min(92vw,760px)] -translate-x-[42%] lg:left-[46%] lg:w-[min(58vw,760px)] lg:-translate-x-[30%]">
        <ParticleSphere />
      </div>

      <div className="flex items-start justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-md"
        >
          <LogoMark className="h-7 w-7" />
          <span className="text-[17px] font-semibold tracking-[0.12em]">KENMARK</span>
        </Link>
        <nav
          aria-label="Primary"
          className="flex flex-col items-end gap-2 text-[13px] text-white/85"
        >
          {NAV.map((item) =>
            item.external ? (
              <a
                key={item.label}
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="hover:text-white outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-sm"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.label}
                href={item.href}
                className="hover:text-white outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-sm"
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>
      </div>

      <h1 className="mt-10 max-w-3xl text-[clamp(2.75rem,6.2vw,5.4rem)] leading-[1.02] tracking-[-0.035em] text-white">
        Verifiable security
        <br />
        for Solana programs
      </h1>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/dashboard"
          className="rounded-full bg-white px-6 py-3 text-[14px] font-medium text-black transition-colors hover:bg-white/90 outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          Open the dashboard
        </Link>
        <Link
          href="/docs"
          className="rounded-full border border-white/30 px-6 py-3 text-[14px] text-white transition-colors hover:bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          Read the docs
        </Link>
      </div>

      <p className="mt-auto max-w-[360px] pb-10 pt-16 text-[15px] leading-relaxed text-white/90">
        Kenmark turns verified builds, audits, and upgrade-authority facts into typed on-chain
        attestations that a wallet, a CI job, or a dashboard can read in one query.
      </p>
    </section>
  );
}
