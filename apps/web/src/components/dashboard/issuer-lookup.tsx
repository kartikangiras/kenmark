"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUtc } from "@/lib/format";
import { explorerAddressUrl } from "@/lib/site";
import type { AuthorityLookup, CredentialLookup, CredentialView } from "@/lib/dashboard/chain";
import type { VerificationStatus } from "@/lib/dashboard/records";
import { Address, BlackCard, Card, CardTitle, EmptyNote, Pills, StatusPill } from "./ui";

type Mode = "credential" | "authority";
type State =
  | { kind: "idle" }
  | { kind: "loading"; note?: string }
  | { kind: "error"; message: string }
  | { kind: "credential"; result: CredentialLookup }
  | { kind: "authority"; result: AuthorityLookup };

const MODES = [
  { value: "credential", label: "Credential" },
  { value: "authority", label: "Authority" },
] as const;
const RETRY_DELAYS_MS = [2500, 5000];

export interface IssuerPreset {
  label: string;
  credential: string;
}

function asStatus(name: string): VerificationStatus {
  return name === "Verified" || name === "Mismatch" ? name : "Unknown";
}

function Inner({ presets }: { presets: IssuerPreset[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const initialCredential = params.get("credential") ?? "";
  const initialAuthority = params.get("authority") ?? "";
  const [mode, setMode] = useState<Mode>(initialAuthority ? "authority" : "credential");
  const [value, setValue] = useState(initialAuthority || initialCredential);
  const [state, setState] = useState<State>({ kind: "idle" });

  const run = useCallback(async (m: Mode, raw: string, attempt = 0) => {
    const id = raw.trim();
    if (!id) return;
    setState({
      kind: "loading",
      note: attempt ? `RPC rate-limited, retry ${attempt}…` : undefined,
    });
    try {
      const res = await fetch(`/api/issuer?${m}=${encodeURIComponent(id)}`, { cache: "no-store" });
      const body = (await res.json()) as
        CredentialLookup | AuthorityLookup | { error: string; retryable?: boolean };
      if (!res.ok || "error" in body) {
        const retryable = "error" in body && body.retryable;
        if (retryable && attempt < RETRY_DELAYS_MS.length) {
          await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
          return run(m, id, attempt + 1);
        }
        setState({ kind: "error", message: "error" in body ? body.error : `HTTP ${res.status}` });
        return;
      }
      setState(
        m === "credential"
          ? { kind: "credential", result: body as CredentialLookup }
          : { kind: "authority", result: body as AuthorityLookup },
      );
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  useEffect(() => {
    if (initialAuthority) void run("authority", initialAuthority);
    else if (initialCredential) void run("credential", initialCredential);
  }, [initialAuthority, initialCredential, run]);

  const go = (m: Mode, id: string) => {
    setMode(m);
    setValue(id);
    router.replace(`/dashboard/issuers?${m}=${encodeURIComponent(id)}`, { scroll: false });
    void run(m, id);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    go(mode, value);
  };

  return (
    <div id="lookup" className="grid gap-4 xl:grid-cols-[380px_1fr]" data-testid="issuer-lookup">
      <Card className="self-start">
        <CardTitle className="mb-2">Check your own issuer</CardTitle>
        <p className="mb-6 text-sm text-db-card-muted">
          Any Solana Attestation Service credential on devnet, not only Kenmark&apos;s. Paste a
          credential to see the account and everything published under it, or a wallet to list the
          credentials it controls.
        </p>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Pills options={MODES} value={mode} onChange={setMode} label="Lookup type" />
          <label htmlFor="issuer-address" className="text-sm text-db-card-muted">
            {mode === "credential" ? "Credential address" : "Authority (wallet) address"}
          </label>
          <input
            id="issuer-address"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Base58 address"
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
            {state.kind === "loading" ? "Reading devnet…" : "Read from devnet"}
          </button>
        </form>
        <p className="mb-3 mt-8 text-sm text-db-card-muted">Kenmark&apos;s own credentials</p>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.credential}
              type="button"
              onClick={() => go("credential", p.credential)}
              className={cn(
                "rounded-full border border-white/15 px-3 py-1.5 text-xs transition-colors hover:bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                value === p.credential && "bg-white text-black hover:bg-white",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        {state.kind === "idle" && (
          <BlackCard>
            <EmptyNote>
              Paste a credential or wallet address, or pick one of Kenmark&apos;s credentials.
            </EmptyNote>
          </BlackCard>
        )}
        {state.kind === "loading" && (
          <BlackCard className="flex items-center gap-3 text-sm text-white/70">
            <Loader2 className="h-4 w-4 animate-spin" /> {state.note ?? "Reading devnet…"}
          </BlackCard>
        )}
        {state.kind === "error" && (
          <BlackCard>
            <p role="alert" className="text-sm text-db-down">
              {state.message}
            </p>
          </BlackCard>
        )}
        {state.kind === "credential" && <CredentialResult result={state.result} />}
        {state.kind === "authority" && (
          <AuthorityResult result={state.result} onOpen={(c) => go("credential", c)} />
        )}
      </div>
    </div>
  );
}

function CredentialCard({ view, action }: { view: CredentialView; action?: React.ReactNode }) {
  return (
    <div
      className="flex flex-wrap items-start justify-between gap-4"
      data-testid="credential-card"
      data-credential={view.credential}
    >
      <dl className="grid gap-x-8 gap-y-1 text-xs sm:grid-cols-[140px_1fr]">
        <dt className="text-white/50">Name</dt>
        <dd>
          {view.exists ? (
            view.name || <span className="text-white/40">(empty)</span>
          ) : (
            <span className="text-db-down">No credential account at this address</span>
          )}
        </dd>
        <dt className="text-white/50">Credential</dt>
        <dd>
          <Address
            value={view.credential}
            href={explorerAddressUrl(view.credential)}
            lead={12}
            tail={10}
            className="text-white"
          />
        </dd>
        <dt className="text-white/50">Authority</dt>
        <dd>
          {view.authority ? (
            <Address
              value={view.authority}
              href={explorerAddressUrl(view.authority)}
              lead={12}
              tail={10}
            />
          ) : (
            "—"
          )}
        </dd>
        <dt className="text-white/50">Authorized signers</dt>
        <dd>{view.exists ? view.authorizedSigners.length : "—"}</dd>
      </dl>
      {action}
    </div>
  );
}

function CredentialResult({ result }: { result: CredentialLookup }) {
  return (
    <>
      <BlackCard
        data-testid="credential-summary"
        data-decoded={result.decoded.length}
        data-excluded={result.excluded.length}
      >
        <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/70">
          <span>
            <span className="text-white">{result.decoded.length}</span> decoded attestation
            {result.decoded.length === 1 ? "" : "s"}
          </span>
          <span>
            <span className="text-white">{result.excluded.length}</span> excluded
          </span>
          <span>
            {result.cached ? "cached" : `${result.elapsedMs} ms`} · {result.cluster} ·{" "}
            {result.rpcHost}
          </span>
        </div>
        <CredentialCard view={result.credential} />
      </BlackCard>

      {result.decoded.length === 0 && result.excluded.length === 0 && result.credential.exists && (
        <BlackCard>
          <EmptyNote>This credential exists but has published no attestations on devnet.</EmptyNote>
        </BlackCard>
      )}

      {result.decoded.length > 0 && (
        <BlackCard className="p-0">
          <div className="db-scroll overflow-x-auto p-6">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-white/50">
                  <th scope="col" className="pb-3 pr-4 font-normal">
                    Program
                  </th>
                  <th scope="col" className="pb-3 pr-4 font-normal">
                    Status
                  </th>
                  <th scope="col" className="pb-3 pr-4 font-normal">
                    Schema
                  </th>
                  <th scope="col" className="pb-3 pr-4 font-normal">
                    Verified at
                  </th>
                  <th scope="col" className="pb-3 font-normal">
                    Attestation
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.decoded.map((d) => (
                  <tr
                    key={d.attestation}
                    className="border-t border-white/5"
                    data-testid="credential-row"
                  >
                    <td className="py-3 pr-4">
                      <Address
                        value={d.fields.programId}
                        href={explorerAddressUrl(d.fields.programId)}
                        lead={8}
                        tail={6}
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <StatusPill status={asStatus(d.fields.verificationStatus)} />
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {d.predicateType} v{d.schemaVersion}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap text-white/70">
                      {formatUtc(d.fields.verificationTimestamp)}
                    </td>
                    <td className="py-3">
                      <Address
                        value={d.attestation}
                        href={explorerAddressUrl(d.attestation)}
                        className="text-white"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BlackCard>
      )}

      {result.excluded.length > 0 && (
        <BlackCard>
          <CardTitle className="mb-2">Excluded records</CardTitle>
          <p className="mb-3 text-xs text-white/50">
            Attestations under this credential whose schema Kenmark does not decode yet, or whose
            schema or credential account could not be resolved.
          </p>
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

function AuthorityResult({
  result,
  onOpen,
}: {
  result: AuthorityLookup;
  onOpen: (credential: string) => void;
}) {
  return (
    <>
      <BlackCard
        data-testid="authority-summary"
        data-count={result.credentials.length}
        className="text-sm text-white/70"
      >
        <span className="text-white">{result.credentials.length}</span> credential
        {result.credentials.length === 1 ? "" : "s"} controlled by{" "}
        <Address
          value={result.authority}
          href={explorerAddressUrl(result.authority)}
          lead={10}
          tail={8}
          className="text-white"
        />
        <span className="ml-4">
          {result.cached ? "cached" : `${result.elapsedMs} ms`} · {result.cluster}
        </span>
      </BlackCard>
      {result.credentials.length === 0 && (
        <BlackCard>
          <EmptyNote>No credentials on devnet have this wallet as authority.</EmptyNote>
        </BlackCard>
      )}
      {result.credentials.map((c) => (
        <BlackCard key={c.credential}>
          <CredentialCard
            view={c}
            action={
              <button
                type="button"
                onClick={() => onOpen(c.credential)}
                className="rounded-full bg-white px-4 py-2 text-xs text-black transition-colors hover:bg-white/90 outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                Open attestations
              </button>
            }
          />
        </BlackCard>
      ))}
    </>
  );
}

export function IssuerLookup({ presets }: { presets: IssuerPreset[] }) {
  return (
    <Suspense fallback={null}>
      <Inner presets={presets} />
    </Suspense>
  );
}
