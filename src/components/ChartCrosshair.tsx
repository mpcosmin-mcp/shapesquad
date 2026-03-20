import { useCallback, useRef, useState } from 'react';

// ── TradingView-style crosshair cursor for Recharts ──

/** Extract 1st-of-month ticks + formatter showing "sept. 25" style labels */
export function monthTicks(data: { isoDate: string; date: string }[]): { ticks: string[]; fmt: (val: string) => string } {
  const seen = new Set<string>();
  const ticks: string[] = [];
  const labelMap = new Map<string, string>();
  for (const d of data) {
    const key = d.isoDate.slice(0, 7); // "YYYY-MM"
    if (!seen.has(key)) {
      seen.add(key);
      const target = key + '-01';
      const closest = data.reduce((best, p) =>
        Math.abs(new Date(p.isoDate).getTime() - new Date(target).getTime()) <
        Math.abs(new Date(best.isoDate).getTime() - new Date(target).getTime()) ? p : best
      );
      if (!ticks.includes(closest.date)) {
        ticks.push(closest.date);
        const dt = new Date(closest.isoDate);
        const label = dt.toLocaleDateString('ro-RO', { month: 'short', year: '2-digit' });
        labelMap.set(closest.date, label);
      }
    }
  }
  return { ticks, fmt: (val: string) => labelMap.get(val) || val };
}

/** Vertical crosshair line — use as <Tooltip cursor={<CrosshairCursor />} /> */
export function CrosshairCursor({ points, height }: any) {
  if (!points?.length) return null;
  const x = points[0].x;
  return (
    <g>
      <line x1={x} y1={0} x2={x} y2={height}
        stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="4 3" />
      <line x1={x} y1={0} x2={x} y2={height}
        stroke="rgba(255,255,255,0.04)" strokeWidth={20} />
    </g>
  );
}

/** Floating badge tooltip — TradingView/Revolut style */
export function FloatingTooltip({ active, payload, label, unit, color }: any) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  if (val == null) return null;

  return (
    <div style={{
      background: 'rgba(15,23,42,0.95)',
      backdropFilter: 'blur(12px)',
      border: `1px solid ${color || 'rgba(255,255,255,0.1)'}`,
      borderRadius: 12,
      padding: '8px 12px',
      boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 15px ${color || 'rgba(59,130,246,0.15)'}`,
      minWidth: 90,
    }}>
      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 2, fontFamily: 'Montserrat' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, fontSize: 16, color: color || '#fff' }}>
        {Number(val).toFixed(1)}{unit ? <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 2 }}>{unit}</span> : null}
      </div>
    </div>
  );
}

/** Multi-line tooltip for Trends (multiple people) */
export function MultiTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div style={{
      background: 'rgba(15,23,42,0.95)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: '8px 12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      minWidth: 100,
    }}>
      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 4, fontFamily: 'Montserrat' }}>
        {label}
      </div>
      {payload.filter((p: any) => p.value != null).map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <div style={{ width: 6, height: 6, borderRadius: 3, background: p.color, flexShrink: 0 }} />
          <span style={{ fontFamily: 'Montserrat', fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>{p.name || p.dataKey}</span>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 800, color: '#fff', marginLeft: 'auto' }}>
            {Number(p.value).toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Timeframe bar showing calendar month range, duration, and data density */
export function TimeframeBar({ firstIso, lastIso, days, realCount, color }: {
  firstIso: string; lastIso: string; days: number; realCount: number; color: string;
}) {
  if (days < 1) return null;
  // Snap to 1st of month for calendar-style display
  const snapFirst = new Date(firstIso);
  snapFirst.setDate(1);
  const snapLast = new Date(lastIso);
  snapLast.setDate(1);
  snapLast.setMonth(snapLast.getMonth() + 1); // 1st of next month

  const calDays = Math.round((snapLast.getTime() - snapFirst.getTime()) / 86400000);
  const fmt = (d: Date) => d.toLocaleDateString('ro-RO', { month: 'short', year: '2-digit' });
  const months = Math.round(calDays / 30);
  const label = months < 2 ? `${calDays}d` : `${months} luni`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, padding: '0 2px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', fontWeight: 700, color }}>{fmt(snapFirst)}</span>
        <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.04)', borderRadius: 1, minWidth: 40, position: 'relative', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 1, background: `linear-gradient(90deg, ${color}40, ${color})`, width: '100%' }} />
        </div>
        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', fontWeight: 700, color }}>{fmt(snapLast)}</span>
      </div>
      <span style={{ fontSize: 8, fontFamily: 'JetBrains Mono', color: '#475569', marginLeft: 8 }}>
        {label} · {realCount} măsurători
      </span>
    </div>
  );
}

/** Squad BF trend tooltip (single line, average) */
export function SquadTooltip({ active, payload, label, color }: any) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  if (val == null) return null;

  return (
    <div style={{
      background: 'rgba(15,23,42,0.95)',
      backdropFilter: 'blur(12px)',
      border: `1px solid ${color || 'rgba(59,130,246,0.3)'}`,
      borderRadius: 12,
      padding: '8px 12px',
      boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 10px ${color || 'rgba(59,130,246,0.15)'}`,
    }}>
      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 2, fontFamily: 'Montserrat' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, fontSize: 16, color: color || '#3b82f6' }}>
        {Number(val).toFixed(1)}<span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 2 }}>% avg</span>
      </div>
    </div>
  );
}
