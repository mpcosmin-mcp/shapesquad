'use client';

/**
 * MetricCard — Sleep-tracker pattern
 *
 * Each card shows ONE metric for ONE user:
 *  - Big number (current value)
 *  - Delta vs first (start) and vs previous
 *  - SVG area chart absolutely positioned as background
 *  - Tiny dot strip below showing recent history
 *  - Border + accent tinted by direction (emerald=good, rose=bad)
 *
 * No Recharts here — pure SVG keeps it ultra-light.
 */

interface SeriesPoint {
  iso: string; // YYYY-MM-DD
  val: number;
}

export interface MetricCardProps {
  label: string;
  icon: string;
  unit: string;
  series: SeriesPoint[]; // chronological, oldest first
  lowerIsBetter?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

function classifyDirection(
  startDelta: number | null,
  lower: boolean
): 'good' | 'bad' | 'neutral' {
  if (startDelta == null || Math.abs(startDelta) < 0.15) return 'neutral';
  return (lower ? startDelta < 0 : startDelta > 0) ? 'good' : 'bad';
}

function colorOf(direction: 'good' | 'bad' | 'neutral'): string {
  return direction === 'good'
    ? 'var(--emerald)'
    : direction === 'bad'
    ? 'var(--rose)'
    : 'var(--cyan)';
}

export default function MetricCard({
  label,
  icon,
  unit,
  series,
  lowerIsBetter = false,
  size = 'md',
}: MetricCardProps) {
  const hasData = series.length > 0;
  const latest = hasData ? series[series.length - 1].val : null;
  const first = hasData ? series[0].val : null;
  const previous = series.length > 1 ? series[series.length - 2].val : null;

  const startDelta = first != null && latest != null ? latest - first : null;
  const recentDelta = previous != null && latest != null ? latest - previous : null;
  const direction = classifyDirection(startDelta, lowerIsBetter);
  const color = colorOf(direction);
  const arrow =
    startDelta == null
      ? '·'
      : Math.abs(startDelta) < 0.15
      ? '→'
      : (lowerIsBetter ? startDelta < 0 : startDelta > 0)
      ? '↘'
      : '↗';
  const arrowFlipped =
    !lowerIsBetter && startDelta != null && startDelta > 0 ? '↗' : arrow;

  // Build SVG path for area chart (background)
  const chartW = 400;
  const chartH = 100;
  const padY = 8;
  let areaPath = '';
  let linePath = '';
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
    linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    areaPath =
      linePath +
      ` L ${chartW} ${chartH} L 0 ${chartH} Z`;
  }

  // History dots (last 10)
  const histDots = series.slice(-10);
  let histMin = 0;
  let histMax = 1;
  if (histDots.length >= 2) {
    const vals = histDots.map((d) => d.val);
    histMin = Math.min(...vals);
    histMax = Math.max(...vals);
  }
  const histRange = Math.max(histMax - histMin, 0.01);

  const numClass =
    size === 'lg'
      ? 'text-5xl md:text-6xl'
      : size === 'sm'
      ? 'text-2xl'
      : 'text-3xl md:text-4xl';
  const padClass = size === 'lg' ? 'p-4' : size === 'sm' ? 'p-3' : 'p-3.5';

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${padClass} flex flex-col justify-between min-h-[140px] transition-all`}
      style={{
        background: hasData
          ? `linear-gradient(180deg, color-mix(in srgb, ${color} 6%, var(--card)), var(--card) 70%)`
          : 'var(--card)',
        borderColor: hasData
          ? `color-mix(in srgb, ${color} 24%, var(--border))`
          : 'var(--border)',
        boxShadow: 'var(--shadow-panel)',
      }}
    >
      {/* ═══ BACKGROUND CHART ═══ */}
      {areaPath && (
        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden
        >
          <defs>
            <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="65%" stopColor={color} stopOpacity={0.08} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#grad-${label})`} />
          <path d={linePath} stroke={color} strokeWidth={1.5} fill="none" opacity={0.55} />
        </svg>
      )}

      {/* ═══ FOREGROUND CONTENT ═══ */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm leading-none">{icon}</span>
          <span className="label">{label}</span>
        </div>
        {hasData && (
          <span
            className="font-mono text-[11px] font-bold tabular-nums"
            style={{ color }}
          >
            {arrowFlipped}{' '}
            {startDelta != null && Math.abs(startDelta) >= 0.05
              ? `${startDelta > 0 ? '+' : ''}${startDelta.toFixed(1)}`
              : ''}
          </span>
        )}
      </div>

      <div className="relative flex items-baseline gap-1.5 my-2">
        <span
          className={`font-display font-bold ${numClass} leading-none tabular-nums`}
          style={{ color: hasData ? 'var(--fg)' : 'var(--fg-faint)' }}
        >
          {latest != null ? latest.toFixed(1) : '—'}
        </span>
        <span className="text-[11px] text-fg-muted font-mono">{unit}</span>
        {recentDelta != null && Math.abs(recentDelta) >= 0.1 && (
          <span
            className="ml-auto font-mono text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded"
            style={{
              color,
              background: `color-mix(in srgb, ${color} 16%, transparent)`,
            }}
          >
            {recentDelta > 0 ? '+' : ''}
            {recentDelta.toFixed(1)}
          </span>
        )}
      </div>

      {/* ═══ HISTORY DOTS ═══ */}
      <div className="relative flex items-end gap-[3px] h-5">
        {histDots.length >= 2 ? (
          histDots.map((d, i) => {
            const h = 4 + ((d.val - histMin) / histRange) * 16;
            const isLast = i === histDots.length - 1;
            return (
              <div
                key={d.iso}
                className="flex-1 rounded-sm"
                style={{
                  height: `${h}px`,
                  background: isLast ? color : `color-mix(in srgb, ${color} 35%, transparent)`,
                  minWidth: 3,
                }}
                title={`${d.iso}: ${d.val.toFixed(1)}${unit}`}
              />
            );
          })
        ) : (
          <span className="text-[9px] text-fg-faint italic">
            {hasData ? '1 măsurătoare' : 'nu există date'}
          </span>
        )}
      </div>

      {hasData && (
        <div className="relative text-[9px] text-fg-faint mt-1 font-mono tabular-nums flex justify-between">
          <span>
            start: {first?.toFixed(1)} {unit}
          </span>
          <span>
            {series.length} log{series.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
