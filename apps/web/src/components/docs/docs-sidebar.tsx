"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { DOCS_SECTIONS, type DocsSectionId } from "./sections";
import { GITHUB_URL, VALIDATION_URL } from "@/lib/site";

const externalLinks = [
  { name: "GitHub", href: GITHUB_URL },
  { name: "Validation artifact", href: VALIDATION_URL },
];

function useActiveSection() {
  const [active, setActive] = useState<DocsSectionId>(DOCS_SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id as DocsSectionId);
          }
        }
      },
      // A narrow band near the top of the viewport decides the active section,
      // so the highlight flips when a heading crosses it rather than mid-read.
      { rootMargin: "-15% 0px -75% 0px" },
    );

    for (const section of DOCS_SECTIONS) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return active;
}

export function DocsSidebar() {
  const active = useActiveSection();

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-40 border-b border-foreground/10 bg-background/80 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 outline-none"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Home
          </Link>
          <Link href="/docs" className="font-display text-lg tracking-tight">
            KENMARK <span className="text-muted-foreground">Docs</span>
          </Link>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex sticky top-0 h-screen flex-col overflow-y-auto border-r border-foreground/10 py-12 pr-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 outline-none"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to home
        </Link>

        <Link href="/docs" className="mt-10 block">
          <span className="font-display text-2xl tracking-tight">KENMARK</span>
          <span className="mt-1 block font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Developer docs
          </span>
        </Link>

        <nav aria-label="Docs sections" className="mt-12 flex-1">
          <ul className="space-y-1">
            {DOCS_SECTIONS.map((section) => {
              const isActive = active === section.id;
              return (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    aria-current={isActive ? "true" : undefined}
                    className={`group flex items-baseline gap-3 border-l py-2 pl-4 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 outline-none ${
                      isActive
                        ? "border-foreground text-foreground"
                        : "border-foreground/10 text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                    }`}
                  >
                    <span className="font-mono text-xs opacity-60">{section.number}</span>
                    {section.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-12 border-t border-foreground/10 pt-6">
          <ul className="space-y-3">
            {externalLinks.map((link) => (
              <li key={link.name}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 outline-none"
                >
                  {link.name}
                  <ArrowUpRight
                    aria-hidden="true"
                    className="h-3 w-3 opacity-50 transition-opacity group-hover:opacity-100"
                  />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </>
  );
}
