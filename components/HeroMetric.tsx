'use client';

import { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useCountUp } from '@/lib/useCountUp';

interface SeriesPoint {
  iso: string;
  val: number;
}

interface Props {
  label: string;
  unit: string;
  series: SeriesPoint[];
  lowerIsBetter?: boolean;
  /** Color override for the chart stroke/area gradient. */
  accent?: string;
}

type Period = '1L' | '3L' | '6L' | 'Tot';

function filterByPeriod(series: SeriesPoint[], period: Period): SeriesPoint[] {
  if (period === 'Tot' || series.length === 0) return series;
  const months = period === '1L' ? 1 : period === '3L' ? 3 : 6;
  const cutoff = Date.now() - months * 30 * 24 * 60 * 60 * 1000;
  return series.filter((s) => new Date(s.iso).getTime() >= cutoff);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: '2-digit' });
}

export default function HeroMetric({ label, unit, series, lowerIsBetter = false, accent }: Props) {
  const [period, setPeriod] = useState<Period>('Tot');
  const filtered = useMemo(() => filterByPeriod(series, period), [series, period]);

  const hasData = filtered.length > 0;
  const latest = hasData ? filtered[filtered.length - 1].val : null;
  const first = hasData ? filtered[0].val : null;
  const previous = filtered.length > 1 ? filtered[filtered.length - 2].val : null;

  const startDelta = first != null && latest != null ? latest - first : null;
  const recentDelta = previous != null && latest != null ? latest - previous : null;

  const direction: 'good' | 'bad' | 'neutral' =
    startDelta == null || Math.abs(startDelta) < 0.15
      ? 'neutral'
      : (lowerIsBetter ? startDelta < 0 : startDelta > 0)
      ? 'good'
      : 'bad';

  const accentColor =
    accent ??
    (direction === 'good' ? 'var(--good)' : direction === 'bad' ? 'var(--bad)' : 'var(--fg)');

  // Best/worst markers (within filtered window)
  const stats = useMemo(() => {
    if (!hasData) return null;
    let bestIdx = 0;
    let worstIdx = 0;
    filtered.forEach((p, i) => {
      if (lowerIsBetter) {
        if (p.val < filtered[bestIdx].val) bestIdx = i;
        if (p.val > filtered[worstIdx].val) worstIdx = i;
      } else {
        if (p.val > filtered[bestIdx].val) bestIdx = i;
        if (p.val < filtered[worstIdx].val) worstIdx = i;
      }
    });
    return { best: filtered[bestIdx], worst: filtered[worstIdx] };
  }, [filtered, hasData, lowerIsBetter]);

  const animatedVal = useCountUp(latest, 700, 1);

  const arrow = startDelta == null || Math.abs(startDelta) < 0.15
    ? '→'
    : (lowerIsBetter ? startDelta < 0 : startDelta > 0)
    ? '↓'
    : '↑';

  const deltaClass =
    direction === 'good'
      ? 'delta delta-good'
      : direction === 'bad'
      ? 'delta delta-bad'
      : 'delta delta-neutral';

  return (
    <div className="card p-5 md:p-6 relative overflow-hidden">
      {/* ═══ Top row: label + period selector ═══ */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-3">
          <span className="label">{label}</span>
          {recentDelta != null && Math.abs(recentDelta) >= 0.05 && (
            <span className={deltaClass}>
              <span aria-hidden>{recentDelta < 0 ? '↓' : '↑'}</span>
              {recentDelta > 0 ? '+' : ''}
              {recentDelta.toFixed(1)} ultim
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-[var(--card-hover)] border border-[var(--border)]">
          {(['1L', '3L', '6L', 'Tot'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded text-[10px] font-semibold tabular-nums transition-colors ${
                period === p ? 'bg-[var(--bg-elevated)] text-fg shadow-sm' : 'text-fg-muted hover:text-fg-dim'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Big number + delta from start ═══ */}
      <div className="flex items-baseline gap-3 mb-2 flex-wrap">
        <span className="num font-semibold text-5xl md:text-6xl leading-none tabular-nums text-fg">
          {latest != null ? animatedVal.toFixed(1) : '—'}
        </span>
        <span className="text-base text-fg-muted font-medium">{unit}</span>
        {startDelta != null && Math.abs(startDelta) >= 0.05 && (
          <span className={`${deltaClass} text-xs ml-1`}>
            <span aria-hidden>{arrow}</span>
            {startDelta > 0 ? '+' : ''}
            {startDelta.toFixed(1)} de la start
          </span>
        )}
      </div>

      {/* ═══ AreaChart ═══ */}
      <div className="h-44 md:h-52 -mx-2 mt-3">
        {filtered.length >= 2 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filtered} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
              <defs>
                <linearGradient id={`hero-grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accentColor} stopOpacity={0.22} />
                  <stop offset="60%" stopColor={accentColor} stopOpacity={0.06} />
                  <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="iso"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--fg-faint)', fontSize: 10, fontWeight: 500 }}
                tickFormatter={(d: string) =>
                  new Date(d).toLocaleDateString('ro-RO', { month: 'short', day: 'numeric' })
                }
                interval="preserveStartEnd"
                minTickGap={50}
              />
              <Tooltip
                cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1, strokeDasharray: '3 3' }}
                contentStyle={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  fontSize: '11px',
                  padding: '6px 10px',
                  boxShadow: 'var(--shadow-panel-lifted)',
                }}
                labelStyle={{ color: 'var(--fg-muted)', fontWeight: 500, marginBottom: 2 }}
                itemStyle={{ color: 'var(--fg)', fontWeight: 600 }}
                labelFormatter={(d: any) => formatDate(d)}
                formatter={(v: any) => [`${Number(v).toFixed(1)} ${unit}`, label]}
                separator=": "
              />
              <Area
                type="monotone"
                dataKey="val"
                stroke={accentColor}
                strokeWidth={2}
                fill={`url(#hero-grad-${label})`}
                dot={false}
                activeDot={{ r: 4, stroke: 'var(--bg-elevated)', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : hasData ? (
          <div className="h-full flex items-center justify-center text-fg-muted text-sm">
            Ai nevoie de 2+ măsurători pentru chart
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-fg-muted text-sm">
            Nu există date pentru {label} în perioada selectată
          </div>
        )}
      </div>

      {/* ═══ Stats strip ═══ */}
      {hasData && stats && filtered.length >= 2 && (
        <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-fg-muted mt-3 pt-3 border-t border-[var(--border)]">
          <div>
            <span className="text-fg-faint">start </span>
            <span className="text-fg-dim font-semibold">
              {first?.toFixed(1)} {unit}
            </span>
            <span className="text-fg-faint ml-1">· {formatDate(filtered[0].iso)}</span>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div>
              <span className="text-fg-faint">{lowerIsBetter ? 'min' : 'max'} </span>
              <span style={{ color: 'var(--good)' }} className="font-semibold">
                {stats.best.val.toFixed(1)}
              </span>
            </div>
            <div>
              <span className="text-fg-faint">{lowerIsBetter ? 'max' : 'min'} </span>
              <span style={{ color: 'var(--bad)' }} className="font-semibold">
                {stats.worst.val.toFixed(1)}
              </span>
            </div>
          </div>
          <div>
            <span className="text-fg-faint">{filtered.length} log{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}
    </div>
  );
}
