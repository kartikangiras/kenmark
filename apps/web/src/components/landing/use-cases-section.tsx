"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useReveal } from "@/hooks/use-reveal";

/**
 * The persona ledger: who reads the same profile, at which decision point,
 * through which surface. Deliberately a row list, not another card grid —
 * the page already has three of those.
 */
const useCases = [
  {
    number: "01",
    actor: "Wallets",
    moment: "at signing time",
    description:
      "Before the user signs, the wallet reads the program's profile and renders a shield — or a warning. One SDK call covers every issuer.",
    surface: "SDK",
  },
  {
    number: "02",
    actor: "CI pipelines",
    moment: "at merge time",
    description:
      "A policy check runs on every deploy and dependency bump. Pass merges, fail blocks — and a missing attestation is the pipeline's call, not Kenmark's.",
    surface: "CLI",
  },
  {
    number: "03",
    actor: "Explorers",
    moment: "at research time",
    description:
      "A Security tab on every program page, served from one HTTP call — no per-issuer integrations to build or maintain.",
    surface: "API",
  },
  {
    number: "04",
    actor: "DAOs & treasuries",
    moment: "at proposal time",
    description:
      "Attach a policy verdict to the integration proposal. Anyone who doubts it re-runs the same check and gets the same answer.",
    surface: "CLI",
  },
  {
    number: "05",
    actor: "Bots & services",
    moment: "at routing time",
    description:
      "Programmatic due diligence before funds move — the same read path, in-process, from Rust or TypeScript.",
    surface: "SDK",
  },
  {
    number: "06",
    actor: "Issuers",
    moment: "publish once",
    description:
      "Audit firms and build registries attest under their own credential. One publish reaches every surface above at once.",
    surface: "CLI / SDK",
  },
];

export function UseCasesSection() {
  const { ref, isVisible } = useReveal<HTMLElement>();

  return (
    <section id="use-cases" ref={ref} className="relative py-24 lg:py-32 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="mb-16 lg:mb-24 grid lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-7">
            <span
              className={`inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6 transition-all duration-700 ${
                isVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              <span aria-hidden="true" className="w-12 h-px bg-foreground/30" />
              Use cases
            </span>
            <h2
              className={`text-6xl md:text-7xl lg:text-[128px] font-display tracking-tight leading-[0.9] transition-all duration-1000 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              One profile.
              <br />
              <span className="text-muted-foreground">Every decision point.</span>
            </h2>
          </div>
          <div className="lg:col-span-5 lg:pb-4">
            <p
              className={`text-xl text-muted-foreground leading-relaxed transition-all duration-1000 delay-200 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              Issuers write once. The same on-chain facts then answer a different question at each
              point where someone decides to trust a program — in code, in a pipeline, or in a
              browser.
            </p>
          </div>
        </div>

        {/* Ledger rows */}
        <ul className="border-t border-foreground/10">
          {useCases.map((useCase, i) => (
            <li
              key={useCase.number}
              className={`grid grid-cols-[2.5rem_1fr_auto] lg:grid-cols-[3.5rem_240px_1fr_auto] items-baseline gap-x-4 lg:gap-x-8 gap-y-2 border-b border-foreground/10 py-6 lg:py-7 transition-all duration-700 hover:bg-foreground/[0.02] ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: isVisible ? `${i * 80 + 200}ms` : "0ms" }}
            >
              <span className="font-mono text-sm text-muted-foreground">{useCase.number}</span>
              <div>
                <h3 className="text-xl lg:text-2xl font-display">{useCase.actor}</h3>
                <span className="block font-mono text-xs text-muted-foreground mt-1">
                  {useCase.moment}
                </span>
              </div>
              <p className="col-span-3 lg:col-span-1 col-start-2 lg:col-start-3 text-muted-foreground leading-relaxed max-w-xl">
                {useCase.description}
              </p>
              <span className="col-start-3 lg:col-start-4 row-start-1 justify-self-end border border-foreground/15 px-3 py-1 font-mono text-xs text-muted-foreground whitespace-nowrap">
                {useCase.surface}
              </span>
            </li>
          ))}
        </ul>

        {/* The punchline + honesty note */}
        <div
          className={`mt-12 flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all duration-1000 delay-500 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="text-lg text-foreground max-w-2xl">
            Developers install the SDK and CLI.{" "}
            <span className="text-muted-foreground">
              Their users install nothing — they see the results: a shield in the wallet, a
              Security tab in the explorer.
            </span>
          </p>
          <Link
            href="/docs#use-cases"
            className="group inline-flex items-center gap-2 font-mono text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 outline-none whitespace-nowrap"
          >
            Surface status in the docs
            <ArrowRight aria-hidden="true" className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
