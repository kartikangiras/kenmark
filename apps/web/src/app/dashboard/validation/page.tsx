import { Download } from "lucide-react";
import { checkTotals, loadReports } from "@/lib/dashboard/reports";
import { formatIso } from "@/lib/format";
import { VALIDATION_URL } from "@/lib/site";
import { BlackCard, Card, CardTitle, EmptyNote, Kpi, PageHeader } from "@/components/dashboard/ui";
import { Markdown } from "@/components/dashboard/markdown";
import { cn } from "@/lib/utils";

export const revalidate = 60;

function Badge({ pass }: { pass: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-xs uppercase tracking-wider",
        pass ? "bg-db-up/15 text-db-up" : "bg-db-down/15 text-db-down",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("h-1.5 w-1.5 rounded-full", pass ? "bg-db-up" : "bg-db-down")}
      />
      {pass ? "PASS" : "FAIL"}
    </span>
  );
}

export default function ValidationPage() {
  const reports = loadReports();
  const checks = checkTotals(reports);
  const latest = reports.reduce((max, r) => (r.modifiedAt > max ? r.modifiedAt : max), "");

  return (
    <>
      <PageHeader
        title="Validation"
        description="The reports written by npm run devnet:validate and npm run devnet:cross-check, rendered from the markdown in validation/test-results. Nothing here is mocked; every transaction signature resolves on devnet."
        actions={
          <a
            href="/api/export"
            download
            className="inline-flex h-10 items-center gap-2 rounded-full bg-db-black px-5 text-sm text-white hover:bg-db-black/90 outline-none focus-visible:ring-2 focus-visible:ring-db-accent/60"
          >
            Export records
            <Download className="h-4 w-4" />
          </a>
        }
      />

      {reports.length === 0 ? (
        <EmptyNote>No reports found. Run the validation suite to generate them.</EmptyNote>
      ) : (
        <>
          <Card className="mb-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Kpi
                testId="kpi-checks"
                value={`${checks.passed}/${checks.total}`}
                label="Checks passed"
                tone={checks.passed === checks.total ? "up" : "down"}
              />
              <Kpi
                value={String(reports.filter((r) => r.result).length)}
                label="Synthetic tests"
                tone="flat"
              />
              <Kpi
                value={String(reports.reduce((n, r) => n + r.roundTrips.length, 0))}
                label="Registry round-trips"
                tone="flat"
              />
              <div className="min-w-0">
                <div className="text-[15px] text-db-card-muted">Last generated</div>
                <div className="mt-1 text-sm">{latest ? formatIso(latest) : "—"}</div>
                <a
                  href={VALIDATION_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs text-db-card-muted underline underline-offset-4"
                >
                  Source on GitHub
                </a>
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            {reports.map((report, i) => (
              <BlackCard
                key={report.file}
                className="p-0"
                data-testid="report"
                data-result={report.result ?? "mixed"}
              >
                <details open={i === 0} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 outline-none focus-visible:ring-2 focus-visible:ring-db-accent/60 rounded-[22px]">
                    <div className="min-w-0">
                      <CardTitle>{report.title}</CardTitle>
                      <p className="mt-1 font-mono text-xs text-white/40">
                        {report.file} · {formatIso(report.modifiedAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {report.result && <Badge pass={report.result === "PASS"} />}
                      {report.roundTrips.map((rt) => (
                        <span
                          key={rt.subject}
                          className="inline-flex items-center gap-2 text-xs text-white/70"
                        >
                          {rt.subject} <Badge pass={rt.pass} />
                        </span>
                      ))}
                      <span
                        aria-hidden="true"
                        className="ml-2 text-white/40 transition-transform group-open:rotate-180"
                      >
                        ▾
                      </span>
                    </div>
                  </summary>
                  <div className="border-t border-white/10 px-6 py-6">
                    <Markdown>{report.markdown}</Markdown>
                  </div>
                </details>
              </BlackCard>
            ))}
          </div>
        </>
      )}
    </>
  );
}
