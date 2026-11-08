"use client";

import { useState } from "react";
import type { SourceRow } from "@/lib/dashboard/records";
import { ComboChart } from "./charts";
import { Pills } from "./ui";

type Filter = "all" | "synthetic" | "real-world";
const FILTERS = [
  { value: "all", label: "All" },
  { value: "synthetic", label: "Synthetic" },
  { value: "real-world", label: "Real-world" },
] as const;

const SHORT: Record<string, string> = {
  "test1-fidelity": "T1",
  "test2-multi-issuer": "T2",
  "test3-memcmp": "T3",
  "test4-roundtrip": "T4",
  "test5-cross-validation": "T5",
  "test6-schema-version": "T6",
  "registry-cross-check": "Registry",
};

export function PerTestChart({ rows }: { rows: SourceRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = filter === "all" ? rows : rows.filter((r) => r.source === filter);
  const data = visible.map((r) => ({
    label: SHORT[r.test] ?? r.test,
    bar: r.attestations,
    line: r.programs,
  }));
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[22px] tracking-tight">Attestations per test</h2>
        <Pills options={FILTERS} value={filter} onChange={setFilter} label="Filter tests" />
      </div>
      <ComboChart data={data} barLabel="attestations" lineLabel="programs" />
    </div>
  );
}
