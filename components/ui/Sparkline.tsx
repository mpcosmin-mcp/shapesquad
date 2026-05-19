/* Tiny SVG sparkline — optional hover/touch inline label. */
'use client';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { MONTHS_RO_LOW } from '@/lib/utils';

interface Props {
  values: (number | null)[];
  /** When provided, hover/touch shows inline value+date label */
  dates?: string[];
  unit?: string;
  width?: number;
  height?: number;
  color?: string;
  showDots?: boolean;
  className?: string;
}

export function Sparkline({
  values, dates, unit = '', width = 120, height = 32,
  color = '#818cf8', showDots = false, className,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const present = values.filter((v): v is number => v != null);
  if (present.length < 2) {
    return <div className={cn('text-[10px] text-[var(--color-fg-faint)] italic', className)}>insuficient</div>;
  }

  const min = Math.min(...present);
  const max = Math.max(...present);
  const range = max - min || 1;
  const padY = 4;

  const pts = values.map((v, i) => {
    if (v == null) return null;
    const x = (i / Math.max(values.length - 1, 1)) * width;
    const y = height - padY - ((v - min) / range) * (height - padY * 2);
    return { x, y, v };
  });

  let d = '';
  let prev: { x: number; y: number } | null = null;
  for (const p of pts) {
    if (!p) { prev = null; continue; }
    d += prev ? ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    prev = p;
  }

  const interactive = !!dates && dates.length === values.length;

  const updateHoverFromClientX = (clientX: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = clientX - rect.left;
    const xInSvg = (relX / rect.width) * width;
    let bestIdx: number | null = null;
    let bestDist = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (!p) continue;
      const dist = Math.abs(p.x - xInSvg);
      if (dist < bestDist) { bestDist = dist; bestIdx = i; }
    }
    setHoverIdx(bestIdx);
  };

  const lastVisible = [...pts].reverse().find(p => p) ?? null;
  const hoveredPt = hoverIdx != null ? pts[hoverIdx] : null;
  const hoveredDate = interactive && hoverIdx != null ? dates![hoverIdx] : null;

  const labelText = hoveredPt
    ? (() => {
        let s = `${hoveredPt.v}${unit}`;
        if (hoveredDate) {
          const d2 = new Date(hoveredDate + 'T12:00:00');
          s += ` · ${d2.getDate()} ${MONTHS_RO_LOW[d2.getMonth()]}`;
        }
        return s;
      })()
    : '';

  const labelOnRight = hoveredPt ? hoveredPt.x < width / 2 : true;
  const labelX = hoveredPt ? (labelOnRight ? hoveredPt.x + 6 : hoveredPt.x - 6) : 0;
  const labelY = hoveredPt ? hoveredPt.y + 3 : 0;

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible select-none', interactive && 'cursor-crosshair', className)}
      onMouseMove={interactive ? (e) => updateHoverFromClientX(e.clientX) : undefined}
      onMouseLeave={interactive ? () => setHoverIdx(null) : undefined}
      onTouchStart={interactive ? (e) => {
        const t = e.touches[0]; if (t) updateHoverFromClientX(t.clientX);
      } : undefined}
      onTouchMove={interactive ? (e) => {
        const t = e.touches[0]; if (t) { e.preventDefault(); updateHoverFromClientX(t.clientX); }
      } : undefined}
    >
      <path d={d} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {showDots && pts.map((p, i) => p && (
        <circle key={i} cx={p.x} cy={p.y} r={1.5} fill={color} />
      ))}

      {lastVisible && hoverIdx !== values.length - 1 && (
        <circle cx={lastVisible.x} cy={lastVisible.y} r={2.5} fill={color} />
      )}

      {hoveredPt && (
        <g pointerEvents="none">
          <circle cx={hoveredPt.x} cy={hoveredPt.y} r={5} fill={color} opacity={0.18} />
          <circle
            cx={hoveredPt.x} cy={hoveredPt.y} r={2.8}
            fill={color}
            stroke="var(--color-bg)"
            strokeWidth={1.2}
          />
          <text
            x={labelX}
            y={labelY}
            fontSize="9.5"
            fontWeight="700"
            textAnchor={labelOnRight ? 'start' : 'end'}
            fill={color}
            fontFamily="monospace"
            paintOrder="stroke"
            stroke="var(--color-bg)"
            strokeWidth="3"
            strokeLinejoin="round"
          >
            {labelText}
          </text>
        </g>
      )}
    </svg>
  );
}
