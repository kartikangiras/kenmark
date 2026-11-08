"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sankey,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatUtc, formatUtcDate } from "@/lib/format";
import { explorerAddressUrl, explorerTxUrl } from "@/lib/site";
import { truncateAddress } from "@/lib/utils";
import type { RecentSignature } from "@/lib/dashboard/chain";
import type { Summary, VerificationStatus } from "@/lib/dashboard/records";
import { Address, BlackCard, CardTitle, EmptyNote, Pills } from "./ui";

export interface ExplorerRecord {
  attestation: string;
  subject: string;
  source: "synthetic" | "real-world";
  test: string;
  status: VerificationStatus;
  credential: string;
  schemaVersion: number;
  verificationTimestamp: number;
  programIdBase58: string | null;
}

type View = "timeline" | "flow" | "status" | "programs" | "transactions";

const VIEWS = [
  { value: "timeline", label: "Timeline" },
  { value: "flow", label: "Flow" },
  { value: "status", label: "Status mix" },
  { value: "programs", label: "By program" },
  { value: "transactions", label: "Transactions" },
] as const;

const STATUS_COLOR: Record<VerificationStatus, string> = {
  Verified: "#34d399",
  Mismatch: "#fbbf24",
  Unknown: "#a1a1aa",
};
const ACCENT = "#ff4a6b";
const GRID = "rgba(255,255,255,0.08)";
const AXIS = "rgba(255,255,255,0.5)";

const tooltipStyle = {
  contentStyle: {
    background: "#0e0e10",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    fontSize: 12,
  },
  labelStyle: { color: "rgba(255,255,255,0.6)" },
  itemStyle: { color: "#fff" },
};

function groupOf(r: ExplorerRecord): string {
  return r.programIdBase58 ? r.subject : "Synthetic tests";
}

export function ExplorerCharts({
  records,
  sources,
  issuers,
  summary,
  signatures,
}: {
  records: ExplorerRecord[];
  sources: { test: string; label: string; attestations: number; programs: number }[];
  issuers: { credential: string; label: string; attestations: number }[];
  summary: Summary;
  signatures: RecentSignature[] | null;
}) {
  const [view, setView] = useState<View>("timeline");

  const timeline = useMemo(() => {
    const dated = records
      .filter((r) => r.verificationTimestamp > 0)
      .sort((a, b) => a.verificationTimestamp - b.verificationTimestamp);
    let total = 0;
    let verified = 0;
    return dated.map((r) => {
      total++;
      if (r.status === "Verified") verified++;
      return {
        ts: r.verificationTimestamp,
        label: formatUtcDate(r.verificationTimestamp),
        total,
        verified,
        subject: r.subject,
      };
    });
  }, [records]);

  const statusMix = useMemo(
    () =>
      (["Verified", "Mismatch", "Unknown"] as const).map((status) => ({
        name: status,
        value: summary.byStatus[status],
      })),
    [summary],
  );

  const byProgram = useMemo(() => {
    const groups = new Map<
      string,
      { name: string; Verified: number; Mismatch: number; Unknown: number }
    >();
    for (const r of records) {
      const key = groupOf(r);
      const g = groups.get(key) ?? { name: key, Verified: 0, Mismatch: 0, Unknown: 0 };
      g[r.status]++;
      groups.set(key, g);
    }
    return [...groups.values()].sort(
      (a, b) => b.Verified + b.Mismatch + b.Unknown - (a.Verified + a.Mismatch + a.Unknown),
    );
  }, [records]);

  const sankey = useMemo(() => {
    const issuerNames = issuers.map((i) => i.label);
    const statuses = ["Verified", "Mismatch", "Unknown"];
    const groups = [...new Set(records.map(groupOf))];
    const nodes = [...issuerNames, ...statuses, ...groups].map((name) => ({ name }));
    const index = (name: string) => nodes.findIndex((n) => n.name === name);
    const links = new Map<string, { source: number; target: number; value: number }>();
    const add = (a: string, b: string) => {
      const key = `${a}→${b}`;
      const link = links.get(key) ?? { source: index(a), target: index(b), value: 0 };
      link.value++;
      links.set(key, link);
    };
    for (const r of records) {
      const issuer = issuers.find((i) => i.credential === r.credential)?.label ?? "issuer";
      add(issuer, r.status);
      add(r.status, groupOf(r));
    }
    return { nodes, links: [...links.values()] };
  }, [records, issuers]);

  return (
    <div data-testid="explorer" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-db-muted">View</span>
        <div className="rounded-full bg-db-black p-1">
          <Pills options={VIEWS} value={view} onChange={setView} label="Explorer view" />
        </div>
      </div>

      {view === "timeline" && (
        <BlackCard data-testid="explorer-chart" data-view="timeline">
          <CardTitle className="mb-1">Attestations over time</CardTitle>
          <p className="mb-6 text-sm text-white/55">
            Cumulative count by the verification time each issuer attested. Registry rows carry the
            registry&apos;s own date.
          </p>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="exp-total" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="exp-verified" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={STATUS_COLOR.Verified} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={STATUS_COLOR.Verified} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke={AXIS}
                  tick={{ fill: AXIS, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  stroke={AXIS}
                  tick={{ fill: AXIS, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value, name) => [
                    value,
                    name === "total" ? "all attestations" : "verified",
                  ]}
                />
                <Area
                  type="stepAfter"
                  dataKey="total"
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  fill="url(#exp-total)"
                />
                <Area
                  type="stepAfter"
                  dataKey="verified"
                  stroke={STATUS_COLOR.Verified}
                  strokeWidth={1.5}
                  fill="url(#exp-verified)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </BlackCard>
      )}

      {view === "flow" && (
        <BlackCard data-testid="explorer-chart" data-view="flow">
          <CardTitle className="mb-1">Issuer to status to subject</CardTitle>
          <p className="mb-6 text-sm text-white/55">
            Width is the number of attestations following that path.
          </p>
          <div className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <Sankey
                data={sankey}
                nodeWidth={12}
                nodePadding={28}
                linkCurvature={0.5}
                margin={{ top: 10, right: 140, bottom: 10, left: 10 }}
                link={{ stroke: "rgba(255,255,255,0.28)", strokeOpacity: 1 }}
                node={<SankeyNode />}
              >
                <Tooltip {...tooltipStyle} />
              </Sankey>
            </ResponsiveContainer>
          </div>
        </BlackCard>
      )}

      {view === "status" && (
        <BlackCard data-testid="explorer-chart" data-view="status">
          <CardTitle className="mb-1">Status mix</CardTitle>
          <p className="mb-6 text-sm text-white/55">
            {summary.attestations} attestations across {summary.programs} programs and{" "}
            {summary.issuers} issuers.
          </p>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusMix}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="82%"
                  paddingAngle={3}
                  stroke="none"
                >
                  {statusMix.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLOR[entry.name]} />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}
                />
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </BlackCard>
      )}

      {view === "programs" && (
        <BlackCard data-testid="explorer-chart" data-view="programs">
          <CardTitle className="mb-1">By subject</CardTitle>
          <p className="mb-6 text-sm text-white/55">
            Named subjects are real mainnet programs; the synthetic tests attest random program IDs.
          </p>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={byProgram}
                margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
                barCategoryGap="28%"
              >
                <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke={AXIS}
                  tick={{ fill: AXIS, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke={AXIS}
                  tick={{ fill: AXIS, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}
                />
                <Bar
                  dataKey="Verified"
                  stackId="s"
                  fill={STATUS_COLOR.Verified}
                  radius={[0, 0, 0, 0]}
                />
                <Bar dataKey="Mismatch" stackId="s" fill={STATUS_COLOR.Mismatch} />
                <Bar
                  dataKey="Unknown"
                  stackId="s"
                  fill={STATUS_COLOR.Unknown}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-4 text-xs text-white/45">
            {sources.length} sources:{" "}
            {sources.map((s) => `${s.label} (${s.attestations})`).join(" · ")}
          </p>
        </BlackCard>
      )}

      {view === "transactions" && (
        <BlackCard data-testid="explorer-chart" data-view="transactions" className="p-0">
          <div className="p-6">
            <CardTitle className="mb-1">Recent devnet transactions</CardTitle>
            <p className="text-sm text-white/55">
              The latest transactions touching the four showcased attestation accounts, read from
              devnet when this page was rendered.
            </p>
          </div>
          {signatures === null ? (
            <div className="px-6 pb-6" data-testid="tx-unavailable">
              <EmptyNote>Devnet RPC did not answer; try Refresh in a few seconds.</EmptyNote>
            </div>
          ) : (
            <div className="db-scroll overflow-x-auto px-6 pb-6">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-white/50">
                    <th scope="col" className="pb-3 pr-4 font-normal">
                      Time
                    </th>
                    <th scope="col" className="pb-3 pr-4 font-normal">
                      Subject
                    </th>
                    <th scope="col" className="pb-3 pr-4 font-normal">
                      Slot
                    </th>
                    <th scope="col" className="pb-3 pr-4 font-normal">
                      Account
                    </th>
                    <th scope="col" className="pb-3 font-normal">
                      Signature
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {signatures.map((sig) => (
                    <tr
                      key={sig.signature}
                      className="border-t border-white/5"
                      data-testid="tx-row"
                    >
                      <td className="py-3 pr-4 whitespace-nowrap text-white/70">
                        {sig.blockTime ? formatUtc(sig.blockTime) : "—"}
                      </td>
                      <td className="py-3 pr-4">
                        {sig.label}
                        {sig.failed && <span className="ml-2 text-xs text-db-down">failed</span>}
                      </td>
                      <td className="py-3 pr-4 tabular-nums text-white/70">
                        {sig.slot.toLocaleString("en-US")}
                      </td>
                      <td className="py-3 pr-4">
                        <Address value={sig.account} href={explorerAddressUrl(sig.account)} />
                      </td>
                      <td className="py-3">
                        <a
                          href={explorerTxUrl(sig.signature)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-white underline-offset-4 hover:underline"
                        >
                          {truncateAddress(sig.signature, 12, 10)}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </BlackCard>
      )}
    </div>
  );
}

function SankeyNode(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  payload?: { name: string; value?: number };
}) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  const name = payload?.name ?? "";
  const fill =
    name in STATUS_COLOR
      ? STATUS_COLOR[name as VerificationStatus]
      : name.startsWith("issuer")
        ? ACCENT
        : "rgba(255,255,255,0.75)";
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} rx={3} />
      <text
        x={x + width + 8}
        y={y + height / 2}
        dy="0.35em"
        fontSize={12}
        fill="rgba(255,255,255,0.85)"
      >
        {name}
        {payload?.value ? ` · ${payload.value}` : ""}
      </text>
    </g>
  );
}
