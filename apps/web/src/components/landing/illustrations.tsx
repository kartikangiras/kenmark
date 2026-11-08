/** Line-art for the three pillar cards: one white stroke, grey translucent planes. */

const stroke = { fill: "none", stroke: "white", strokeWidth: 1.2 } as const;
const plane = {
  fill: "rgba(255,255,255,0.08)",
  stroke: "rgba(255,255,255,0.18)",
  strokeWidth: 0.8,
} as const;

export function SchemaGlyph() {
  return (
    <svg viewBox="0 0 220 180" aria-hidden="true" className="h-44 w-auto">
      <polygon points="40,150 180,150 110,60" {...plane} transform="translate(0,-10)" />
      <polygon points="20,140 200,140 110,95" {...plane} />
      <polygon points="55,30 165,30 110,150" {...stroke} />
      <circle cx="110" cy="30" r="7" fill="white" />
    </svg>
  );
}

export function FunnelGlyph() {
  return (
    <svg viewBox="0 0 220 180" aria-hidden="true" className="h-44 w-auto">
      <line x1="110" y1="10" x2="110" y2="170" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <ellipse cx="110" cy="50" rx="78" ry="26" {...stroke} />
      <ellipse cx="110" cy="92" rx="48" ry="16" {...plane} />
      <ellipse cx="110" cy="92" rx="48" ry="16" {...stroke} strokeOpacity="0.6" />
      <ellipse cx="110" cy="124" rx="24" ry="9" {...plane} />
      <circle cx="110" cy="150" r="7" fill="white" />
    </svg>
  );
}

export function OrbitGlyph() {
  return (
    <svg viewBox="0 0 220 180" aria-hidden="true" className="h-44 w-auto">
      <ellipse cx="100" cy="100" rx="70" ry="26" {...plane} transform="rotate(-38 100 100)" />
      <line x1="30" y1="90" x2="190" y2="90" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <line x1="110" y1="20" x2="110" y2="160" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <ellipse cx="118" cy="86" rx="78" ry="28" {...stroke} transform="rotate(-38 118 86)" />
      <circle cx="110" cy="90" r="7" fill="white" />
    </svg>
  );
}

/** Wireframe attestation cards for the lookup section, drawn in grey on the light panel. */
export function WireCards() {
  const s = { fill: "none", stroke: "#3b3b40", strokeWidth: 1 } as const;
  return (
    <svg viewBox="0 0 520 420" aria-hidden="true" className="h-full w-full">
      <g transform="rotate(-14 300 220)">
        <rect x="150" y="90" width="300" height="190" rx="22" {...s} />
        <rect x="162" y="102" width="276" height="166" rx="16" {...s} strokeDasharray="3 4" />
        <path d="M190 140h14v90h-14zM212 140h22l-16 22 16 22h-22z" fill="#1a1a1a" />
        <line x1="190" y1="212" x2="400" y2="212" {...s} />
        <line x1="190" y1="232" x2="340" y2="232" {...s} />
        <line x1="190" y1="252" x2="370" y2="252" {...s} />
      </g>
      <g transform="rotate(8 240 300)">
        <rect x="70" y="200" width="300" height="190" rx="22" {...s} fill="#e4e4e6" />
        <rect x="82" y="212" width="276" height="166" rx="16" {...s} strokeDasharray="3 4" />
        <path d="M110 250h14v90h-14zM132 250h22l-16 22 16 22h-22z" fill="#1a1a1a" />
        <line x1="110" y1="322" x2="320" y2="322" {...s} />
        <line x1="110" y1="342" x2="260" y2="342" {...s} />
        <circle cx="330" cy="236" r="5" fill="#34d399" />
      </g>
    </svg>
  );
}

/** Wireframe credential panels for the issuer section. */
export function WirePanels() {
  const s = { fill: "none", stroke: "#3b3b40", strokeWidth: 1 } as const;
  const panel = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="150" height="320" rx="16" {...s} fill="#e4e4e6" />
      <rect x={x + 10} y={y + 10} width="130" height="300" rx="10" {...s} strokeDasharray="3 4" />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={x + 36 + i * 24} cy={y + 40} r="6" {...s} />
      ))}
      <path
        d={`M${x + 50} ${y + 150}h14v60h-14zM${x + 72} ${y + 150}h22l-16 15 16 15h-22z`}
        fill="#1a1a1a"
      />
      <line x1={x + 30} y1={y + 250} x2={x + 120} y2={y + 250} {...s} />
      <line x1={x + 30} y1={y + 268} x2={x + 100} y2={y + 268} {...s} />
    </g>
  );
  return (
    <svg viewBox="0 0 520 420" aria-hidden="true" className="h-full w-full">
      {panel(90, 40)}
      {panel(220, 90)}
      {panel(350, 20)}
    </svg>
  );
}
