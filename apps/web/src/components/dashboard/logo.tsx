import { cn } from "@/lib/utils";

/** The Kenmark mark: two offset bars, a nod to a record and its attestation. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("h-8 w-8", className)}
      fill="currentColor"
    >
      <path d="M4 4h8v24H4z" />
      <path d="M16 4h12l-9 12 9 12H16z" opacity="0.9" />
    </svg>
  );
}
