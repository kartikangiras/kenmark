/** Deterministic UTC formatting so server and client render the same string. */
export function formatUtc(unixSeconds: number): string {
  if (!unixSeconds) return "—";
  return (
    new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(unixSeconds * 1000)) + " UTC"
  );
}

export function formatUtcDate(unixSeconds: number): string {
  if (!unixSeconds) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(unixSeconds * 1000));
}

export function formatIso(iso: string): string {
  return formatUtc(Math.floor(Date.parse(iso) / 1000));
}

export function percent(part: number, whole: number): string {
  if (!whole) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}
