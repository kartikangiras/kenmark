import { cn } from "@/lib/utils";

function path(
  values: number[],
  width: number,
  height: number,
  pad = 4,
): { d: string; points: [number, number][] } {
  if (values.length === 0) return { d: "", points: [] };
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const stepX = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  const points = values.map<[number, number]>((v, i) => [
    pad + i * stepX,
    height - pad - ((v - min) / span) * (height - pad * 2),
  ]);
  return {
    d: points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" "),
    points,
  };
}

/** Small line with a soft fill, as under the PO/PR counts in the reference. */
export function Sparkline({
  values,
  tone = "up",
  className,
  label,
}: {
  values: number[];
  tone?: "up" | "down";
  className?: string;
  label: string;
}) {
  const width = 220;
  const height = 72;
  const { d, points } = path(values, width, height);
  const last = points[points.length - 1];
  const color = tone === "up" ? "#34d399" : "#ff6b81";
  const id = `spark-${tone}`;
  return (
    <div className={cn("db-grid rounded-md", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label}
        className="h-[72px] w-full"
      >
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {d && (
          <>
            <path
              d={`${d} L${last[0]},${height} L${points[0][0]},${height} Z`}
              fill={`url(#${id})`}
            />
            <path
              d={d}
              fill="none"
              stroke="white"
              strokeOpacity="0.9"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeDasharray="0"
              opacity="0.8"
            />
            <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />
          </>
        )}
      </svg>
    </div>
  );
}

export interface ShareItem {
  label: string;
  value: number;
  pct: number;
  dotted?: boolean;
}

/** Side-by-side percentage blocks, as the Key Suppliers card in the reference. */
export function ShareBars({ items, label }: { items: ShareItem[]; label: string }) {
  const max = Math.max(...items.map((i) => i.pct), 1);
  return (
    <div role="img" aria-label={label} className="flex items-end gap-2">
      {items.map((item) => {
        const h = 36 + (item.pct / max) * 84;
        return (
          <div
            key={item.label}
            className="flex min-w-0 flex-1 flex-col"
            data-testid="share-item"
            data-label={item.label}
            data-pct={Math.round(item.pct)}
          >
            <span className="mb-2 text-[26px] leading-none tracking-tight">
              {Math.round(item.pct)}%
            </span>
            <div
              className={cn(
                "w-full rounded-sm border-t-2 border-db-accent",
                item.dotted
                  ? "bg-[radial-gradient(rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:6px_6px]"
                  : "bg-gradient-to-b from-white/25 to-white/5",
              )}
              style={{ height: `${h}px` }}
            />
            <span className="mt-2 truncate text-sm text-db-card-muted">
              {item.label} <span className="text-white/40">· {item.value}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export interface ComboDatum {
  label: string;
  bar: number;
  line: number;
}

/** Bars with a line over them, as the invoice chart in the reference. */
export function ComboChart({
  data,
  barLabel,
  lineLabel,
  highlight,
}: {
  data: ComboDatum[];
  barLabel: string;
  lineLabel: string;
  highlight?: number;
}) {
  const width = 640;
  const height = 240;
  const left = 56;
  const bottom = 34;
  const top = 28;
  const innerW = width - left - 12;
  const innerH = height - top - bottom;
  const maxBar = Math.max(...data.map((d) => d.bar), 1);
  const ticks = 3;
  const niceMax = Math.ceil(maxBar / ticks) * ticks;
  const slot = data.length ? innerW / data.length : innerW;
  const barW = Math.min(64, slot * 0.62);

  const y = (v: number) => top + innerH - (v / niceMax) * innerH;
  const linePts = data.map<[number, number]>((d, i) => [left + slot * i + slot / 2, y(d.line)]);
  const lineD = linePts
    .map(([x, py], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${py.toFixed(1)}`)
    .join(" ");
  const hi = highlight ?? data.reduce((best, d, i, arr) => (d.line > arr[best].line ? i : best), 0);

  return (
    <figure data-testid="combo-chart" data-bars={data.length}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${barLabel} and ${lineLabel} per group`}
        className="w-full"
      >
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const v = (niceMax / ticks) * i;
          return (
            <g key={i}>
              <line
                x1={left}
                x2={width - 12}
                y1={y(v)}
                y2={y(v)}
                stroke="white"
                strokeOpacity="0.08"
                strokeDasharray="2 4"
              />
              <text
                x={left - 10}
                y={y(v) + 4}
                textAnchor="end"
                fontSize="12"
                fill="rgba(255,255,255,0.5)"
              >
                {v}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = left + slot * i + (slot - barW) / 2;
          const h = innerH * (d.bar / niceMax);
          return (
            <g key={d.label}>
              <rect x={x} y={y(d.bar)} width={barW} height={h} rx="3" fill="url(#combo-bar)" />
              <rect x={x} y={y(d.bar)} width={barW} height="2" fill="#ff4a6b" />
              <text
                x={x + barW / 2}
                y={height - 10}
                textAnchor="middle"
                fontSize="13"
                fill="rgba(255,255,255,0.6)"
              >
                {d.label}
              </text>
            </g>
          );
        })}
        <defs>
          <linearGradient id="combo-bar" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.28" />
            <stop offset="100%" stopColor="white" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {data.length > 1 && (
          <path d={lineD} fill="none" stroke="white" strokeOpacity="0.85" strokeWidth="1.5" />
        )}
        {data.length > 0 && (
          <g>
            <circle cx={linePts[hi][0]} cy={linePts[hi][1]} r="3.5" fill="white" />
            <text
              x={linePts[hi][0]}
              y={linePts[hi][1] - 12}
              textAnchor="middle"
              fontSize="13"
              fill="white"
            >
              {data[hi].line} {lineLabel}
            </text>
          </g>
        )}
      </svg>
      <figcaption className="mt-2 flex items-center gap-4 text-xs text-white/50">
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block h-2 w-3 rounded-sm bg-white/30 border-t border-db-accent"
          />{" "}
          {barLabel}
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-px w-4 bg-white/80" /> {lineLabel}
        </span>
      </figcaption>
    </figure>
  );
}
