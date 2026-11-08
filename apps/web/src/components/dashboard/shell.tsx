"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { GITHUB_URL } from "@/lib/site";
import { NAV_ITEMS, isActive } from "./nav";
import { LogoMark } from "./logo";

type Theme = "light" | "dark";
const THEME_KEY = "kenmark-dashboard-theme";

function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(THEME_KEY);
      if (stored === "dark" || stored === "light") setTheme(stored);
    } catch {
      /* storage unavailable: keep the default */
    }
  }, []);
  const update = (t: Theme) => {
    setTheme(t);
    try {
      window.localStorage.setItem(THEME_KEY, t);
    } catch {
      /* ignore */
    }
  };
  return [theme, update];
}

function TopNav({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Dashboard"
      className="db-scroll flex min-w-0 items-center gap-1 overflow-x-auto"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-2 text-[15px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-db-accent/50",
              active ? "bg-db-accent text-white" : "text-db-fg/80 hover:text-db-fg",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  return (
    <div
      role="group"
      aria-label="Color theme"
      className="flex items-center rounded-full bg-db-chip p-1 border border-db-border"
    >
      {(
        [
          ["light", Sun, "Light theme"],
          ["dark", Moon, "Dark theme"],
        ] as const
      ).map(([value, Icon, label]) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          aria-pressed={theme === value}
          onClick={() => onChange(value)}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-db-accent/50",
            theme === value ? "bg-db-panel text-db-fg shadow-sm" : "text-db-muted hover:text-db-fg",
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [theme, setTheme] = useTheme();

  return (
    <div
      className="db relative min-h-screen overflow-x-hidden bg-db-page text-white"
      data-theme={theme}
    >
      {/* Warm glow in the bottom-right corner of the page, as in the reference. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-40 h-[620px] w-[620px] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,74,107,0.55), rgba(120,20,40,0.25), transparent)",
        }}
      />

      <div className="relative mx-auto max-w-[1880px] px-4 pb-10 pt-6 sm:px-8 sm:pt-8">
        <header className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-md"
          >
            <LogoMark className="h-9 w-9" />
            <span className="text-3xl tracking-tight">Kenmark</span>
          </Link>
          <span className="hidden text-xl tracking-tight text-white/90 sm:block">
            Security Attestation Dashboard
          </span>
        </header>

        <div className="rounded-[28px] bg-db-panel p-4 text-db-fg shadow-2xl sm:p-6">
          <div className="mb-8 flex items-center gap-4">
            <LogoMark className="hidden h-8 w-8 shrink-0 lg:block" />
            <TopNav pathname={pathname} />
            <div className="ml-auto flex shrink-0 items-center gap-3">
              <ThemeToggle theme={theme} onChange={setTheme} />
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open the repository on GitHub"
                title="GitHub"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-db-border bg-db-chip text-db-fg/70 transition-colors hover:text-db-fg outline-none focus-visible:ring-2 focus-visible:ring-db-accent/50"
              >
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          <main id="main" className="min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
