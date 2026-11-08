"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Pills } from "./ui";

export const PRESETS = [
  { label: "Phoenix", programId: "PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY" },
  { label: "Marinade", programId: "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD" },
  { label: "Kamino", programId: "KaminoLendkCC8gK7iCK6oCEQaefsUEC1BeXKcm5cVc" },
  { label: "SPL Token", programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
] as const;

type Mode = "program" | "credential" | "authority";

const MODES = [
  { value: "program", label: "Program" },
  { value: "credential", label: "Credential" },
  { value: "authority", label: "Wallet" },
] as const;

const PLACEHOLDER: Record<Mode, string> = {
  program: "Paste a program ID to verify on devnet",
  credential: "Paste your SAS credential address",
  authority: "Paste your wallet address",
};

const LABEL: Record<Mode, string> = {
  program: "Program ID",
  credential: "Credential address",
  authority: "Wallet address",
};

/** The verify controls as their own band under the dashboard title. Submits to the Verify page. */
export function VerifyBar() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("program");
  const [value, setValue] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = value.trim();
    if (id) router.push(`/dashboard/verify?${mode}=${encodeURIComponent(id)}`);
  };

  return (
    <section
      aria-labelledby="verify-heading"
      data-testid="verify-bar"
      className="mb-6 rounded-[22px] bg-db-black p-5 text-white sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="verify-heading" className="text-[22px] leading-tight tracking-tight">
            Verify
          </h2>
          <p className="mt-1 text-sm text-white/55">
            A program, a credential, or a wallet. Read live from devnet, nothing stored.
          </p>
        </div>
        <div className="rounded-full bg-white/5 p-1">
          <Pills options={MODES} value={mode} onChange={setMode} label="What to verify" />
        </div>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="field-program" className="sr-only">
          {LABEL[mode]}
        </label>
        <input
          id="field-program"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={PLACEHOLDER[mode]}
          spellCheck={false}
          autoComplete="off"
          className="h-12 flex-1 rounded-full border border-white/15 bg-white/5 px-5 font-mono text-sm text-white placeholder:text-white/35 outline-none focus-visible:ring-2 focus-visible:ring-db-accent/60"
        />
        <button
          type="submit"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-db-accent px-6 text-sm text-white transition-colors hover:bg-db-accent/90 outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          Verify
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.programId}
            type="button"
            onClick={() => router.push(`/dashboard/verify?program=${p.programId}`)}
            className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/75 transition-colors hover:bg-white/10 hover:text-white outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            {p.label}
          </button>
        ))}
        <Link
          href="/dashboard/verify?mode=credential"
          className="rounded-full border border-db-accent/50 px-3 py-1 text-xs text-db-accent transition-colors hover:bg-db-accent/10 outline-none focus-visible:ring-2 focus-visible:ring-db-accent/50"
        >
          Check your own credential →
        </Link>
      </div>
    </section>
  );
}
