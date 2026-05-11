'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Flame, ArrowRight, Heart, Zap } from 'lucide-react';
import { useShapeData } from '@/lib/useShapeData';
import { useActiveUser } from '@/lib/useActiveUser';
import {
  calcXP,
  calcStreak,
  getPersonInsight,
  PERSON_COLORS,
  getLikes,
  getLikeCount,
  MetricKey,
  Entry,
} from '@/lib/shape';
import HeroMetric from '@/components/HeroMetric';
import KpiTile from '@/components/KpiTile';
import ActivityStrip from '@/components/ActivityStrip';
import MeasurementsTable from '@/components/MeasurementsTable';

interface MetricDef {
  key: MetricKey;
  label: string;
  unit: string;
  lowerIsBetter: boolean;
}

const CORE_METRICS: MetricDef[] = [
  { key: 'kg', label: 'Weight', unit: 'kg', lowerIsBetter: false },
  { key: 'bodyFat', label: 'Body fat', unit: '%', lowerIsBetter: true },
  { key: 'visceralFat', label: 'Visceral', unit: '', lowerIsBetter: true },
  { key: 'muscle', label: 'Muscle', unit: '%', lowerIsBetter: false },
  { key: 'water', label: 'Water', unit: '%', lowerIsBetter: false },
];

const BODY_MEASUREMENTS = [
  { key: 'talie' as MetricKey, label: 'Talie', icon: '📏', unit: 'cm', lowerIsBetter: true },
  { key: 'piept' as MetricKey, label: 'Piept', icon: '🫁', unit: 'cm', lowerIsBetter: false },
  { key: 'biceps' as MetricKey, label: 'Biceps', icon: '💪', unit: 'cm', lowerIsBetter: false },
  { key: 'spate' as MetricKey, label: 'Spate', icon: '🔙', unit: 'cm', lowerIsBetter: false },
  { key: 'fesieri' as MetricKey, label: 'Fesieri', icon: '🍑', unit: 'cm', lowerIsBetter: false },
];

function buildSeries(entries: Entry[], key: MetricKey) {
  return entries
    .filter((e) => e[key] != null)
    .map((e) => ({ iso: e.date, val: e[key] as number }));
}

/** Pick a sensible default headline metric for this user. */
function pickDefaultHero(entries: Entry[]): MetricKey {
  // Prefer the metric with the most data, biasing toward bodyFat
  const candidates: MetricKey[] = ['bodyFat', 'kg', 'muscle', 'visceralFat', 'water'];
  for (const k of candidates) {
    if (entries.filter((e) => e[k] != null).length >= 2) return k;
  }
  return 'kg';
}

export default function OverviewPage() {
  const { loading, people } = useShapeData();
  const { activeUser } = useActiveUser();

  const me = useMemo(() => people.find((p) => p.name === activeUser), [people, activeUser]);
  const maxEntries = useMemo(() => Math.max(1, ...people.map((p) => p.entries.length)), [people]);

  const likes = typeof window !== 'undefined' ? getLikes() : {};
  const myLikes = me ? getLikeCount(likes, me.name) : 0;

  const [heroMetric, setHeroMetric] = useState<MetricKey | null>(null);
  const effectiveHero: MetricKey = heroMetric ?? (me ? pickDefaultHero(me.entries) : 'kg');

  // Squad rank
  const sortedByXP = useMemo(
    () =>
      people
        .map((p) => ({ p, xp: calcXP(p, maxEntries) }))
        .sort((a, b) => b.xp.total - a.xp.total),
    [people, maxEntries]
  );
  const myRank = useMemo(
    () => sortedByXP.findIndex((s) => s.p.name === activeUser) + 1,
    [sortedByXP, activeUser]
  );
  const top3 = sortedByXP.slice(0, 3);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Zap className="w-9 h-9 text-fg-muted mx-auto mb-2 anim-pulse" strokeWidth={2} />
          <p className="text-xs text-fg-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="h-full flex items-center justify-center text-fg-muted text-sm">
        Nu există date pentru "{activeUser}".
      </div>
    );
  }

  const ci = people.indexOf(me);
  const color = PERSON_COLORS[ci % PERSON_COLORS.length];
  const xp = calcXP(me, maxEntries);
  const streak = calcStreak(me);
  const insight = getPersonInsight(me);
  const visibleMeasurements = BODY_MEASUREMENTS.filter((m) =>
    me.entries.some((e) => e[m.key] != null)
  );

  const heroDef = CORE_METRICS.find((m) => m.key === effectiveHero)!;
  const heroSeries = buildSeries(me.entries, effectiveHero);

  // Date of last log
  const lastLogDate = me.latest?.date
    ? new Date(me.latest.date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: '2-digit' })
    : '—';

  return (
    <div className="h-full overflow-y-auto -mr-2 pr-2 pb-2">
      <div className="space-y-4 max-w-6xl">
        {/* ═══ COMPACT HEADER ═══ */}
        <div className="card p-4 flex items-center gap-4 anim-fade">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-base font-semibold text-white shrink-0"
            style={{ background: color }}
          >
            {me.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <h1 className="text-lg font-semibold text-fg leading-tight">{me.name}</h1>
              <span className="text-xs text-fg-muted">ultim log {lastLogDate}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span
                className="chip"
                style={{
                  background: `color-mix(in srgb, ${xp.tier.color} 14%, transparent)`,
                  color: xp.tier.color,
                }}
              >
                {xp.tier.icon} LVL {xp.level}
              </span>
              {streak.current > 0 && (
                <span className="streak-badge">
                  <Flame className="w-2.5 h-2.5" /> {streak.current} luni
                </span>
              )}
              {myLikes > 0 && (
                <span className="text-[10px] text-bad flex items-center gap-1 font-semibold">
                  <Heart className="w-2.5 h-2.5" fill="currentColor" /> {myLikes}
                </span>
              )}
              <span className="text-[10px] text-fg-muted font-mono">
                rank #{myRank} / {people.length}
              </span>
              <span className="text-[10px] text-fg-muted">·</span>
              <span className="text-[10px] text-fg-muted font-mono">{me.entries.length} măsurători</span>
            </div>
          </div>

          {/* XP bar */}
          <div className="hidden md:flex flex-col gap-1 w-44 shrink-0">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-fg-muted">XP</span>
              <span className="num text-xs font-semibold tabular-nums">{xp.total}</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${xp.xpInLevel}%`, background: xp.tier.color }}
              />
            </div>
            <span className="text-[9px] font-mono text-fg-faint tabular-nums">
              {xp.xpInLevel}/100 · +{xp.perLog}/log
            </span>
          </div>
        </div>

        {/* ═══ INSIGHT LINE ═══ */}
        <div className="text-xs text-fg-dim font-medium px-1 anim-fade d1">
          {insight.emoji} {insight.text}
        </div>

        {/* ═══ HERO METRIC ═══ */}
        <div className="anim-fade d2">
          <HeroMetric
            label={heroDef.label}
            unit={heroDef.unit}
            series={heroSeries}
            lowerIsBetter={heroDef.lowerIsBetter}
          />
        </div>

        {/* ═══ KPI TILES (clickable to swap into hero) ═══ */}
        <div className="anim-fade d3">
          <div className="flex items-baseline justify-between mb-2">
            <span className="label">Metrici · click pentru detalii</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {CORE_METRICS.map((m) => (
              <KpiTile
                key={m.key}
                label={m.label}
                unit={m.unit}
                series={buildSeries(me.entries, m.key)}
                lowerIsBetter={m.lowerIsBetter}
                active={effectiveHero === m.key}
                onClick={() => setHeroMetric(m.key)}
              />
            ))}
          </div>
        </div>

        {/* ═══ ACTIVITY + MEASUREMENTS row ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 anim-fade d4">
          <ActivityStrip entries={me.entries} weeks={12} />
          {visibleMeasurements.length > 0 ? (
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="label">Măsurători</span>
                <span className="text-[10px] text-fg-faint">
                  {visibleMeasurements.length} active
                </span>
              </div>
              <MeasurementsTable entries={me.entries} defs={visibleMeasurements} />
            </div>
          ) : (
            <div className="card p-6 flex flex-col items-center justify-center text-center">
              <span className="text-3xl mb-2">📐</span>
              <div className="text-sm font-medium text-fg-dim">Fără măsurători încă</div>
              <p className="text-[11px] text-fg-muted mt-1 max-w-xs">
                Logează talie, biceps, piept etc. ca să vezi progresul corporal aici.
              </p>
            </div>
          )}
        </div>

        {/* ═══ TOP SQUAD ═══ */}
        <div className="anim-fade d5">
          <div className="flex items-baseline justify-between mb-2">
            <span className="label">Top squad</span>
            <Link
              href="/squad"
              className="text-[11px] text-fg-muted hover:text-fg flex items-center gap-1 font-medium"
            >
              vezi toți <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="card divide-y divide-[var(--border)]">
            {top3.map(({ p, xp: theirXp }, i) => {
              const pci = people.indexOf(p);
              const pcolor = PERSON_COLORS[pci % PERSON_COLORS.length];
              const isMe = p.name === activeUser;
              return (
                <Link
                  key={p.name}
                  href={`/profile?name=${encodeURIComponent(p.name)}`}
                  className="px-4 py-2.5 flex items-center gap-3 hover:bg-[var(--card-hover)] transition-colors"
                >
                  <span className="w-5 text-center text-xs">{['🥇', '🥈', '🥉'][i]}</span>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white shrink-0"
                    style={{ background: pcolor }}
                  >
                    {p.name[0]}
                  </div>
                  <span className="flex-1 text-sm font-medium text-fg truncate">
                    {p.name}
                    {isMe && <span className="ml-1.5 text-[10px] text-fg-muted">· tu</span>}
                  </span>
                  <span
                    className="chip shrink-0"
                    style={{
                      background: `color-mix(in srgb, ${theirXp.tier.color} 12%, transparent)`,
                      color: theirXp.tier.color,
                    }}
                  >
                    {theirXp.tier.icon} L{theirXp.level}
                  </span>
                  <span className="num text-sm font-semibold tabular-nums text-fg-dim w-12 text-right shrink-0">
                    {theirXp.total}
                  </span>
                  <span className="text-[9px] text-fg-faint font-mono uppercase shrink-0 hidden sm:inline">
                    XP
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
