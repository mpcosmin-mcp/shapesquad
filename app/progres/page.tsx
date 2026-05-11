'use client';

import { useMemo, useState } from 'react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useShapeData } from '@/lib/useShapeData';
import {
  PERSON_COLORS,
  densifyTimeSeries,
  MetricKey,
  Person,
} from '@/lib/shape';

const METRICS: { key: MetricKey; label: string; unit: string; lower: boolean; icon: string }[] = [
  { key: 'kg', label: 'Greutate', unit: 'kg', lower: false, icon: '⚖️' },
  { key: 'bodyFat', label: 'Body Fat', unit: '%', lower: true, icon: '🔥' },
  { key: 'talie', label: 'Talie', unit: 'cm', lower: true, icon: '📏' },
  { key: 'muscle', label: 'Muscle', unit: '%', lower: false, icon: '💪' },
];

export default function ProgresPage() {
  const { loading, people } = useShapeData();
  const [metric, setMetric] = useState<MetricKey>('bodyFat');
  const meta = METRICS.find((m) => m.key === metric)!;

  // Compute each person's data + direction for the selected metric
  const stats = useMemo(() => {
    return people
      .map((p) => {
        const series = p.entries
          .filter((e) => e[metric] != null)
          .map((e) => ({ date: e.date as string, val: e[metric] as number }));
        const dense = densifyTimeSeries(series);
        const first = series[0]?.val;
        const latest = series[series.length - 1]?.val;
        const previous = series.length > 1 ? series[series.length - 2]?.val : null;
        const startDelta = first != null && latest != null ? latest - first : null;
        const recentDelta = previous != null && latest != null ? latest - previous : null;
        return {
          person: p,
          dense,
          first,
          latest,
          startDelta,
          recentDelta,
          hasData: series.length >= 1,
        };
      })
      .filter((s) => s.hasData);
  }, [people, metric]);

  // Sort by progress (best improvement first for "lower better" metrics)
  const sorted = useMemo(() => {
    return [...stats].sort((a, b) => {
      const aImproved = a.startDelta != null ? (meta.lower ? -a.startDelta : a.startDelta) : -999;
      const bImproved = b.startDelta != null ? (meta.lower ? -b.startDelta : b.startDelta) : -999;
      return bImproved - aImproved;
    });
  }, [stats, meta.lower]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-fg-dim font-display italic">
        Citesc...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3">
      {/* ═══ HEADER ═══ */}
      <div className="shrink-0 flex items-center justify-between flex-wrap gap-2 anim-fade">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-bold tracking-tight text-fg">
            Progres echipa
          </h1>
          <p className="text-[11px] text-fg-muted mt-0.5">
            Card-uri sortate după cel mai mare progres · click pentru detalii
          </p>
        </div>
        <div className="flex gap-1 flex-wrap">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                metric === m.key
                  ? 'bg-bronze text-white shadow-glow-bronze'
                  : 'bg-card border border-border text-fg-muted hover:text-fg hover:border-border-strong'
              }`}
            >
              <span>{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ GRID of mini charts ═══ */}
      <div className="flex-1 min-h-0 overflow-y-auto -mr-2 pr-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {sorted.map((s, i) => (
            <MiniChartCard
              key={s.person.name}
              stat={s}
              people={people}
              meta={meta}
              index={i}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniChartCard({
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
  const { person, dense, first, latest, startDelta, recentDelta } = stat;
  const ci = people.indexOf(person);
  const personColor = PERSON_COLORS[ci % PERSON_COLORS.length];

  // Direction = how to color the card
  const direction =
    startDelta == null
      ? 'neutral'
      : Math.abs(startDelta) < 0.2
      ? 'neutral'
      : (meta.lower ? startDelta < 0 : startDelta > 0)
      ? 'good'
      : 'bad';

  const tintColor =
    direction === 'good' ? 'var(--emerald)' : direction === 'bad' ? 'var(--rose)' : 'var(--fg-muted)';

  const TrendIcon =
    direction === 'good' ? TrendingDown : direction === 'bad' ? TrendingUp : Minus;
  const trendIconRotation = direction === 'good' && !meta.lower ? 'rotate-180' : direction === 'bad' && !meta.lower ? 'rotate-180' : '';

  return (
    <Link
      href={`/profile?name=${encodeURIComponent(person.name)}`}
      className={`panel panel-interactive p-3 relative overflow-hidden anim-fade d${Math.min(index + 1, 8)}`}
      style={{
        background:
          direction === 'good'
            ? 'linear-gradient(180deg, color-mix(in srgb, var(--emerald) 5%, var(--card)), var(--card) 65%)'
            : direction === 'bad'
            ? 'linear-gradient(180deg, color-mix(in srgb, var(--rose) 5%, var(--card)), var(--card) 65%)'
            : undefined,
        borderColor:
          direction === 'good'
            ? 'color-mix(in srgb, var(--emerald) 20%, var(--border))'
            : direction === 'bad'
            ? 'color-mix(in srgb, var(--rose) 20%, var(--border))'
            : 'var(--border)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-display font-black text-white shrink-0"
          style={{ background: `linear-gradient(135deg, ${personColor}, ${personColor}aa)` }}
        >
          {person.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-sm text-fg truncate leading-tight">
            {person.name}
          </div>
          <div className="text-[9px] text-fg-muted">
            {person.entries.length} măsurători
          </div>
        </div>
        <TrendIcon className={`w-4 h-4 shrink-0 ${trendIconRotation}`} style={{ color: tintColor }} strokeWidth={2.5} />
      </div>

      {/* Big value */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-display text-2xl font-bold text-fg tabular-nums leading-none">
          {latest?.toFixed(1) ?? '—'}
        </span>
        <span className="text-xs text-fg-muted">{meta.unit}</span>
        {startDelta != null && (
          <span
            className="ml-auto font-mono text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded"
            style={{
              color: tintColor,
              background: `color-mix(in srgb, ${tintColor} 14%, transparent)`,
            }}
          >
            {startDelta > 0 ? '+' : ''}
            {startDelta.toFixed(1)}
          </span>
        )}
      </div>

      {/* Sparkline */}
      <div className="h-12 -mx-1 mt-2">
        {dense.length >= 2 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dense} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`spark-${person.name}-${meta.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tintColor} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={tintColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '10px',
                  padding: '4px 8px',
                  boxShadow: 'var(--shadow-panel-lifted)',
                }}
                labelStyle={{ display: 'none' }}
                itemStyle={{ color: tintColor, fontFamily: 'var(--font-mono)' }}
                formatter={(v: any) => [`${Number(v).toFixed(1)}${meta.unit}`, null]}
                separator=""
              />
              <Area
                type="monotone"
                dataKey="val"
                stroke={tintColor}
                strokeWidth={1.75}
                fill={`url(#spark-${person.name}-${meta.key})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-[10px] text-fg-faint italic">
            Are nevoie de 2+ măsurători
          </div>
        )}
      </div>

      {/* Bottom deltas */}
      <div className="flex items-center justify-between text-[9px] font-mono tabular-nums mt-1">
        <span className="text-fg-faint">
          start: {first?.toFixed(1) ?? '—'}
        </span>
        {recentDelta != null && Math.abs(recentDelta) >= 0.1 && (
          <span style={{ color: tintColor }}>
            ultim: {recentDelta > 0 ? '+' : ''}
            {recentDelta.toFixed(1)}
          </span>
        )}
      </div>
    </Link>
  );
}
