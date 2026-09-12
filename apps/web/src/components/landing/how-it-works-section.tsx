"use client";

import { useEffect, useState } from "react";
import { useReveal } from "@/hooks/use-reveal";

const steps = [
  {
    number: "01",
    title: "Issuers",
    subtitle: "publish",
    description:
      "Audit firms, build verifiers, and bounty platforms publish structured attestations on-chain through the Solana Attestation Service — under their own credential, in Kenmark's schema.",
  },
  {
    number: "02",
    title: "Kenmark",
    subtitle: "aggregates",
    description:
      "The stateless aggregator scans the chain and resolves every signal for a program into one JSON response. Anyone can re-run it from raw RPC and get the same answer.",
  },
  {
    number: "03",
    title: "Consumers",
    subtitle: "gate",
    description:
      "Wallets render a shield. Explorers add a Security tab. CI pipelines run a policy check and exit 0, 1, or 2. One integration, every issuer.",
  },
];

export function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);
  const { ref, isVisible } = useReveal<HTMLElement>();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="how-it-works"
      ref={ref}
      className="relative py-24 lg:py-32 bg-[oklch(0.09_0.01_260)] text-white overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-white/[0.02] blur-[100px] pointer-events-none"
      />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="relative mb-16 lg:mb-24 grid lg:grid-cols-2 gap-4 lg:gap-12 items-end">
          <div className="overflow-hidden">
            <div
              className={`transition-all duration-1000 ${
                isVisible ? "translate-x-0 opacity-100" : "-translate-x-12 opacity-0"
              }`}
            >
              <span className="inline-flex items-center gap-3 text-sm font-mono text-white/40 mb-8">
                <span aria-hidden="true" className="w-12 h-px bg-white/20" />
                How It Works
              </span>
            </div>

            <h2
              className={`text-6xl md:text-7xl lg:text-[128px] font-display tracking-tight leading-[0.85] transition-all duration-1000 delay-100 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-16 opacity-0"
              }`}
            >
              <span className="block">Publish.</span>
              <span className="block text-white/30">Query.</span>
              <span className="block text-white/10">Gate.</span>
            </h2>
          </div>

          <div
            className={`relative h-[220px] lg:h-[320px] overflow-hidden transition-all duration-1000 delay-200 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative background */}
            <img
              src="/media/tree.png"
              alt=""
              aria-hidden="true"
              className="absolute bottom-0 left-0 w-full h-full object-contain object-bottom"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.09_0.01_260)] via-transparent to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Steps */}
        <div className="grid lg:grid-cols-3 gap-4">
          {steps.map((step, index) => (
            <button
              key={step.number}
              type="button"
              onClick={() => setActiveStep(index)}
              aria-pressed={activeStep === index}
              className={`relative text-left p-8 lg:p-12 border transition-all duration-500 focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none ${
                activeStep === index
                  ? "bg-black border-white/60"
                  : "bg-black border-white/25 hover:border-white/50"
              }`}
            >
              <div className="flex items-center gap-4 mb-8">
                <span
                  className={`text-4xl font-display transition-colors duration-300 ${
                    activeStep === index ? "text-emerald-400" : "text-white/20"
                  }`}
                >
                  {step.number}
                </span>
                <div className="flex-1 h-px bg-white/10 overflow-hidden">
                  {activeStep === index && <div className="h-full bg-emerald-400/50 animate-progress" />}
                </div>
              </div>

              <h3 className="text-3xl lg:text-4xl font-display mb-2">{step.title}</h3>
              <span className="text-xl text-white/40 font-display block mb-6">{step.subtitle}</span>

              <p
                className={`text-white/60 leading-relaxed transition-opacity duration-300 ${
                  activeStep === index ? "opacity-100" : "opacity-60"
                }`}
              >
                {step.description}
              </p>

              <div
                aria-hidden="true"
                className={`absolute bottom-0 left-0 right-0 h-1 bg-emerald-400 transition-transform duration-500 origin-left ${
                  activeStep === index ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
