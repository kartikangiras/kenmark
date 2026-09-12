"use client";

import { useReveal } from "@/hooks/use-reveal";
import { AttestationField } from "./attestation-field";

const features = [
  {
    number: "01",
    title: "Attestations, Not PDFs",
    description:
      "Audits, verified builds, bug bounties, incidents — published as structured on-chain attestations a wallet or CI job can parse. No more reading PDFs linked from READMEs.",
    stats: { value: "1", label: "on-chain account per claim" },
  },
  {
    number: "02",
    title: "Issuer-Neutral by Design",
    description:
      "Any security firm publishes under its own credential. Multiple issuers coexist for the same program without collision — proven on devnet, not assumed.",
    stats: { value: "∞", label: "issuers, no collisions" },
  },
  {
    number: "03",
    title: "Reproducible, Not Oracular",
    description:
      "The aggregator is stateless. Anyone can re-run it against raw RPC and get the same answer. Kenmark's hosted API is a convenience, never an oracle.",
    stats: { value: "=", label: "same answer, any machine" },
  },
  {
    number: "04",
    title: "Verdicts, Not Raw Data",
    description:
      "Define what you require in a policy file — verified build, zero open criticals, immutable upgrade authority. Get PASS, FAIL, or UNKNOWN. Gate a deploy on it.",
    stats: { value: "0/1/2", label: "exit codes for CI" },
  },
];

export function FeaturesSection() {
  const { ref, isVisible } = useReveal<HTMLElement>();

  return (
    <section id="features" ref={ref} className="relative py-24 lg:py-32 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="relative mb-24 lg:mb-32">
          <div className="grid lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
                <span aria-hidden="true" className="w-12 h-px bg-foreground/30" />
                Capabilities
              </span>
              <h2
                className={`text-6xl md:text-7xl lg:text-[128px] font-display tracking-tight leading-[0.9] transition-all duration-1000 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
              >
                No PDFs.
                <br />
                <span className="text-muted-foreground">No trust-me.</span>
              </h2>
            </div>
            <div className="lg:col-span-5 lg:pb-4">
              <p
                className={`text-xl text-muted-foreground leading-relaxed transition-all duration-1000 delay-200 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                Every wallet, explorer, and CI pipeline asks the same question about a program.
                Today the answer lives in PDFs, provider APIs, and tweets. Kenmark gives existing
                security signals a shared, queryable, on-chain home.
              </p>
            </div>
          </div>
        </div>

        {/* Large feature card */}
        <div
          className={`relative bg-black border border-foreground/10 min-h-[420px] overflow-hidden group transition-all duration-700 flex ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}
        >
          <div className="relative flex-1 p-8 lg:p-12 bg-black">
            <AttestationField />
            <div className="relative z-10">
              <span className="font-mono text-sm text-muted-foreground">{features[0].number}</span>
              <h3 className="text-3xl lg:text-4xl font-display mt-4 mb-6 group-hover:translate-x-2 transition-transform duration-500">
                {features[0].title}
              </h3>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-md mb-8">
                {features[0].description}
              </p>
              <div>
                <span className="text-5xl lg:text-6xl font-display">{features[0].stats.value}</span>
                <span className="block text-sm text-muted-foreground font-mono mt-2">
                  {features[0].stats.label}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden lg:block relative w-[42%] shrink-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative background */}
            <img
              src="/media/feature-portrait.png"
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover object-center"
              style={{ transform: "scaleX(-1)" }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-transparent" />
          </div>
        </div>

        {/* Remaining feature cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-6">
          {features.slice(1).map((feature, i) => (
            <div
              key={feature.number}
              className={`relative bg-black border border-foreground/10 p-8 lg:p-10 group transition-all duration-700 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
              }`}
              style={{ transitionDelay: isVisible ? `${(i + 1) * 100}ms` : "0ms" }}
            >
              <span className="font-mono text-sm text-muted-foreground">{feature.number}</span>
              <h3 className="text-2xl lg:text-3xl font-display mt-4 mb-4 group-hover:translate-x-2 transition-transform duration-500">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-8">{feature.description}</p>
              <div>
                <span className="text-4xl lg:text-5xl font-display">{feature.stats.value}</span>
                <span className="block text-sm text-muted-foreground font-mono mt-2">
                  {feature.stats.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
