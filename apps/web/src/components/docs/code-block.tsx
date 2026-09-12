import { cn } from "@/lib/utils";

/**
 * Labeled code panel — the same faux-window chrome as the playground preview,
 * so terminal and file samples read as one family across the site. Children
 * may be a plain string or JSX spans (used to color verdict lines).
 */
export function CodeBlock({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("overflow-hidden border border-foreground/10 bg-black", className)}>
      <div className="flex items-center gap-2 border-b border-foreground/10 px-4 py-3">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-foreground/20" />
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-foreground/20" />
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-foreground/20" />
        <span className="ml-2 font-mono text-xs text-muted-foreground">{title}</span>
      </div>
      <pre className="overflow-x-auto p-4 lg:p-6 font-mono text-xs lg:text-sm leading-relaxed text-foreground/80">
        <code>{children}</code>
      </pre>
    </div>
  );
}
