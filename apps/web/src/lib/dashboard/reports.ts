import "server-only";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const REPORTS_DIR = join(process.cwd(), "../../validation/test-results");

export interface Report {
  file: string;
  title: string;
  /** PASS, FAIL, or null for the cross-check narrative, which carries per-program results instead. */
  result: "PASS" | "FAIL" | null;
  /** Per-program round-trip results found in the body (cross-check report). */
  roundTrips: { subject: string; pass: boolean }[];
  markdown: string;
  modifiedAt: string;
}

const ORDER = [
  "data-fidelity-report.md",
  "multi-issuer-isolation-report.md",
  "memcmp-filter-accuracy-report.md",
  "binary-roundtrip-report.md",
  "cross-validation-report.md",
  "schema-version-compatibility-report.md",
  "real-world-cross-check-report.md",
];

export function loadReports(): Report[] {
  let files: string[];
  try {
    files = readdirSync(REPORTS_DIR).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  files.sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99));

  return files.map((file) => {
    const path = join(REPORTS_DIR, file);
    const markdown = readFileSync(path, "utf8");
    const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? file;
    const headline = markdown.match(/\*\*Result:\s*(PASS|FAIL)\*\*/);
    const roundTrips = [
      ...markdown.matchAll(
        /^###\s+(.+?)\s+\(`[^`]+`\)[\s\S]*?\*\*Round-trip result:\*\*\s*(PASS|FAIL)/gm,
      ),
    ].map((m) => ({ subject: m[1], pass: m[2] === "PASS" }));
    return {
      file,
      title,
      result: headline ? (headline[1] as "PASS" | "FAIL") : null,
      roundTrips,
      markdown,
      modifiedAt: statSync(path).mtime.toISOString(),
    };
  });
}

export interface CheckTotals {
  passed: number;
  total: number;
}

/** Headline PASS/FAIL results plus the cross-check's per-program round trips. */
export function checkTotals(reports: Report[]): CheckTotals {
  let passed = 0;
  let total = 0;
  for (const r of reports) {
    if (r.result) {
      total++;
      if (r.result === "PASS") passed++;
    }
    for (const rt of r.roundTrips) {
      total++;
      if (rt.pass) passed++;
    }
  }
  return { passed, total };
}
