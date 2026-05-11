'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useShapeData } from '@/lib/useShapeData';
import { PERSON_COLORS, MetricKey, Person } from '@/lib/shape';

const METRICS: { key: MetricKey; label: string; unit: string; lower: boolean; icon: string }[] = [
  { key: 'kg', label: 'Greutate', unit: 'kg', lower: false, icon: '⚖️' },
  { key: 'bodyFat', label: 'Body fat', unit: '%', lower: true, icon: '🔥' },
  { key: 'talie', label: 'Talie', unit: 'cm', lower: true, icon: '📏' },
  { key: 'muscle', label: 'Muscle', unit: '%', lower: false, icon: '💪' },
];

export default function ProgresPage() {
  const { loading, people } = useShapeData();
  const [metric, setMetric] = useState<MetricKey>('bodyFat');
  const meta = METRICS.find((m) => m.key === metric)!;

  const stats = useMemo(() => {
    return people
      .map((p) => {
        const series = p.entries
          .filter((e) => e[metric] != null)
          .map((e) => ({ iso: e.date as string, val: e[metric] as number }));
        const first = series[0]?.val;
        const latest = series[series.length - 1]?.val;
        const previous = series.length > 1 ? series[series.length - 2]?.val : null;
        return {
          person: p,
          series,
          first,
          latest,
          previous,
          startDelta: first != null && latest != null ? latest - first : null,
          recentDelta: previous != null && latest != null ? latest - previous : null,
          hasData: series.length >= 1,
        };
      })
      .filter((s) => s.hasData);
  }, [people, metric]);

  const sorted = useMemo(() => {
    return [...stats].sort((a, b) => {
      const aImproved = a.startDelta != null ? (meta.lower ? -a.startDelta : a.startDelta) : -999;
      const bImproved = b.startDelta != null ? (meta.lower ? -b.startDelta : b.startDelta) : -999;
      return bImproved - aImproved;
    });
  }, [stats, meta.lower]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-fg-muted text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="shrink-0 flex items-baseline justify-between flex-wrap gap-2 anim-fade">
        <div>
          <h1 className="text-xl font-semibold text-fg tracking-tight">Progres echipa</h1>
          <p className="text-[11px] text-fg-muted mt-0.5">
            Sortat după cel mai mare progres · click pe card pentru profil
          </p>
        </div>
        <div className="flex gap-1.5">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                metric === m.key
                  ? 'bg-fg text-bg'
                  : 'bg-card border border-border text-fg-muted hover:text-fg hover:border-border-strong'
              }`}
            >
              <span className="mr-1">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto -mr-2 pr-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {sorted.map((s, i) => (
            <SparkCard key={s.person.name} stat={s} people={people} meta={meta} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SparkCard({
  stat,
  people,
  meta,
  index,
}: {
  stat: any;
  people: Person[];
  meta: { key: MetricKey; label: string; unit: string; lower: boolean };
  index: number;
}) {
  const { person, series, first, latest, startDelta, recentDelta } = stat;
  const ci = people.indexOf(person);
  const personColor = PERSON_COLORS[ci % PERSON_COLORS.length];

  const direction: 'good' | 'bad' | 'neutral' =
    startDelta == null || Math.abs(startDelta) < 0.15
      ? 'neutral'
      : (meta.lower ? startDelta < 0 : startDelta > 0)
      ? 'good'
      : 'bad';

  const lineColor =
    direction === 'good' ? 'var(--good)' : direction === 'bad' ? 'var(--bad)' : 'var(--fg-faint)';

  const deltaClass =
    direction === 'good' ? 'delta delta-good' : direction === 'bad' ? 'delta delta-bad' : 'delta delta-neutral';

  // Build minimal sparkline
  const chartW = 200;
  const chartH = 36;
  const padY = 4;
  let linePath = '';
  let lastDot: { x: number; y: number } | null = null;
  if (series.length >= 2) {
    const values = series.map((s: any) => s.val);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, 0.01);
    const pts = series.map((s: any, i: number) => {
      const x = (i / (series.length - 1)) * chartW;
      const y = chartH - padY - ((s.val - min) / range) * (chartH - padY * 2);
      return { x, y };
    });
    linePath = pts.map((p: any, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
    lastDot = pts[pts.length - 1];
  }

  return (
    <Link
      href={`/profile?name=${encodeURIComponent(person.name)}`}
      className={`card card-interactive p-4 flex flex-col anim-fade d${Math.min(index + 1, 8)}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white shrink-0"
          style={{ background: personColor }}
        >
          {person.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-fg truncate leading-tight">
            {person.name}
          </div>
          <div className="text-[10px] text-fg-faint">
            {person.entries.length} măsurători
          </div>
        </div>
        {startDelta != null && Math.abs(startDelta) >= 0.05 && (
          <span className={deltaClass}>
            <span aria-hidden>{startDelta < 0 ? '↓' : '↑'}</span>
            {startDelta > 0 ? '+' : ''}
            {startDelta.toFixed(1)}
          </span>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="num text-2xl font-semibold text-fg tabular-nums leading-none">
          {latest?.toFixed(1) ?? '—'}
        </span>
        <span className="text-xs text-fg-muted">{meta.unit}</span>
      </div>

      {/* Sparkline */}
      <div className="h-9 -mx-0.5 mb-2">
        {linePath ? (
          <svg viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none" className="w-full h-full" aria-hidden>
            <path
              d={linePath}
              stroke={lineColor}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {lastDot && (
              <circle cx={lastDot.x} cy={lastDot.y} r={2.5} fill={lineColor} vectorEffect="non-scaling-stroke" />
            )}
          </svg>
        ) : (
          <div className="h-full flex items-center text-[10px] text-fg-faint italic">
            2+ logs necesare
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] font-mono tabular-nums">
        <span className="text-fg-faint">start {first?.toFixed(1)}</span>
        {recentDelta != null && Math.abs(recentDelta) >= 0.1 && (
          <span style={{ color: lineColor }}>
            ultim {recentDelta > 0 ? '+' : ''}
            {recentDelta.toFixed(1)}
          </span>
        )}
      </div>
    </Link>
  );
}
