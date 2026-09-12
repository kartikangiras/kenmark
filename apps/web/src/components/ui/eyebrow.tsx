import { cn } from "@/lib/utils";

/**
 * The rule-plus-mono-label that opens every section in this design system.
 * The rule is decorative, so it is hidden from assistive tech.
 */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3 font-mono text-sm text-muted-foreground", className)}>
      <span aria-hidden="true" className="h-px w-12 bg-current opacity-40" />
      {children}
    </span>
  );
}
