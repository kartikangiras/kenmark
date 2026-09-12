import { cn } from "@/lib/utils";

/**
 * Colored dots only, never fills — same rule as the verification status colors
 * in globals.css, so the monochrome system stays intact.
 */
const variants = {
  live: { dot: "bg-status-verified", label: "Live on devnet" },
  dev: { dot: "bg-status-mismatch", label: "In development" },
  soon: { dot: "bg-foreground/60", label: "Soon" },
  planned: { dot: "bg-foreground/25", label: "Planned" },
} as const;

export function StatusBadge({
  status,
  className,
  children,
}: {
  status: keyof typeof variants;
  className?: string;
  children?: React.ReactNode;
}) {
  const variant = variants[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 border border-foreground/15 px-3 py-1 font-mono text-xs uppercase tracking-wider text-muted-foreground",
        className,
      )}
    >
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", variant.dot)} />
      {children ?? variant.label}
    </span>
  );
}
