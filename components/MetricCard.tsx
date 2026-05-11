'use client';

/**
 * MetricCard — Vercel/Stripe/Apple Health minimalist pattern.
 *
 *   ┌──────────────────────────────┐
 *   │ LABEL              [↓ -1.2]  │  ← uppercase muted label + delta pill
 *   │                              │
 *   │ 79.1 kg                      │  ← huge number, neutral color
 *   │                              │
 *   │ ─────────────╱──╲───────╲───  │  ← thin sparkline (2px, no fill)
 *   │ start 80.0 · 8 logs          │  ← muted footer
 *   └──────────────────────────────┘
 *
 * Cards are WHITE on light / dark zinc on dark. No tinted backgrounds.
 * The only color: semantic delta + sparkline accent.
 */

interface SeriesPoint {
  iso: string;
  val: number;
}

export interface MetricCardProps {
  label: string;
  unit: string;
  series: SeriesPoint[]; // chronological, oldest first
  lowerIsBetter?: boolean;
  /** When true, use neutral gray for sparkline (no green/red). */
  monochrome?: boolean;
}

export default function MetricCard({
  label,
  unit,
  series,
  lowerIsBetter = false,
  monochrome = false,
}: MetricCardProps) {
  const hasData = series.length > 0;
  const latest = hasData ? series[series.length - 1].val : null;
  const first = hasData ? series[0].val : null;
  const previous = series.length > 1 ? series[series.length - 2].val : null;

  const startDelta = first != null && latest != null ? latest - first : null;
  const recentDelta = previous != null && latest != null ? latest - previous : null;

  // Determine semantic color
  const direction: 'good' | 'bad' | 'neutral' =
    startDelta == null || Math.abs(startDelta) < 0.15
      ? 'neutral'
      : (lowerIsBetter ? startDelta < 0 : startDelta > 0)
      ? 'good'
      : 'bad';

  const sparkColor = monochrome
    ? 'var(--fg-faint)'
    : direction === 'good'
    ? 'var(--good)'
    : direction === 'bad'
    ? 'var(--bad)'
    : 'var(--fg-faint)';

  const deltaClass =
    direction === 'good' ? 'delta delta-good' : direction === 'bad' ? 'delta delta-bad' : 'delta delta-neutral';

  // Sparkline: pure 2px stroke, no fill
  const chartW = 200;
  const chartH = 40;
  const padY = 6;
  let linePath = '';
  let lastDot: { x: number; y: number } | null = null;
  if (series.length >= 2) {
    const values = series.map((s) => s.val);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, 0.01);
    const pts = series.map((s, i) => {
      const x = (i / (series.length - 1)) * chartW;
      const y = chartH - padY - ((s.val - min) / range) * (chartH - padY * 2);
      return { x, y };
    });
    // Smooth path via simple line segments (chosen for clarity over curve)
    linePath = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(' ');
    lastDot = pts[pts.length - 1];
  }

  const arrow =
    startDelta == null || Math.abs(startDelta) < 0.15
      ? '→'
      : (lowerIsBetter ? startDelta < 0 : startDelta > 0)
      ? '↓'
      : '↑';

  return (
    <div className="card p-4 flex flex-col">
      {/* Header: label + delta */}
      <div className="flex items-center justify-between mb-3">
        <span className="label">{label}</span>
        {recentDelta != null && Math.abs(recentDelta) >= 0.05 ? (
          <span className={deltaClass}>
            <span aria-hidden>{recentDelta < 0 ? '↓' : '↑'}</span>
            {recentDelta > 0 ? '+' : ''}
            {recentDelta.toFixed(1)}
          </span>
        ) : startDelta != null && Math.abs(startDelta) >= 0.15 ? (
          <span className={deltaClass}>
            <span aria-hidden>{arrow}</span>
            {startDelta > 0 ? '+' : ''}
            {startDelta.toFixed(1)}
          </span>
        ) : (
          <span className="delta delta-neutral">—</span>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1.5 mb-3">
        <span
          className="num font-semibold text-3xl leading-none"
          style={{ color: hasData ? 'var(--fg)' : 'var(--fg-faint)' }}
        >
          {latest != null ? latest.toFixed(1) : '—'}
        </span>
        <span className="text-xs text-fg-muted font-medium">{unit}</span>
      </div>

      {/* Sparkline */}
      <div className="h-10 -mx-1 mb-2">
        {linePath ? (
          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            preserveAspectRatio="none"
            className="w-full h-full"
            aria-hidden
          >
            <path
              d={linePath}
              stroke={sparkColor}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {lastDot && (
              <circle
                cx={lastDot.x}
                cy={lastDot.y}
                r={2.5}
                fill={sparkColor}
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
        ) : (
          <div className="h-full flex items-center text-[10px] text-fg-faint">
            {hasData ? 'Are nevoie de 2+ logs' : 'fără date'}
          </div>
        )}
      </div>

      {/* Footer */}
      {hasData && (
        <div className="flex items-center justify-between text-[10px] text-fg-muted font-mono tabular-nums">
          <span>start {first?.toFixed(1)}</span>
          <span>
            {series.length} log{series.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
