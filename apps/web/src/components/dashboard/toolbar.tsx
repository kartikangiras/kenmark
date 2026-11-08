"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Download, RefreshCw, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

const base =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-db-accent/60";

/** Refresh re-renders the server page (live devnet reads included); Export downloads the records; Share copies the URL. */
export function Toolbar() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        className={cn(base, "bg-db-black px-5 text-white hover:bg-db-black/90")}
      >
        Refresh
        <RefreshCw className={cn("h-4 w-4", pending && "animate-spin")} />
      </button>
      <a
        href="/api/export"
        download
        aria-label="Export attestation records as JSON"
        title="Export JSON"
        className={cn(base, "w-10 bg-db-black text-white hover:bg-db-black/90")}
      >
        <Download className="h-4 w-4" />
      </a>
      <button
        type="button"
        onClick={share}
        aria-label={copied ? "Link copied" : "Copy link to this page"}
        title="Copy link"
        className={cn(base, "w-10 bg-db-black text-white hover:bg-db-black/90")}
      >
        {copied ? <Check className="h-4 w-4 text-db-up" /> : <Share2 className="h-4 w-4" />}
      </button>
    </>
  );
}
