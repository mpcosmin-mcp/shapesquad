'use client';
import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { cn, MONTHS_RO, DAYS_RO_SHORT } from '@/lib/utils';

interface Series {
  name: string;
  color: string;
  /** Aligned with `dates` — same length, null = missing */
  values: (number | null)[];
}

interface Props {
  series: Series[];
  dates: string[];                /** YYYY-MM-DD aligned with series.values */
  height?: number;
  className?: string;
  target?: number;                /** Optional horizontal dashed reference */
  targetLabel?: string;
  unit?: string;
  /** If true, lower values are better (e.g. BF / visceral) — flips delta sign */
  lowerBetter?: boolean;
}

/**
 * Polished team-comparison chart — smooth cubic-Bezier, gradient fill,
 * Y-axis ticks, X-axis date labels, optional target line, hover crosshair
 * + tooltip with per-series values + delta vs target.
 */
export function TeamChart({
  series, dates, height = 280, className,
  target, targetLabel, unit = '', lowerBetter = false,
}: Props) {
  const uid = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const [containerWidth, setContainerWidth] = useState(600);
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setContainerWidth(Math.round(w));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const allValues = useMemo(
    () => series.flatMap(s => s.values).filter((v): v is number => v != null),
    [series],
  );

  const VW = Math.max(320, containerWidth);
  const VH = height;
  const ML = 36;
  const MR = 12;
  const MT = 12;
  const MB = 28;
  const plotW = VW - ML - MR;
  const plotH = VH - MT - MB;

  if (allValues.length < 2 || dates.length < 2) {
    return (
      <div className={cn('flex items-center justify-center text-xs italic text-[var(--color-fg-faint)]', className)} style={{ height }}>
        Date insuficiente pentru chart.
      </div>
    );
  }

  const rawMin = Math.min(...allValues, target ?? Infinity);
  const rawMax = Math.max(...allValues, target ?? -Infinity);
  const pad = Math.max(2, (rawMax - rawMin) * 0.1);
  const yMin = Math.floor(rawMin - pad);
  const yMax = Math.ceil(rawMax + pad);
  const yRange = yMax - yMin || 1;

  const xFor = (i: number) => ML + (i / Math.max(dates.length - 1, 1)) * plotW;
  const yFor = (v: number) => MT + plotH - ((v - yMin) / yRange) * plotH;

  function buildSmoothPath(pts: Array<{ x: number; y: number } | null>): { line: string; area: string } {
    let line = '';
    let area = '';
    const segments: Array<Array<{ x: number; y: number }>> = [];
    let current: Array<{ x: number; y: number }> = [];
    for (const p of pts) {
      if (p) current.push(p);
      else { if (current.length) segments.push(current); current = []; }
    }
    if (current.length) segments.push(current);

    for (const seg of segments) {
      if (seg.length === 1) continue;
      let segLine = `M ${seg[0].x.toFixed(1)} ${seg[0].y.toFixed(1)}`;
      for (let i = 1; i < seg.length; i++) {
        const p0 = seg[i - 1];
        const p1 = seg[i];
        const mx = (p0.x + p1.x) / 2;
        segLine += ` C ${mx.toFixed(1)} ${p0.y.toFixed(1)}, ${mx.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
      }
      line += (line ? ' ' : '') + segLine;
      const baseline = MT + plotH;
      area += (area ? ' ' : '') + `${segLine} L ${seg[seg.length - 1].x.toFixed(1)} ${baseline} L ${seg[0].x.toFixed(1)} ${baseline} Z`;
    }
    return { line, area };
  }

  const seriesGeom = series.map(s => {
    const pts = s.values.map((v, i) => v == null ? null : { x: xFor(i), y: yFor(v) });
    const { line, area } = buildSmoothPath(pts);
    const visiblePts = pts.filter((p): p is { x: number; y: number } => p !== null);
    const validValues = s.values.filter((v): v is number => v != null);
    const avg = validValues.length ? Math.round((validValues.reduce((a, b) => a + b, 0) / validValues.length) * 10) / 10 : null;
    return { ...s, pts, line, area, visiblePts, avg };
  });

  const yTicks: number[] = [];
  for (let i = 0; i <= 3; i++) yTicks.push(yMin + (yRange * i) / 3);

  const labelCount = Math.min(7, dates.length);
  const xLabels: { x: number; label: string }[] = [];
  for (let i = 0; i < labelCount; i++) {
    const idx = Math.floor((i / Math.max(labelCount - 1, 1)) * (dates.length - 1));
    const d = new Date(dates[idx] + 'T12:00:00');
    const label = `${d.getDate()} ${MONTHS_RO[d.getMonth()].toLowerCase()}`;
    xLabels.push({ x: xFor(idx), label });
  }

  const targetY = target != null ? yFor(target) : null;

  const updateHoverFromClientX = (clientX: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = clientX - rect.left;
    const svgX = (relX / rect.width) * VW;
    const t = (svgX - ML) / plotW;
    const idx = Math.round(t * (dates.length - 1));
    if (idx < 0 || idx > dates.length - 1) { setHoverIdx(null); return; }
    setHoverIdx(idx);
  };

  const safeHoverIdx =
    hoverIdx !== null && hoverIdx >= 0 && hoverIdx < dates.length ? hoverIdx : null;

  const hoverX = safeHoverIdx != null ? xFor(safeHoverIdx) : null;
  const hoverPct = hoverX != null ? (hoverX / VW) * 100 : null;

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full block select-none"
        style={{ height }}
        onMouseMove={(e) => updateHoverFromClientX(e.clientX)}
        onMouseLeave={() => setHoverIdx(null)}
        onTouchStart={(e) => { const t = e.touches[0]; if (t) updateHoverFromClientX(t.clientX); }}
        onTouchMove={(e) => { const t = e.touches[0]; if (t) { e.preventDefault(); updateHoverFromClientX(t.clientX); } }}
      >
        <defs>
          <filter id={`shadow-${uid}`} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
            <feOffset dy="1.5" />
            <feComponentTransfer><feFuncA type="linear" slope="0.35" /></feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {seriesGeom.map((s, i) => (
            <linearGradient key={i} id={`grad-${uid}-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.30" />
              <stop offset="60%" stopColor={s.color} stopOpacity="0.08" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* Y-axis grid */}
        {yTicks.map((t, i) => {
          const y = yFor(t);
          return (
            <g key={i}>
              <line x1={ML} x2={VW - MR} y1={y} y2={y} stroke="currentColor" strokeWidth={1} opacity={0.1} vectorEffect="non-scaling-stroke" />
              <text x={ML - 6} y={y + 4} fontSize="10" textAnchor="end" fill="currentColor" opacity={0.5} fontFamily="monospace">
                {Math.round(t)}
              </text>
            </g>
          );
        })}

        {/* Target line */}
        {targetY != null && (
          <g>
            <line x1={ML} x2={VW - MR} y1={targetY} y2={targetY} stroke="currentColor" strokeWidth={1.2} strokeDasharray="4 4" opacity={0.4} vectorEffect="non-scaling-stroke" />
            <text x={VW - MR - 4} y={targetY - 4} fontSize="9" textAnchor="end" fill="currentColor" opacity={0.6} fontFamily="monospace">
              {targetLabel ?? 'target'} {target}
            </text>
          </g>
        )}

        {/* Area fills */}
        {seriesGeom.map((s, i) => s.area && (
          <path key={`area-${i}`} d={s.area} fill={`url(#grad-${uid}-${i})`} />
        ))}

        {/* Lines */}
        {seriesGeom.map((s, i) => s.line && (
          <path
            key={`line-${i}`}
            d={s.line}
            stroke={s.color}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#shadow-${uid})`}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Dots */}
        {seriesGeom.map((s, i) =>
          s.visiblePts.map((p, j) => (
            <circle key={`dot-${i}-${j}`} cx={p.x} cy={p.y} r={3} fill="var(--color-bg)" stroke={s.color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          )),
        )}

        {/* X-axis labels */}
        {xLabels.map((l, i) => (
          <text key={`xlabel-${i}`} x={l.x} y={VH - 8} fontSize="10" textAnchor="middle" fill="currentColor" opacity={0.55} fontFamily="monospace">
            {l.label}
          </text>
        ))}

        {/* Hover layer */}
        {safeHoverIdx !== null && hoverX !== null && (
          <g pointerEvents="none">
            <line x1={hoverX} x2={hoverX} y1={MT} y2={MT + plotH} stroke="currentColor" strokeWidth={1} opacity={0.35} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            {seriesGeom.map((s, i) => {
              const p = s.pts[safeHoverIdx];
              if (!p) return null;
              return (
                <g key={`hover-${i}`}>
                  <circle cx={p.x} cy={p.y} r={7} fill={s.color} opacity={0.18} />
                  <circle cx={p.x} cy={p.y} r={4} fill={s.color} stroke="var(--color-bg)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
                </g>
              );
            })}
          </g>
        )}
      </svg>

      {safeHoverIdx !== null && hoverPct !== null && (
        <Tooltip
          xPct={hoverPct}
          date={dates[safeHoverIdx]}
          series={seriesGeom.map(s => ({ name: s.name, color: s.color, value: s.values[safeHoverIdx] }))}
          unit={unit}
          target={target}
          lowerBetter={lowerBetter}
        />
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 px-1">
        {seriesGeom.map((s, i) => (
          <div key={i} className="flex items-baseline gap-1.5">
            <span className="inline-block w-3 h-0.5 rounded-full" style={{ background: s.color }} aria-hidden />
            <span className="font-bold text-xs" style={{ color: s.color }}>{s.name}</span>
            <span className="num text-[10px] text-[var(--color-fg-muted)]">
              avg {s.avg ?? '—'}{unit && s.avg != null ? unit : ''}
              {target != null && s.avg != null && (() => {
                const delta = lowerBetter ? target - s.avg : s.avg - target;
                if (Math.abs(delta) < 0.5) return null;
                return (
                  <span className={delta > 0 ? 'text-emerald-400 ml-1' : 'text-red-400 ml-1'}>
                    {delta > 0 ? '↑' : '↓'}
                  </span>
                );
              })()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tooltip({
  xPct, date, series, unit, target, lowerBetter,
}: {
  xPct: number;
  date: string;
  series: Array<{ name: string; color: string; value: number | null }>;
  unit: string;
  target?: number;
  lowerBetter?: boolean;
}) {
  const d = new Date(date + 'T12:00:00');
  const dateLabel = `${String(d.getDate()).padStart(2, '0')} ${MONTHS_RO[d.getMonth()]} · ${DAYS_RO_SHORT[d.getDay()]}`;
  const nearLeft = xPct < 15;
  const nearRight = xPct > 85;
  const leftStyle = nearLeft ? '0%' : nearRight ? '100%' : `${xPct}%`;
  const transformStyle = nearLeft ? 'translateX(0)' : nearRight ? 'translateX(-100%)' : 'translateX(-50%)';

  return (
    <div
      className="absolute top-1.5 z-10 pointer-events-none px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-md shadow-2xl shadow-black/40 min-w-[140px]"
      style={{ left: leftStyle, transform: transformStyle }}
    >
      <div className="text-[9px] uppercase tracking-[0.12em] text-[var(--color-fg-muted)] font-bold mb-1.5 num">
        {dateLabel}
      </div>
      <div className="space-y-1">
        {series.map((s, i) => {
          const v = s.value;
          const present = v != null;
          const showDelta = present && target != null;
          const delta = present && target != null
            ? (lowerBetter ? target - v : v - target)
            : null;
          return (
            <div key={i} className="flex items-center gap-2 text-xs leading-tight">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} aria-hidden />
              <span className="font-bold" style={{ color: s.color }}>{s.name}</span>
              <span className="num font-bold ml-auto" style={{ color: present ? s.color : 'var(--color-fg-faint)' }}>
                {present ? v : '—'}{present && unit ? unit : ''}
              </span>
              {showDelta && delta != null && Math.abs(delta) >= 0.5 && (
                <span
                  className="num text-[9px] font-bold"
                  style={{ color: delta > 0 ? 'var(--color-good)' : 'var(--color-bad)' }}
                >
                  {delta > 0 ? '↑' : '↓'}{Math.abs(Math.round(delta * 10) / 10)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
