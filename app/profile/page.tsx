'use client';

import { useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Heart, ArrowLeft, ArrowRight, Flame } from 'lucide-react';
import { useShapeData } from '@/lib/useShapeData';
import {
  calcXP,
  calcStreak,
  getPersonInsight,
  PERSON_COLORS,
  getLikes,
  getLikeCount,
  delta,
  deltaColor,
  fmt,
  MetricKey,
  Person,
} from '@/lib/shape';
import ProgressChartClient from '@/components/ProgressChartClient';

function ProfileInner() {
  const params = useSearchParams();
  const router = useRouter();
  const name = params.get('name') || '';
  const { loading, people } = useShapeData();
  const [tab, setTab] = useState<'overview' | 'progres' | 'istoric'>('overview');

  const maxEntries = useMemo(
    () => Math.max(1, ...people.map((p) => p.entries.length)),
    [people]
  );
  const p = useMemo(() => people.find((pp) => pp.name === name) || null, [people, name]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-fg-dim font-display italic">
        Citesc...
      </div>
    );
  }

  // ═══ PERSON PICKER ═══
  if (!p) {
    return (
      <div className="h-full flex flex-col gap-3">
        <div className="shrink-0 anim-fade">
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-fg">
            Cine ești?
          </h1>
          <p className="text-xs text-fg-muted mt-1">Alege profilul din echipă · click pentru detalii</p>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 content-start -mr-2 pr-2">
          {people.map((person, i) => {
            const color = PERSON_COLORS[i % PERSON_COLORS.length];
            const xp = calcXP(person, maxEntries);
            const streak = calcStreak(person);
            return (
              <button
                key={person.name}
                onClick={() => {
                  try {
                    localStorage.setItem('shapesquad_active_user', person.name);
                  } catch {}
                  router.push(`/profile?name=${encodeURIComponent(person.name)}`);
                }}
                className={`panel panel-interactive p-4 text-left relative overflow-hidden anim-fade d${Math.min(i + 1, 8)}`}
              >
                <div
                  className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.08] -mr-6 -mt-6"
                  style={{ background: color }}
                />
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-display font-black text-white mb-3 shadow-panel"
                  style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)` }}
                >
                  {person.name[0]}
                </div>
                <div className="font-display font-bold text-base text-fg leading-tight">
                  {person.name}
                </div>
                <div className="text-[10px] text-fg-muted font-mono mt-0.5">
                  {person.entries.length} check-in-uri
                </div>
                <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                  <span
                    className="chip"
                    style={{ background: `${xp.tier.color}22`, color: xp.tier.color }}
                  >
                    {xp.tier.icon} LVL {xp.level}
                  </span>
                  {streak.current > 0 && (
                    <span className="streak-badge">
                      <Flame className="w-2.5 h-2.5" /> {streak.current}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ═══ PROFILE DETAIL ═══
  const ci = people.indexOf(p);
  const color = PERSON_COLORS[ci % PERSON_COLORS.length];
  const streak = calcStreak(p);
  const xp = calcXP(p, maxEntries);
  const likes = typeof window !== 'undefined' ? getLikes() : {};
  const likeCount = getLikeCount(likes, p.name);
  const insight = getPersonInsight(p);

  return (
    <div className="h-full flex flex-col gap-3">
      {/* ═══ HERO ═══ */}
      <div className="panel p-4 shrink-0 relative overflow-hidden anim-fade">
        <div
          className="absolute -right-12 -top-12 w-44 h-44 rounded-full opacity-[0.08]"
          style={{ background: color }}
        />
        <div className="flex items-center gap-3 relative">
          <button
            onClick={() => router.push('/profile')}
            className="btn btn-ghost btn-icon shrink-0"
            aria-label="Înapoi la lista de membri"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-display font-black text-white shrink-0 shadow-panel"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)` }}
          >
            {p.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-tight text-fg truncate leading-tight">
              {p.name}
            </h1>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span
                className="chip"
                style={{ background: `${xp.tier.color}22`, color: xp.tier.color }}
              >
                {xp.tier.icon} LVL {xp.level}
              </span>
              {streak.current > 0 && (
                <span className="streak-badge">
                  <Flame className="w-3 h-3" /> {streak.current} luni
                </span>
              )}
              <span className="chip bg-card border border-border text-fg-muted">
                {p.entries.length} check-in-uri
              </span>
              {likeCount > 0 && (
                <span className="text-[10px] text-rose font-bold flex items-center gap-1">
                  <Heart className="w-3 h-3" fill="currentColor" /> {likeCount}
                </span>
              )}
            </div>
          </div>

          {/* XP bar */}
          <div className="hidden md:flex flex-col items-end gap-1 shrink-0 w-36">
            <div className="flex items-baseline gap-1.5">
              <span
                className="font-mono text-base font-bold tabular-nums"
                style={{ color: xp.tier.color }}
              >
                {xp.total}
              </span>
              <span className="label">XP</span>
            </div>
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

        {/* AI insight */}
        <div
          className="mt-3 rounded-lg px-3 py-2 text-[11px] font-medium leading-relaxed"
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
              insight.tone === 'good' ? 'var(--emerald)' : insight.tone === 'warn' ? 'var(--amber)' : 'var(--fg-dim)',
          }}
        >
          {insight.emoji} {insight.text}
        </div>
      </div>

      {/* ═══ TABS ═══ */}
      <div className="shrink-0 flex items-center gap-1 anim-fade d1">
        {(['overview', 'progres', 'istoric'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`nav-pill ${tab === t ? 'active' : ''}`}
          >
            {t === 'overview' ? 'Overview' : t === 'progres' ? 'Progres' : 'Istoric'}
          </button>
        ))}
      </div>

      {/* ═══ TAB CONTENT ═══ */}
      <div className="flex-1 min-h-0 overflow-hidden anim-fade d2">
        {tab === 'overview' && <OverviewTab person={p} color={color} />}
        {tab === 'progres' && <ProgressChartClient person={p} color={color} />}
        {tab === 'istoric' && <IstoricTab person={p} />}
      </div>
    </div>
  );
}

function OverviewTab({ person, color }: { person: Person; color: string }) {
  const last = person.latest;
  const first = person.first;
  const stats: { key: MetricKey; label: string; unit: string; icon: string; lower?: boolean }[] = [
    { key: 'kg', label: 'Greutate', unit: 'kg', icon: '⚖️' },
    { key: 'bodyFat', label: 'Body Fat', unit: '%', icon: '🔥', lower: true },
    { key: 'talie', label: 'Talie', unit: 'cm', icon: '📏', lower: true },
    { key: 'muscle', label: 'Masă musc.', unit: '%', icon: '💪' },
  ];
  return (
    <div className="h-full grid grid-cols-2 md:grid-cols-4 gap-3 content-start">
      {stats.map((m, i) => {
        const val = last[m.key] as number | null;
        const startVal = first[m.key] as number | null;
        const prevVal = person.previous ? (person.previous[m.key] as number | null) : null;
        const dStart = delta(val, startVal);
        const dRecent = delta(val, prevVal);
        return (
          <div key={m.key} className={`panel p-4 relative overflow-hidden anim-fade d${i + 1}`}>
            <div
              className="absolute top-0 left-0 right-0 h-0.5"
              style={{ background: color, opacity: 0.6 }}
            />
            <div className="flex items-baseline justify-between mb-2">
              <span className="label">
                {m.icon} {m.label}
              </span>
            </div>
            <div className="font-display text-3xl font-bold text-fg leading-none">
              {fmt(val, 1)}
              <span className="font-sans text-sm font-normal text-fg-muted ml-1">{m.unit}</span>
            </div>
            <div className="space-y-0.5 mt-2.5">
              {dRecent != null && dRecent !== 0 && (
                <div className="text-[10px] font-mono tabular-nums" style={{ color: deltaColor(dRecent, m.lower) }}>
                  <span className="text-fg-faint mr-1">ultim</span>
                  {dRecent > 0 ? '+' : ''}
                  {dRecent.toFixed(1)}
                </div>
              )}
              {dStart != null && dStart !== 0 && (
                <div className="text-[10px] font-mono tabular-nums" style={{ color: deltaColor(dStart, m.lower) }}>
                  <span className="text-fg-faint mr-1">start</span>
                  {dStart > 0 ? '+' : ''}
                  {dStart.toFixed(1)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IstoricTab({ person }: { person: Person }) {
  // Chronological order
  const entries = person.entries;
  // Reverse for display (newest first)
  const displayEntries = [...entries].reverse();

  return (
    <div className="h-full panel p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <span className="label">📋 Istoric · {person.entries.length} măsurători</span>
        <span className="text-[9px] text-fg-muted">
          🟢 progres · 🔴 regres · vs. măsurătoarea anterioară
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto -mr-2 pr-2">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card z-10 border-b border-border">
            <tr>
              <th className="label text-left py-2 pr-2">Data</th>
              <th className="label text-right py-2 px-2">Kg</th>
              <th className="label text-right py-2 px-2">BF%</th>
              <th className="label text-right py-2 px-2">Talie</th>
              <th className="label text-right py-2 px-2">Muscle</th>
              <th className="label text-right py-2 pl-2">Water</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {displayEntries.map((e, i) => {
              // chronoIdx in original array (oldest=0, newest=length-1)
              const chronoIdx = entries.length - 1 - i;
              const prev = chronoIdx > 0 ? entries[chronoIdx - 1] : null;
              return (
                <tr key={i} className="border-b border-border/50 hover:bg-card-hover transition-colors">
                  <td className="py-2 pr-2 text-fg-dim font-sans text-[11px]">
                    {new Date(e.date).toLocaleDateString('ro-RO', {
                      day: 'numeric',
                      month: 'short',
                      year: '2-digit',
                    })}
                  </td>
                  <ValCell value={e.kg} prev={prev?.kg} lower={false} />
                  <ValCell value={e.bodyFat} prev={prev?.bodyFat} lower={true} />
                  <ValCell value={e.talie} prev={prev?.talie} lower={true} />
                  <ValCell value={e.muscle} prev={prev?.muscle} lower={false} />
                  <ValCell value={e.water} prev={prev?.water} lower={false} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ValCell({
  value,
  prev,
  lower,
}: {
  value: number | null;
  prev: number | null | undefined;
  lower: boolean;
}) {
  const d = delta(value, prev ?? null);
  let color = 'var(--fg)';
  if (d != null && d !== 0) {
    const isGood = lower ? d < 0 : d > 0;
    color = isGood ? 'var(--emerald)' : 'var(--rose)';
  }
  return (
    <td className="text-right py-2 px-2" style={{ color }}>
      <div className="leading-tight">
        <div>{fmt(value)}</div>
        {d != null && d !== 0 && (
          <div className="text-[9px] font-bold opacity-80">
            {d > 0 ? '+' : ''}
            {d.toFixed(1)}
          </div>
        )}
      </div>
    </td>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center text-fg-dim font-display italic">
          Citesc...
        </div>
      }
    >
      <ProfileInner />
    </Suspense>
  );
}
