"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronsUpDown, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUtc } from "@/lib/format";
import type { SourceRow } from "@/lib/dashboard/records";
import { Pills, StatusDot } from "./ui";

type Filter = "all" | "synthetic" | "real-world";
type SortKey = "label" | "attestations" | "programs" | "latestTimestamp";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "synthetic", label: "Synthetic" },
  { value: "real-world", label: "Real-world" },
] as const;

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "label", label: "Source" },
  { key: "attestations", label: "Attestations", align: "right" },
  { key: "programs", label: "Programs", align: "right" },
  { key: "latestTimestamp", label: "Latest verification" },
];

export function SourceTable({ rows }: { rows: SourceRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "attestations", dir: -1 });

  const visible = useMemo(() => {
    const filtered = filter === "all" ? rows : rows.filter((r) => r.source === filter);
    return [...filtered].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const cmp =
        typeof av === "string" && typeof bv === "string"
          ? av.localeCompare(bv)
          : Number(av) - Number(bv);
      return cmp * sort.dir;
    });
  }, [rows, filter, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "label" ? 1 : -1 },
    );

  const total = visible.reduce((n, r) => n + r.attestations, 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[22px] tracking-tight">Attestations by source</h2>
        <Pills options={FILTERS} value={filter} onChange={setFilter} label="Filter sources" />
      </div>
      <div className="db-scroll overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-white/50">
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={
                    sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"
                  }
                  className={cn("pb-3 pr-4 font-normal", c.align === "right" && "text-right")}
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
                Status
              </th>
              <th scope="col" className="pb-3 font-normal">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={r.test}
                className="border-t border-white/5"
                data-testid="source-row"
                data-test={r.test}
                data-label={r.label}
              >
                <td className="py-3 pr-4">
                  <div>{r.label}</div>
                  <div className="font-mono text-xs text-white/40">
                    {r.test} · v{r.schemaVersions.join(", v")}
                  </div>
                </td>
                <td className="py-3 pr-4 text-right tabular-nums">{r.attestations}</td>
                <td className="py-3 pr-4 text-right tabular-nums">
                  {r.programs}{" "}
                  <span className="text-xs text-db-up">
                    ({total ? Math.round((r.attestations / total) * 100) : 0}%)
                  </span>
                </td>
                <td className="py-3 pr-4 whitespace-nowrap text-white/70">
                  {formatUtc(r.latestTimestamp)}
                </td>
                <td className="py-3 pr-4">
                  <span className="inline-flex items-center gap-2">
                    {r.statuses.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 text-xs text-white/70"
                      >
                        <StatusDot status={s} /> {s}
                      </span>
                    ))}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <Link
                    href={`/dashboard/attestations?test=${encodeURIComponent(r.test)}`}
                    aria-label={`Open attestations from ${r.label}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white outline-none focus-visible:ring-2 focus-visible:ring-db-accent/60"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
