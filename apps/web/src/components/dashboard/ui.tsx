import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn, truncateAddress } from "@/lib/utils";
import type { VerificationStatus } from "@/lib/dashboard/records";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-4xl tracking-tight sm:text-5xl lg:text-[56px] lg:leading-none">
          {title}
        </h1>
        {description && <p className="mt-3 max-w-2xl text-[15px] text-db-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Mid-grey glass card, as the Overview and count cards in the reference. */
export function Card({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("rounded-[22px] bg-db-card p-6 text-db-card-fg", className)} {...props}>
      {children}
    </div>
  );
}

/** Near-black card used for the table and chart panels. */
export function BlackCard({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("rounded-[22px] bg-db-black p-6 text-white", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <h2 className={cn("text-[22px] leading-tight tracking-tight", className)}>{children}</h2>;
}

export function ArrowLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  const external = href.startsWith("http");
  const cls = cn(
    "flex h-8 w-8 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105 outline-none focus-visible:ring-2 focus-visible:ring-db-accent/60",
    className,
  );
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={cls}>
      <ArrowUpRight className="h-4 w-4" />
    </a>
  ) : (
    <Link href={href} aria-label={label} className={cls}>
      <ArrowUpRight className="h-4 w-4" />
    </Link>
  );
}

export function Kpi({
  value,
  label,
  delta,
  tone = "up",
  className,
  testId,
}: {
  value: string;
  label: string;
  delta?: string;
  tone?: "up" | "down" | "flat";
  className?: string;
  testId?: string;
}) {
  return (
    <div
      className={cn("min-w-0", className)}
      data-testid={testId}
      data-value={value}
      data-delta={delta}
    >
      <div className="flex items-start gap-2">
        <span className="text-[34px] leading-none tracking-tight">{value}</span>
        {delta && (
          <span
            className={cn(
              "mt-1 text-xs",
              tone === "up" && "text-db-up",
              tone === "down" && "text-db-down",
              tone === "flat" && "text-db-card-muted",
            )}
          >
            {delta}
          </span>
        )}
      </div>
      <div className="mt-2 text-[15px] text-db-card-muted">{label}</div>
    </div>
  );
}

const STATUS_DOT: Record<VerificationStatus, string> = {
  Verified: "bg-db-up",
  Mismatch: "bg-amber-400",
  Unknown: "bg-zinc-400",
};

export function StatusDot({
  status,
  className,
}: {
  status: VerificationStatus;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-2 w-2 rounded-full", STATUS_DOT[status], className)}
    />
  );
}

export function StatusPill({ status }: { status: VerificationStatus }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <StatusDot status={status} />
      {status}
    </span>
  );
}

export function Address({
  value,
  href,
  lead = 6,
  tail = 5,
  className,
}: {
  value: string;
  href?: string;
  lead?: number;
  tail?: number;
  className?: string;
}) {
  const text = truncateAddress(value, lead, tail);
  if (!href) return <span className={cn("font-mono text-xs", className)}>{text}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={value}
      className={cn(
        "inline-flex items-center gap-1 font-mono text-xs underline-offset-4 hover:underline outline-none focus-visible:ring-2 focus-visible:ring-db-accent/50 rounded-sm",
        className,
      )}
    >
      {text}
      <ArrowUpRight aria-hidden="true" className="h-3 w-3 opacity-60" />
    </a>
  );
}

export function Pills<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-1 rounded-full bg-white/5 p-1 text-sm"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full px-3 py-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-db-accent/60",
            value === o.value ? "text-white" : "text-white/50 hover:text-white/80",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-white/60">
      {children}
    </p>
  );
}

/** Translucent card with a top-left light sweep and a hairline border, on top of the mid-grey card colour. */
export function GlassCard({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[22px] border border-white/10 bg-db-card text-db-card-fg shadow-[0_24px_48px_-28px_rgba(0,0,0,0.65)]",
        className,
      )}
      {...props}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_0%_0%,rgba(255,255,255,0.16),transparent_55%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/25"
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/** One number with an icon, as the KPI tiles on the overview. Carries data attributes for the test suite. */
export function StatWidget({
  icon: Icon,
  value,
  label,
  note,
  tone = "flat",
  testId,
  className,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  note?: string;
  tone?: "up" | "down" | "flat";
  testId?: string;
  className?: string;
}) {
  return (
    <GlassCard
      className={cn("p-5", className)}
      data-testid={testId}
      data-value={value}
      data-delta={note}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        {note && (
          <span
            className={cn(
              "mt-1 text-xs",
              tone === "up" && "text-db-up",
              tone === "down" && "text-db-down",
              tone === "flat" && "text-db-card-muted",
            )}
          >
            {note}
          </span>
        )}
      </div>
      <div className="mt-6 text-[36px] leading-none tracking-tight">{value}</div>
      <div className="mt-2 text-[15px] text-db-card-muted">{label}</div>
    </GlassCard>
  );
}
