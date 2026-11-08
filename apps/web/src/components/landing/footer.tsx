import Link from "next/link";
import { GITHUB_URL, SAS_URL, VALIDATION_URL } from "@/lib/site";

export function LandingFooter() {
  return (
    <footer className="mt-10 flex flex-col gap-4 border-t border-white/15 pt-6 text-[12px] text-white/60 sm:flex-row sm:items-center sm:justify-between">
      <span>© {new Date().getUTCFullYear()} Kenmark · MIT licensed</span>
      <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
        <Link href="/dashboard" className="hover:text-white">
          Dashboard
        </Link>
        <Link href="/docs" className="hover:text-white">
          Docs
        </Link>
        <a
          href={VALIDATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white"
        >
          Validation artifact
        </a>
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white">
          GitHub
        </a>
        <a href={SAS_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white">
          Solana Attestation Service
        </a>
      </nav>
    </footer>
  );
}
