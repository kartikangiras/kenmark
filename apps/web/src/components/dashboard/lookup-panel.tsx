"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUtc } from "@/lib/format";
import { explorerAddressUrl } from "@/lib/site";
import type { LookupResult } from "@/lib/dashboard/chain";
import type { VerificationStatus } from "@/lib/dashboard/records";
import { PRESETS } from "./program-field";
import { Address, BlackCard, Card, CardTitle, EmptyNote, StatusPill } from "./ui";

type State =
  | { kind: "idle" }
  | { kind: "loading"; program: string; note?: string }
  | { kind: "error"; program: string; message: string }
  | { kind: "done"; result: LookupResult };

const RETRY_DELAYS_MS = [2500, 5000];

function asStatus(name: string): VerificationStatus {
  return name === "Verified" || name === "Mismatch" ? name : "Unknown";
}

export function LookupPanel({ initialProgram }: { initialProgram: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialProgram);
  const [state, setState] = useState<State>({ kind: "idle" });

  const run = useCallback(async (program: string, attempt = 0) => {
    const id = program.trim();
    if (!id) return;
    setState({
      kind: "loading",
      program: id,
      note: attempt ? `RPC rate-limited, retry ${attempt}…` : undefined,
    });
    try {
      const res = await fetch(`/api/lookup?program=${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      const body = (await res.json()) as LookupResult | { error: string; retryable?: boolean };
      if (!res.ok || "error" in body) {
        const retryable = "error" in body && body.retryable;
        if (retryable && attempt < RETRY_DELAYS_MS.length) {
          await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
          return run(id, attempt + 1);
        }
        setState({
          kind: "error",
          program: id,
          message: "error" in body ? body.error : `HTTP ${res.status}`,
        });
        return;
      }
      setState({ kind: "done", result: body });
    } catch (err) {
      setState({
        kind: "error",
        program: id,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  useEffect(() => {
    if (initialProgram) void run(initialProgram);
  }, [initialProgram, run]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = value.trim();
    if (!id) return;
    router.replace(`/dashboard/verify?program=${encodeURIComponent(id)}`);
    void run(id);
  };

  const choose = (programId: string) => {
    setValue(programId);
    router.replace(`/dashboard/verify?program=${programId}`);
    void run(programId);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
      <Card className="self-start">
        <CardTitle className="mb-6">Query devnet</CardTitle>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label htmlFor="lookup-program" className="text-sm text-db-card-muted">
            Program ID
          </label>
          <input
            id="lookup-program"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Base58 program address"
            spellCheck={false}
            autoComplete="off"
            className="h-12 rounded-full border border-white/15 bg-black/30 px-5 font-mono text-sm text-white placeholder:text-white/35 outline-none focus-visible:ring-2 focus-visible:ring-db-accent/60"
          />
          <button
            type="submit"
            disabled={state.kind === "loading"}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-db-accent text-sm text-white transition-colors hover:bg-db-accent/90 disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            {state.kind === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            {state.kind === "loading" ? "Querying devnet…" : "Run the aggregator"}
          </button>
        </form>

        <p className="mb-3 mt-8 text-sm text-db-card-muted">Programs with attestations on devnet</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.programId}
              type="button"
              onClick={() => choose(p.programId)}
              className={cn(
                "rounded-full border border-white/15 px-3 py-1.5 text-xs transition-colors hover:bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                value === p.programId && "bg-white text-black hover:bg-white",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="mt-6 text-xs leading-relaxed text-db-card-muted">
          Attestations are published on devnet; a mainnet program ID is only the subject of the
          record. Any other address returns an empty result rather than an error.
        </p>
      </Card>

      <div className="flex flex-col gap-4">
        {state.kind === "idle" && (
          <BlackCard>
            <EmptyNote>Pick a program or paste an ID to run the live query.</EmptyNote>
          </BlackCard>
        )}

        {state.kind === "loading" && (
          <BlackCard className="flex items-center gap-3 text-sm text-white/70">
            <Loader2 className="h-4 w-4 animate-spin" />{" "}
            {state.note ?? `Querying devnet for ${state.program}…`}
          </BlackCard>
        )}

        {state.kind === "error" && (
          <BlackCard>
            <p role="alert" className="text-sm text-db-down">
              {state.message}
            </p>
          </BlackCard>
        )}

        {state.kind === "done" && <Results result={state.result} />}
      </div>
    </div>
  );
}

function Results({ result }: { result: LookupResult }) {
  return (
    <>
      <BlackCard
        data-testid="lookup-summary"
        data-decoded={result.decoded.length}
        data-excluded={result.excluded.length}
        className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/70"
      >
        <span>
          <span className="text-white">{result.decoded.length}</span> attestation
          {result.decoded.length === 1 ? "" : "s"}
        </span>
        <span>
          <span className="text-white">{result.excluded.length}</span> excluded
        </span>
        <span>
          {result.cached ? "cached" : `${result.elapsedMs} ms`} · {result.cluster} ·{" "}
          {result.rpcHost}
        </span>
        <Address
          value={result.programId}
          href={explorerAddressUrl(result.programId)}
          lead={10}
          tail={8}
          className="ml-auto text-white"
        />
      </BlackCard>

      {result.decoded.length === 0 && result.excluded.length === 0 && (
        <BlackCard data-testid="lookup-empty">
          <EmptyNote>
            No attestations on devnet for this program. The presets on the left all have at least
            one.
          </EmptyNote>
        </BlackCard>
      )}

      {result.decoded.map((d) => (
        <BlackCard
          key={d.attestation}
          data-testid="decoded-attestation"
          data-attestation={d.attestation}
          data-status={d.fields.verificationStatus}
        >
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{d.predicateType}</CardTitle>
              <p className="mt-1 text-sm text-white/50">schema v{d.schemaVersion}</p>
            </div>
            <StatusPill status={asStatus(d.fields.verificationStatus)} />
          </div>
          <dl className="grid gap-x-8 gap-y-2 text-xs sm:grid-cols-[160px_1fr]">
            <dt className="text-white/50">Attestation</dt>
            <dd>
              <Address
                value={d.attestation}
                href={explorerAddressUrl(d.attestation)}
                lead={12}
                tail={10}
                className="text-white"
              />
            </dd>
            <dt className="text-white/50">Issuer credential</dt>
            <dd>
              <Address
                value={d.issuer.credential}
                href={explorerAddressUrl(d.issuer.credential)}
                lead={12}
                tail={10}
              />
            </dd>
            <dt className="text-white/50">Issuer authority</dt>
            <dd>
              <Address
                value={d.issuer.authority}
                href={explorerAddressUrl(d.issuer.authority)}
                lead={12}
                tail={10}
              />
            </dd>
            <dt className="text-white/50">Binary hash</dt>
            <dd className="break-all font-mono">{d.fields.binaryHash}</dd>
            <dt className="text-white/50">Source commit</dt>
            <dd className="break-all font-mono">
              {d.fields.sourceCommit || <span className="text-white/40">(empty)</span>}
            </dd>
            <dt className="text-white/50">Verification time</dt>
            <dd>{formatUtc(d.fields.verificationTimestamp)}</dd>
          </dl>
        </BlackCard>
      ))}

      {result.excluded.length > 0 && (
        <BlackCard>
          <CardTitle className="mb-3">Excluded records</CardTitle>
          <ul className="space-y-2 text-xs text-white/70">
            {result.excluded.map((e) => (
              <li key={e.attestation}>
                <Address value={e.attestation} href={explorerAddressUrl(e.attestation)} /> —{" "}
                {e.reason}
              </li>
            ))}
          </ul>
        </BlackCard>
      )}
    </>
  );
}
