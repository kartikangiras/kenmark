"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { GITHUB_URL, VALIDATION_URL } from "@/lib/site";

const footerLinks = {
  Product: [
    { name: "Capabilities", href: "#features" },
    { name: "How it works", href: "#how-it-works" },
    { name: "Use cases", href: "#use-cases" },
    { name: "Evidence", href: "#evidence" },
    { name: "Playground", href: "#playground" },
  ],
  Developers: [
    { name: "Developer docs", href: "/docs" },
    { name: "GitHub", href: GITHUB_URL },
    { name: "Validation artifact", href: VALIDATION_URL },
  ],
  Resources: [
    { name: "Solana Attestation Service", href: "https://attest.solana.com" },
    { name: "Verified Builds", href: "https://solana.com/developers/guides/advanced/verified-builds" },
    { name: "OtterSec registry", href: "https://verify.osec.io" },
  ],
};

export function FooterSection() {
  return (
    <footer className="relative bg-black">
      {/* Panoramic banner */}
      <div className="relative w-full h-[340px] md:h-[420px] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative banner */}
        <img
          src="/media/footer-landscape.png"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="py-16 lg:py-20">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-12 lg:gap-8">
            {/* Brand Column */}
            <div className="col-span-2">
              <Link href="/" className="inline-flex items-center gap-2 mb-6">
                <span className="text-2xl font-display text-white">KENMARK</span>
              </Link>

              <p className="text-white/50 leading-relaxed mb-8 max-w-xs text-sm">
                Machine-readable security profiles for Solana programs. Issuer-neutral, stateless,
                reproducible from raw RPC.
              </p>

              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-white/40 hover:text-white transition-colors inline-flex items-center gap-1 group"
              >
                GitHub
                <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </a>
            </div>

            {/* Link Columns */}
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h3 className="text-sm font-medium text-white mb-6">{title}</h3>
                <ul className="space-y-4">
                  {links.map((link) => {
                    const external = link.href.startsWith("http");
                    return (
                      <li key={link.name}>
                        <a
                          href={link.href}
                          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                          className="text-sm text-white/40 hover:text-white transition-colors inline-flex items-center gap-2"
                        >
                          {link.name}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/30">&copy; 2026 Kenmark. MIT licensed.</p>

          <div className="flex items-center gap-4 text-sm text-white/30">
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="w-2 h-2 rounded-full bg-emerald-400" />
              Fully verified and tested on devnet
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
