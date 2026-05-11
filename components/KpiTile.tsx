'use client';

interface SeriesPoint {
  iso: string;
  val: number;
}

interface Props {
  label: string;
  unit: string;
  series: SeriesPoint[];
  lowerIsBetter?: boolean;
  active?: boolean;
  onClick?: () => void;
  /** When true, makes the value smaller (used inside dense grids). */
  compact?: boolean;
}

export default function KpiTile({
  label,
  unit,
  series,
  lowerIsBetter = false,
  active = false,
  onClick,
  compact = false,
}: Props) {
  const hasData = series.length > 0;
  const latest = hasData ? series[series.length - 1].val : null;
  const first = hasData ? series[0].val : null;
  const previous = series.length > 1 ? series[series.length - 2].val : null;

  const startDelta = first != null && latest != null ? latest - first : null;
  const recentDelta = previous != null && latest != null ? latest - previous : null;

  const direction: 'good' | 'bad' | 'neutral' =
    startDelta == null || Math.abs(startDelta) < 0.15
      ? 'neutral'
      : (lowerIsBetter ? startDelta < 0 : startDelta > 0)
      ? 'good'
      : 'bad';

  const sparkColor =
    direction === 'good' ? 'var(--good)' : direction === 'bad' ? 'var(--bad)' : 'var(--fg-faint)';

  const deltaClass =
    direction === 'good' ? 'delta delta-good' : direction === 'bad' ? 'delta delta-bad' : 'delta delta-neutral';

  const chartW = 100;
  const chartH = 28;
  const padY = 3;
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
    linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
    lastDot = pts[pts.length - 1];
  }

  const numClass = compact ? 'text-xl' : 'text-2xl';

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      onClick={onClick}
      className={`card text-left w-full p-3 transition-all ${
        onClick ? 'card-interactive' : ''
      } ${active ? 'ring-2 ring-offset-0' : ''}`}
      style={
        active
          ? ({
              borderColor: 'var(--fg)',
              boxShadow: 'var(--shadow-panel-hover)',
            } as React.CSSProperties)
          : undefined
      }
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="label text-[9px]">{label}</span>
        {recentDelta != null && Math.abs(recentDelta) >= 0.05 ? (
          <span className={`${deltaClass} text-[9px] px-1.5 py-0`}>
            <span aria-hidden>{recentDelta < 0 ? '↓' : '↑'}</span>
            {recentDelta > 0 ? '+' : ''}
            {recentDelta.toFixed(1)}
          </span>
        ) : null}
      </div>

      <div className="flex items-baseline gap-1 mb-1.5">
        <span
          className={`num font-semibold ${numClass} leading-none tabular-nums`}
          style={{ color: hasData ? 'var(--fg)' : 'var(--fg-faint)' }}
        >
          {latest != null ? latest.toFixed(1) : '—'}
        </span>
        <span className="text-[10px] text-fg-muted">{unit}</span>
      </div>

      <div className="h-6 -mx-0.5">
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
              strokeWidth={1.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {lastDot && (
              <circle
                cx={lastDot.x}
                cy={lastDot.y}
                r={1.8}
                fill={sparkColor}
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
        ) : (
          <div className="h-full flex items-center text-[9px] text-fg-faint">·</div>
        )}
      </div>
    </Wrapper>
  );
}
