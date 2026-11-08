import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/shell";

export const metadata: Metadata = {
  title: "Kenmark Dashboard — devnet attestations",
  description:
    "Every VerifiedBuild attestation Kenmark has published on Solana devnet, the validation suite behind them, and a live lookup against the chain.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
