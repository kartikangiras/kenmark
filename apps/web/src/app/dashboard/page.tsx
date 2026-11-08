import { allRecords, bySource, issuers, summary } from "@/lib/dashboard/records";
import { checkTotals, loadReports } from "@/lib/dashboard/reports";
import { onChainCounts } from "@/lib/dashboard/chain";
import { formatUtc, percent } from "@/lib/format";
import { GITHUB_URL } from "@/lib/site";
import { Boxes, FileCheck2, ShieldCheck } from "lucide-react";
import {
  ArrowLink,
  BlackCard,
  CardTitle,
  GlassCard,
  Kpi,
  StatWidget,
} from "@/components/dashboard/ui";
import { ShareBars, Sparkline } from "@/components/dashboard/charts";
import { PageHeader } from "@/components/dashboard/ui";
import { Toolbar } from "@/components/dashboard/toolbar";
import { ProgramField } from "@/components/dashboard/program-field";
import { VerifyBar } from "@/components/dashboard/verify-bar";
import { SourceTable } from "@/components/dashboard/source-table";
import { PerTestChart } from "@/components/dashboard/per-test-chart";

// Live devnet reads are refreshed at most once a minute; the Refresh button re-renders on demand.
export const revalidate = 60;

export default async function DashboardPage() {
  const records = allRecords();
  const s = summary();
  const rows = bySource();
  const reports = loadReports();
  const checks = checkTotals(reports);
  const issuerList = issuers();
  const live = await onChainCounts(issuerList.map((i) => i.credential));

  const statusShare = (["Verified", "Mismatch", "Unknown"] as const).map((status) => ({
    label: status,
    value: s.byStatus[status],
    pct: s.attestations ? (s.byStatus[status] / s.attestations) * 100 : 0,
    dotted: status === "Unknown",
  }));

  return (
    <>
      <PageHeader title="Attestation Dashboard" actions={<Toolbar />} />

      <VerifyBar />

      <div className="grid grid-cols-12 gap-4">
        {/* Left column: overview and the two count cards */}
        <div className="col-span-12 flex flex-col gap-4 xl:col-span-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatWidget
              testId="kpi-attestations"
              icon={FileCheck2}
              value={String(s.attestations)}
              label="Attestations"
              note={`${s.bySource["real-world"]} real-world`}
            />
            <StatWidget
              testId="kpi-programs"
              icon={Boxes}
              value={String(s.programs)}
              label="Programs"
              note={`${s.issuers} issuers`}
            />
            <StatWidget
              testId="kpi-checks"
              icon={ShieldCheck}
              value={checks.total ? percent(checks.passed, checks.total) : "—"}
              label="Checks passed"
              note={checks.total ? `${checks.passed}/${checks.total}` : undefined}
              tone={checks.passed === checks.total ? "up" : "down"}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <GlassCard className="flex flex-col p-6">
              <div className="mb-4 flex items-start justify-between">
                <CardTitle>Verified</CardTitle>
                <ArrowLink
                  href="/dashboard/attestations?status=Verified"
                  label="Open verified attestations"
                />
              </div>
              <Kpi
                testId="kpi-verified"
                value={String(s.byStatus.Verified)}
                label=""
                delta={percent(s.byStatus.Verified, s.attestations)}
                tone="up"
              />
              <Sparkline
                values={s.cumulativeVerified}
                tone="up"
                label="Cumulative verified attestations over the validation run"
                className="mt-auto"
              />
            </GlassCard>
            <GlassCard className="flex flex-col p-6">
              <div className="mb-4 flex items-start justify-between">
                <CardTitle>On devnet</CardTitle>
                <ArrowLink href="/dashboard/issuers" label="Open issuers" />
              </div>
              <Kpi
                testId="kpi-ondevnet"
                value={live ? String(live.total) : "—"}
                label=""
                delta={live ? "live" : "RPC unavailable"}
                tone={live ? "up" : "down"}
              />
              <Sparkline
                values={s.cumulative}
                tone="up"
                label="Cumulative attestations over the validation run"
                className="mt-auto"
              />
            </GlassCard>
          </div>
        </div>

        {/* Centre: program field with the live lookup, status card tucked bottom-right */}
        <div className="relative col-span-12 xl:col-span-8">
          <div className="h-full xl:pb-0">
            <ProgramField records={records} />
          </div>
          <GlassCard
            data-testid="status-card"
            className="mt-4 p-6 xl:absolute xl:bottom-6 xl:right-6 xl:mt-0 xl:w-[400px]"
          >
            <div className="mb-1 flex items-start justify-between">
              <CardTitle>Verification status</CardTitle>
              <ArrowLink href="/dashboard/attestations" label="Open all attestations" />
            </div>
            <p className="mb-8 text-[15px] text-db-card-muted">
              <span className="text-db-up">{s.attestations}</span> total attestations
            </p>
            <ShareBars items={statusShare} label="Share of attestations by verification status" />
          </GlassCard>
        </div>

        {/* Bottom-left: table */}
        <BlackCard className="col-span-12 xl:col-span-7">
          <SourceTable rows={rows} />
        </BlackCard>

        {/* Bottom-right: chart and banner */}
        <div className="col-span-12 flex flex-col gap-4 xl:col-span-5">
          <BlackCard>
            <PerTestChart rows={rows} />
          </BlackCard>
          <div
            className="flex items-center justify-between gap-4 rounded-[22px] px-6 py-5 text-white"
            style={{ background: "linear-gradient(90deg, #1b1b1d 0%, #3a0f1a 55%, #ff4a6b 160%)" }}
          >
            <div>
              <p className="text-[15px]">Re-run the whole suite from a clean checkout.</p>
              <p className="mt-1 font-mono text-xs text-white/60">
                npm run devnet:setup · devnet:validate · devnet:cross-check
              </p>
            </div>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-full bg-white px-5 py-2.5 text-sm text-black transition-colors hover:bg-white/90 outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-db-muted">
        Artifact data from <code className="font-mono">validation/</code>, last verification at{" "}
        {formatUtc(s.latestTimestamp)}.
        {live
          ? ` Live counts from ${live.rpcHost} at ${formatUtc(Math.floor(Date.parse(live.fetchedAt) / 1000))}.`
          : ""}
      </p>
    </>
  );
}
