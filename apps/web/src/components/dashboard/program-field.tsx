"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { cn, truncateAddress } from "@/lib/utils";
import type { AttestationRecord } from "@/lib/dashboard/records";

export const PRESETS = [
  { label: "Phoenix", programId: "PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY" },
  { label: "Marinade", programId: "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD" },
  { label: "Kamino", programId: "KaminoLendkCC8gK7iCK6oCEQaefsUEC1BeXKcm5cVc" },
  { label: "SPL Token", programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
] as const;

/** Deterministic position from a programId so the layout is stable between renders. */
function place(hex: string): { x: number; y: number } {
  const a = parseInt(hex.slice(0, 8), 16);
  const b = parseInt(hex.slice(8, 16), 16);
  // Left half of the pin area, leaving room above for callouts; the status
  // card covers the right side on wide screens.
  return { x: 8 + ((a % 1000) / 1000) * 46, y: 30 + ((b % 1000) / 1000) * 58 };
}

interface Pin {
  key: string;
  x: number;
  y: number;
  subject: string | null;
  status: AttestationRecord["status"];
  count: number;
  programIdBase58: string | null;
}

function pins(records: AttestationRecord[]): Pin[] {
  const byProgram = new Map<string, Pin>();
  for (const r of records) {
    const existing = byProgram.get(r.programIdHex);
    if (existing) {
      existing.count++;
      continue;
    }
    const { x, y } = place(r.programIdHex);
    byProgram.set(r.programIdHex, {
      key: r.programIdHex,
      x,
      y,
      subject: r.programIdBase58 ? r.subject : null,
      status: r.status,
      count: 1,
      programIdBase58: r.programIdBase58,
    });
  }
  return [...byProgram.values()];
}

const STATUS_FILL: Record<AttestationRecord["status"], string> = {
  Verified: "#34d399",
  Mismatch: "#fbbf24",
  Unknown: "#a1a1aa",
};

/**
 * The reference puts a map with pinned suppliers in the middle of the page.
 * Here every pin is a program with at least one attestation; named pins are
 * real mainnet programs. The search box on top runs the live aggregator.
 */
export function ProgramField({ records }: { records: AttestationRecord[] }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const items = pins(records);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = value.trim();
    if (id) router.push(`/dashboard/lookup?program=${encodeURIComponent(id)}`);
  };

  return (
    <div
      data-testid="program-field"
      className="relative flex h-full min-h-[420px] flex-col overflow-hidden rounded-[22px] bg-gradient-to-b from-black/[0.03] to-black/[0.06] dark:from-white/5 dark:to-white/[0.02]"
    >
      {/* Rings */}
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        {[18, 30, 42].map((r) => (
          <ellipse
            key={r}
            cx="52"
            cy="58"
            rx={r * 1.3}
            ry={r}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.07"
            strokeWidth="0.3"
          />
        ))}
      </svg>

      <div className="relative z-10 flex flex-col gap-3 p-4 sm:p-6">
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="field-program" className="sr-only">
            Program ID
          </label>
          <input
            id="field-program"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste a program ID to query devnet"
            spellCheck={false}
            autoComplete="off"
            className="h-12 flex-1 rounded-full border border-db-border bg-db-chip px-5 font-mono text-sm text-db-fg placeholder:text-db-muted outline-none focus-visible:ring-2 focus-visible:ring-db-accent/50"
          />
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-db-accent px-5 text-sm text-white transition-colors hover:bg-db-accent/90 outline-none focus-visible:ring-2 focus-visible:ring-db-accent/60"
          >
            Look up
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.programId}
              type="button"
              onClick={() => router.push(`/dashboard/lookup?program=${p.programId}`)}
              className="rounded-full border border-db-border bg-db-chip px-3 py-1 text-xs text-db-fg/80 transition-colors hover:text-db-fg outline-none focus-visible:ring-2 focus-visible:ring-db-accent/50"
            >
              {p.label}
            </button>
          ))}
          <Link
            href="/dashboard/issuers#lookup"
            className="rounded-full border border-db-accent/40 bg-db-chip px-3 py-1 text-xs text-db-accent transition-colors hover:bg-db-accent/10 outline-none focus-visible:ring-2 focus-visible:ring-db-accent/50"
          >
            Check your own credential →
          </Link>
        </div>
      </div>

      <div className="relative min-h-[280px] flex-1">
        {items.map((pin) => (
          <div
            key={pin.key}
            data-testid="program-pin"
            data-status={pin.status}
            className="absolute"
            style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: "translate(-50%, -100%)" }}
          >
            {pin.subject && (
              <div
                data-testid="pin-callout"
                className="absolute bottom-[calc(100%+6px)] left-1/2 w-max -translate-x-1/2 rounded-xl border border-db-border bg-db-chip px-3 py-2 text-left shadow-sm"
              >
                <div className="text-sm text-db-fg">
                  {pin.count} attestation{pin.count === 1 ? "" : "s"}
                </div>
                <div className="text-xs text-db-muted">
                  {pin.subject} ·{" "}
                  {pin.programIdBase58 ? truncateAddress(pin.programIdBase58, 5, 4) : ""}
                </div>
              </div>
            )}
            <svg
              viewBox="0 0 24 32"
              width="22"
              height="30"
              aria-hidden="true"
              className={cn("drop-shadow", pin.subject ? "text-db-fg" : "text-db-fg/70")}
            >
              <path
                d="M12 0C5.4 0 0 5.3 0 11.9 0 20.3 12 32 12 32s12-11.7 12-20.1C24 5.3 18.6 0 12 0z"
                fill="currentColor"
              />
              <circle cx="12" cy="12" r="4.5" fill={STATUS_FILL[pin.status]} />
            </svg>
            <span className="sr-only">
              {pin.subject ?? "Program"} {pin.programIdBase58 ?? ""}: {pin.count} attestation(s),{" "}
              {pin.status}
            </span>
          </div>
        ))}
      </div>

      <div className="relative z-10 flex items-center gap-4 px-4 pb-4 text-xs text-db-muted sm:px-6 sm:pb-6">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-db-up" /> Verified
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-amber-400" /> Mismatch
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-zinc-400" /> Unknown
        </span>
        <span className="hidden sm:inline">· {items.length} programs on devnet</span>
      </div>
    </div>
  );
}
