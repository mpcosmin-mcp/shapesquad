'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Flame, Sparkles, Users, ArrowRight, Heart, Zap } from 'lucide-react';
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
import MetricCard from '@/components/MetricCard';

interface MetricDef {
  key: MetricKey;
  label: string;
  icon: string;
  unit: string;
  lowerIsBetter: boolean;
  optional?: boolean; // body measurements — show only if data exists
}

const CORE_METRICS: MetricDef[] = [
  { key: 'kg', label: 'Greutate', icon: '⚖️', unit: 'kg', lowerIsBetter: false },
  { key: 'bodyFat', label: 'Body Fat', icon: '🔥', unit: '%', lowerIsBetter: true },
  { key: 'visceralFat', label: 'Visceral', icon: '🫀', unit: '', lowerIsBetter: true },
  { key: 'muscle', label: 'Muscle', icon: '💪', unit: '%', lowerIsBetter: false },
  { key: 'water', label: 'Water', icon: '💧', unit: '%', lowerIsBetter: false },
];

const BODY_METRICS: MetricDef[] = [
  { key: 'talie', label: 'Talie', icon: '📏', unit: 'cm', lowerIsBetter: true, optional: true },
  { key: 'biceps', label: 'Biceps', icon: '💪', unit: 'cm', lowerIsBetter: false, optional: true },
  { key: 'piept', label: 'Piept', icon: '🫁', unit: 'cm', lowerIsBetter: false, optional: true },
  { key: 'spate', label: 'Spate', icon: '🔙', unit: 'cm', lowerIsBetter: false, optional: true },
  { key: 'fesieri', label: 'Fesieri', icon: '🍑', unit: 'cm', lowerIsBetter: false, optional: true },
];

function buildSeries(entries: Entry[], key: MetricKey) {
  return entries
    .filter((e) => e[key] != null)
    .map((e) => ({ iso: e.date, val: e[key] as number }));
}

export default function OverviewPage() {
  const { loading, people } = useShapeData();
  const { activeUser } = useActiveUser();

  const me = useMemo(() => people.find((p) => p.name === activeUser), [people, activeUser]);
  const maxEntries = useMemo(() => Math.max(1, ...people.map((p) => p.entries.length)), [people]);

  const likes = typeof window !== 'undefined' ? getLikes() : {};
  const myLikes = me ? getLikeCount(likes, me.name) : 0;

  // Top 3 squad sneak peek
  const top3 = useMemo(() => {
    return people
      .map((p) => ({ p, xp: calcXP(p, maxEntries) }))
      .sort((a, b) => b.xp.total - a.xp.total)
      .slice(0, 3);
  }, [people, maxEntries]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center anim-fade">
          <Zap className="w-12 h-12 text-bronze mx-auto mb-4 anim-pulse" strokeWidth={2.5} fill="currentColor" />
          <p className="font-display text-base italic text-fg-dim">Citesc echipa...</p>
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="h-full flex items-center justify-center text-fg-muted">
        Nu există date pentru "{activeUser}" încă.
      </div>
    );
  }

  const ci = people.indexOf(me);
  const color = PERSON_COLORS[ci % PERSON_COLORS.length];
  const xp = calcXP(me, maxEntries);
  const streak = calcStreak(me);
  const insight = getPersonInsight(me);

  // Filter body metrics — show only those user actually tracks
  const visibleBodyMetrics = BODY_METRICS.filter((m) =>
    me.entries.some((e) => e[m.key] != null)
  );

  return (
    <div className="h-full overflow-y-auto -mr-2 pr-2 pb-2">
      <div className="space-y-3">
        {/* ═══ HERO ═══ */}
        <div
          className="panel panel-lifted p-4 anim-fade relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, ${color} 10%, var(--card)), var(--card) 55%)`,
            borderColor: `color-mix(in srgb, ${color} 28%, var(--border))`,
          }}
        >
          <div
            className="absolute -right-12 -top-12 w-44 h-44 rounded-full opacity-[0.1]"
            style={{ background: color }}
          />
          <div className="flex items-center gap-4 relative">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-display font-black text-white shrink-0 shadow-panel"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)` }}
            >
              {me.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="label mb-1">👋 Salut</div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-fg leading-none">
                {me.name}
              </h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="chip" style={{ background: `${xp.tier.color}22`, color: xp.tier.color }}>
                  {xp.tier.icon} LVL {xp.level} · {xp.total} XP
                </span>
                {streak.current > 0 && (
                  <span className="streak-badge">
                    <Flame className="w-3 h-3" /> {streak.current} luni
                  </span>
                )}
                {myLikes > 0 && (
                  <span className="text-[10px] text-rose flex items-center gap-1">
                    <Heart className="w-3 h-3" fill="currentColor" /> {myLikes}
                  </span>
                )}
                <span className="text-[10px] text-fg-muted">
                  {me.entries.length} măsurători
                </span>
              </div>
            </div>

            {/* XP bar */}
            <div className="hidden md:flex flex-col items-end gap-1 shrink-0 w-40">
              <div className="progress-track w-full">
                <div
                  className="progress-fill"
                  style={{
                    width: `${xp.xpInLevel}%`,
                    background: `linear-gradient(90deg, ${xp.tier.color}, ${xp.tier.color}cc, ${xp.tier.color})`,
                    boxShadow: `0 0 12px ${xp.tier.color}66`,
                  }}
                />
              </div>
              <div className="text-[9px] font-mono text-fg-muted tabular-nums">
                {xp.xpInLevel}/100 · +{xp.perLog}/log
              </div>
            </div>
          </div>

          {/* Insight banner */}
          <div
            className="mt-3 rounded-lg px-3 py-2 text-[11px] font-medium leading-relaxed relative"
            style={{
              background:
                insight.tone === 'good'
                  ? 'color-mix(in srgb, var(--emerald) 8%, transparent)'
                  : insight.tone === 'warn'
                  ? 'color-mix(in srgb, var(--amber) 8%, transparent)'
                  : 'color-mix(in srgb, var(--fg-muted) 6%, transparent)',
              border: `1px solid ${
                insight.tone === 'good'
                  ? 'color-mix(in srgb, var(--emerald) 20%, transparent)'
                  : insight.tone === 'warn'
                  ? 'color-mix(in srgb, var(--amber) 20%, transparent)'
                  : 'var(--border)'
              }`,
              color:
                insight.tone === 'good'
                  ? 'var(--emerald)'
                  : insight.tone === 'warn'
                  ? 'var(--amber)'
                  : 'var(--fg-dim)',
            }}
          >
            {insight.emoji} {insight.text}
          </div>
        </div>

        {/* ═══ CORE METRIC MODULES ═══ */}
        <div>
          <div className="flex items-center justify-between mb-2 anim-fade d1">
            <h2 className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-bronze" strokeWidth={2.5} />
              <span className="font-display text-base font-bold">Body composition</span>
            </h2>
            <span className="label">5 metrici</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {CORE_METRICS.map((m, i) => (
              <div key={m.key} className={`anim-fade d${i + 1}`}>
                <MetricCard
                  label={m.label}
                  icon={m.icon}
                  unit={m.unit}
                  series={buildSeries(me.entries, m.key)}
                  lowerIsBetter={m.lowerIsBetter}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ═══ BODY MEASUREMENTS (only what user logs) ═══ */}
        {visibleBodyMetrics.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2 anim-fade d3">
              <h2 className="flex items-center gap-2">
                <span className="text-sm">📐</span>
                <span className="font-display text-base font-bold">Măsurători (cm)</span>
              </h2>
              <span className="label">{visibleBodyMetrics.length} active</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {visibleBodyMetrics.map((m, i) => (
                <div key={m.key} className={`anim-fade d${i + 1}`}>
                  <MetricCard
                    label={m.label}
                    icon={m.icon}
                    unit={m.unit}
                    series={buildSeries(me.entries, m.key)}
                    lowerIsBetter={m.lowerIsBetter}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ SQUAD PEEK ═══ */}
        <div className="anim-fade d4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan" strokeWidth={2.5} />
              <span className="font-display text-base font-bold">Squad podium</span>
            </h2>
            <Link href="/squad" className="text-[11px] text-bronze hover:underline flex items-center gap-1 font-semibold">
              vezi toți <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {top3.map(({ p, xp: theirXp }, i) => {
              const pci = people.indexOf(p);
              const pcolor = PERSON_COLORS[pci % PERSON_COLORS.length];
              const medal = ['🥇', '🥈', '🥉'][i];
              return (
                <Link
                  key={p.name}
                  href={`/profile?name=${encodeURIComponent(p.name)}`}
                  className="panel panel-interactive p-3 flex items-center gap-2.5 relative overflow-hidden"
                >
                  <span className="text-lg shrink-0">{medal}</span>
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-display font-black text-white shrink-0"
                    style={{ background: `linear-gradient(135deg, ${pcolor}, ${pcolor}aa)` }}
                  >
                    {p.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-xs text-fg truncate">{p.name}</div>
                    <div className="font-mono text-[10px] tabular-nums" style={{ color: theirXp.tier.color }}>
                      {theirXp.total} XP
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
