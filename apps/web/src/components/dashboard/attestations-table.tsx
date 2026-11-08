"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUtc } from "@/lib/format";
import { explorerAddressUrl, explorerTxUrl } from "@/lib/site";
import {
  TEST_LABELS,
  type AttestationRecord,
  type VerificationStatus,
} from "@/lib/dashboard/records";
import { Address, Pills, StatusPill } from "./ui";

type StatusFilter = "all" | VerificationStatus;
type SourceFilter = "all" | "synthetic" | "real-world";
type SortKey = "subject" | "status" | "schemaVersion" | "verificationTimestamp";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "Verified", label: "Verified" },
  { value: "Mismatch", label: "Mismatch" },
  { value: "Unknown", label: "Unknown" },
] as const;

const SOURCE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "synthetic", label: "Synthetic" },
  { value: "real-world", label: "Real-world" },
] as const;

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "subject", label: "Subject" },
  { key: "status", label: "Status" },
  { key: "schemaVersion", label: "Schema" },
  { key: "verificationTimestamp", label: "Verified at" },
];

function asStatusFilter(v: string | undefined): StatusFilter {
  return v === "Verified" || v === "Mismatch" || v === "Unknown" ? v : "all";
}

export function AttestationsTable({
  records,
  initialTest,
  initialStatus,
}: {
  records: AttestationRecord[];
  initialTest?: string;
  initialStatus?: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>(asStatusFilter(initialStatus));
  const [source, setSource] = useState<SourceFilter>("all");
  const [test, setTest] = useState<string>(
    initialTest && TEST_LABELS[initialTest] ? initialTest : "all",
  );
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: "verificationTimestamp",
    dir: -1,
  });
  const [open, setOpen] = useState<Set<string>>(new Set());

  const tests = useMemo(() => [...new Set(records.map((r) => r.test))], [records]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = records.filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (source === "all" || r.source === source) &&
        (test === "all" || r.test === test) &&
        (!q ||
          r.subject.toLowerCase().includes(q) ||
          r.attestation.toLowerCase().includes(q) ||
          (r.programIdBase58 ?? "").toLowerCase().includes(q) ||
          r.programIdHex.includes(q) ||
          r.sourceCommit.toLowerCase().includes(q)),
    );
    return filtered.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const cmp =
        typeof av === "string" && typeof bv === "string"
          ? av.localeCompare(bv)
          : Number(av) - Number(bv);
      return cmp * sort.dir;
    });
  }, [records, query, status, source, test, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 1 ? -1 : 1 }
        : { key, dir: key === "verificationTimestamp" ? -1 : 1 },
    );

  const toggleOpen = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="rounded-[22px] bg-db-black p-6 text-white">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block w-full lg:max-w-sm">
          <span className="sr-only">Search attestations</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subject, program, address, commit"
            spellCheck={false}
            className="h-11 w-full rounded-full border border-white/10 bg-white/5 pl-11 pr-4 text-sm placeholder:text-white/35 outline-none focus-visible:ring-2 focus-visible:ring-db-accent/60"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Pills
            options={STATUS_OPTIONS}
            value={status}
            onChange={setStatus}
            label="Filter by status"
          />
          <Pills
            options={SOURCE_OPTIONS}
            value={source}
            onChange={setSource}
            label="Filter by source"
          />
          <label className="inline-flex items-center gap-2 text-sm text-white/60">
            <span className="sr-only">Filter by test</span>
            <select
              value={test}
              onChange={(e) => setTest(e.target.value)}
              className="h-9 rounded-full border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-db-accent/60"
            >
              <option value="all" className="bg-db-black">
                All tests
              </option>
              {tests.map((t) => (
                <option key={t} value={t} className="bg-db-black">
                  {TEST_LABELS[t] ?? t}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <p className="mb-3 text-xs text-white/40">
        {visible.length} of {records.length} attestations
      </p>

      <div className="db-scroll overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-white/50">
              <th scope="col" className="w-8 pb-3" />
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={
                    sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"
                  }
                  className="pb-3 pr-4 font-normal"
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(c.key)}
                    className="inline-flex items-center gap-1 uppercase hover:text-white outline-none focus-visible:ring-2 focus-visible:ring-db-accent/60 rounded-sm"
                  >
                    {c.label}
                    <ChevronsUpDown
                      className={cn("h-3 w-3", sort.key === c.key ? "text-white" : "opacity-50")}
                    />
                  </button>
                </th>
              ))}
              <th scope="col" className="pb-3 pr-4 font-normal">
                Issuer
              </th>
              <th scope="col" className="pb-3 font-normal">
                Attestation
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const expanded = open.has(r.attestation);
              return (
                <RowGroup
                  key={r.attestation}
                  record={r}
                  expanded={expanded}
                  onToggle={() => toggleOpen(r.attestation)}
                />
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-white/50">
                  Nothing matches those filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowGroup({
  record: r,
  expanded,
  onToggle,
}: {
  record: AttestationRecord;
  expanded: boolean;
  onToggle: () => void;
}) {
  const detailId = `att-${r.attestation}`;
  return (
    <>
      <tr
        className="border-t border-white/5"
        data-testid="attestation-row"
        data-attestation={r.attestation}
        data-status={r.status}
        data-ts={r.verificationTimestamp}
      >
        <td className="py-3 pr-2">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={detailId}
            aria-label={expanded ? "Hide details" : "Show details"}
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white outline-none focus-visible:ring-2 focus-visible:ring-db-accent/60"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
          </button>
        </td>
        <td className="py-3 pr-4">
          <div>{r.subject}</div>
          <div className="font-mono text-xs text-white/40">
            {r.programIdBase58 ? r.programIdBase58 : `${r.programIdHex.slice(0, 12)}… (hex)`}
          </div>
        </td>
        <td className="py-3 pr-4">
          <StatusPill status={r.status} />
        </td>
        <td className="py-3 pr-4 tabular-nums">v{r.schemaVersion}</td>
        <td className="py-3 pr-4 whitespace-nowrap text-white/70">
          {formatUtc(r.verificationTimestamp)}
        </td>
        <td className="py-3 pr-4">
          <Address value={r.credential} href={explorerAddressUrl(r.credential)} />
        </td>
        <td className="py-3">
          <Address
            value={r.attestation}
            href={explorerAddressUrl(r.attestation)}
            className="text-white"
          />
        </td>
      </tr>
      {expanded && (
        <tr id={detailId} className="bg-white/[0.03]" data-testid="attestation-detail">
          <td />
          <td colSpan={6} className="py-4 pr-4">
            <dl className="grid gap-x-8 gap-y-2 text-xs sm:grid-cols-[140px_1fr]">
              <dt className="text-white/50">Source</dt>
              <dd>
                {TEST_LABELS[r.test] ?? r.test} <span className="text-white/40">({r.source})</span>
              </dd>
              <dt className="text-white/50">Binary hash</dt>
              <dd className="break-all font-mono">{r.binaryHash}</dd>
              <dt className="text-white/50">Source commit</dt>
              <dd className="break-all font-mono">
                {r.sourceCommit || <span className="text-white/40">(empty)</span>}
              </dd>
              <dt className="text-white/50">Schema</dt>
              <dd>
                <Address value={r.schema} href={explorerAddressUrl(r.schema)} lead={10} tail={8} />
              </dd>
              <dt className="text-white/50">Publish transaction</dt>
              <dd>
                <Address
                  value={r.publishSignature}
                  href={explorerTxUrl(r.publishSignature)}
                  lead={12}
                  tail={10}
                />
              </dd>
              {r.registry && (
                <>
                  <dt className="text-white/50">Registry</dt>
                  <dd>
                    {r.registry.message}
                    {r.registry.repoUrl && (
                      <>
                        {" · "}
                        <a
                          href={r.registry.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-4"
                        >
                          source repo
                        </a>
                      </>
                    )}
                  </dd>
                </>
              )}
            </dl>
          </td>
        </tr>
      )}
    </>
  );
}
