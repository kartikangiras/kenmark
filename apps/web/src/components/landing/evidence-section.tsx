"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useReveal } from "@/hooks/use-reveal";

const proofs = ["Real devnet", "No mocks", "Re-runnable", "MIT licensed"];

const tests = [
  "Data fidelity",
  "Multi-issuer isolation",
  "memcmp filter accuracy",
  "Binary round-trip",
  "Cross-validation vs mainnet",
  "Schema version compatibility",
];

export function EvidenceSection() {
  const { ref, isVisible } = useReveal<HTMLElement>();

  return (
    <section id="evidence" ref={ref} className="relative py-32 lg:py-40 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="mb-20">
          <span
            className={`inline-flex items-center gap-4 text-sm font-mono text-muted-foreground mb-8 transition-all duration-700 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <span aria-hidden="true" className="w-12 h-px bg-foreground/20" />
            Evidence
          </span>

          <h2
            className={`text-6xl md:text-7xl lg:text-[128px] font-display tracking-tight leading-[0.9] mb-12 transition-all duration-1000 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            Don&apos;t trust.
            <br />
            <span className="text-muted-foreground">Re-run it.</span>
          </h2>

          <div className={`transition-all duration-1000 delay-100 ${isVisible ? "opacity-100" : "opacity-0"}`}>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
              A project about verifiable security claims should hold itself to its own standard.
              Every number below is a real devnet transaction you can open in an explorer — and the
              whole suite re-runs from a clean checkout with three commands.
            </p>
          </div>
        </div>

        {/* Validation suite card */}
        <div
          className={`relative border border-foreground/10 p-8 lg:p-12 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            <div className="flex flex-col">
              <span className="font-mono text-sm text-muted-foreground">Self-validation suite</span>
              <div className="mt-8 mb-10 flex-1">
                <span className="text-6xl lg:text-7xl font-display">Verified</span>
                <span className="block text-muted-foreground mt-2">
                  fully tested end-to-end on real devnet
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {proofs.map((proof, index) => (
                  <span
                    key={proof}
                    className={`px-3 py-1 border border-foreground/10 text-xs font-mono text-muted-foreground transition-all duration-500 ${
                      isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                    }`}
                    style={{ transitionDelay: `${index * 100 + 300}ms` }}
                  >
                    {proof}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col">
              <span className="font-mono text-sm text-muted-foreground">Coverage</span>
              <ul className="mt-8 space-y-3 flex-1">
                {tests.map((test, i) => (
                  <li
                    key={test}
                    className={`flex items-center gap-3 text-sm text-muted-foreground transition-all duration-500 ${
                      isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                    }`}
                    style={{ transitionDelay: `${i * 80 + 200}ms` }}
                  >
                    <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-status-verified" />
                    {test}
                  </li>
                ))}
              </ul>

              <div className="mt-10 space-y-4">
                <p className="font-mono text-sm text-muted-foreground">
                  git clone → npm install → 3 commands. Same results, your machine.
                </p>
                <Link
                  href="/docs#registry-cross-check"
                  className="group inline-flex items-center gap-2 font-mono text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 outline-none"
                >
                  Cross-checked against live public registries — see the docs
                  <ArrowRight
                    aria-hidden="true"
                    className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
