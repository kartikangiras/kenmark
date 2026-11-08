import Link from "next/link";
import { WireCards, WirePanels } from "./illustrations";

function LightBlock({
  title,
  body,
  cta,
  illustration,
}: {
  title: React.ReactNode;
  body: string;
  cta: { label: string; href: string; tone: "azure" | "ink" };
  illustration: React.ReactNode;
}) {
  return (
    <section className="mt-4 grid min-h-[480px] grid-cols-1 overflow-hidden rounded-2xl bg-paper text-paper-fg lg:grid-cols-2">
      <div className="flex flex-col justify-center p-8 lg:p-14">
        <h2 className="text-[clamp(2rem,4.4vw,3.6rem)] leading-[1.02] tracking-[-0.03em]">
          {title}
        </h2>
        <p className="mt-8 max-w-md text-[17px] leading-relaxed text-paper-muted">{body}</p>
        <Link
          href={cta.href}
          className={
            cta.tone === "azure"
              ? "mt-10 w-fit rounded-full bg-azure px-5 py-2.5 text-[14px] text-white transition-colors hover:bg-azure/90 outline-none focus-visible:ring-2 focus-visible:ring-azure/60"
              : "mt-10 w-fit rounded-full bg-paper-fg px-5 py-2.5 text-[14px] text-white transition-colors hover:bg-paper-fg/90 outline-none focus-visible:ring-2 focus-visible:ring-paper-fg/60"
          }
        >
          {cta.label}
        </Link>
      </div>
      <div className="relative min-h-[320px] lg:min-h-0">
        <div className="absolute inset-0 translate-x-6 translate-y-6 lg:translate-x-10">
          {illustration}
        </div>
      </div>
    </section>
  );
}

export function LookupCta() {
  return (
    <LightBlock
      title="Look up any program, get its profile"
      body="Paste a program ID into the dashboard and the aggregator reads every attestation about it straight from devnet: issuer, status, binary hash, source commit, timestamp."
      cta={{ label: "Open the dashboard", href: "/dashboard", tone: "azure" }}
      illustration={<WireCards />}
    />
  );
}

export function IssuerCta() {
  return (
    <LightBlock
      title="Become an issuer"
      body="Provision a credential, publish under your own key, and your attestations show up next to everyone else's. Three commands from a clean checkout; every result is a transaction you can open in an explorer."
      cta={{ label: "Read the issuer guide", href: "/docs#workflow", tone: "ink" }}
      illustration={<WirePanels />}
    />
  );
}
