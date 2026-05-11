'use client';

import { useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Heart, ArrowLeft } from 'lucide-react';
import { useShapeData } from '@/lib/useShapeData';
import { calcXP, calcStreak, getPersonInsight, PERSON_COLORS, getLikes, getLikeCount, delta, deltaColor, fmt, MetricKey } from '@/lib/shape';
import ProgressChartClient from '@/components/ProgressChartClient';

function ProfileInner() {
  const params = useSearchParams();
  const router = useRouter();
  const name = params.get('name') || '';
  const { loading, people } = useShapeData();
  const [tab, setTab] = useState<'overview' | 'progres' | 'istoric'>('overview');

  const maxEntries = useMemo(() => Math.max(1, ...people.map((p) => p.entries.length)), [people]);
  const p = useMemo(() => people.find((pp) => pp.name === name) || null, [people, name]);

  if (loading) {
    return <div className="h-full flex items-center justify-center text-sm text-slate-400">Loading...</div>;
  }

  // Person picker
  if (!p) {
    return (
      <div className="h-full flex flex-col gap-3">
        <div className="shrink-0">
          <h1 className="font-black text-xl">👋 Cine ești?</h1>
          <p className="text-xs text-slate-500 mt-1">Alege profilul tău din echipă</p>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 content-start">
          {people.map((person, i) => {
            const color = PERSON_COLORS[i % PERSON_COLORS.length];
            const xp = calcXP(person, maxEntries);
            return (
              <button
                key={person.name}
                onClick={() => router.push(`/profile?name=${encodeURIComponent(person.name)}`)}
                className="glass p-4 rounded-2xl text-left trading-card relative overflow-hidden"
              >
                <div className="accent-strip" style={{ background: color }} />
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black text-white mb-2"
                  style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}
                >
                  {person.name[0]}
                </div>
                <div className="font-black text-sm text-white">{person.name}</div>
                <div className="text-[9px] text-slate-500 mb-2">{person.entries.length} check-in-uri</div>
                <span className="chip text-[9px] font-black" style={{ background: `${xp.tier.color}18`, color: xp.tier.color }}>
                  {xp.tier.icon} LVL {xp.level}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const ci = people.indexOf(p);
  const color = PERSON_COLORS[ci % PERSON_COLORS.length];
  const streak = calcStreak(p);
  const xp = calcXP(p, maxEntries);
  const likes = typeof window !== 'undefined' ? getLikes() : {};
  const likeCount = getLikeCount(likes, p.name);
  const insight = getPersonInsight(p);

  return (
    <div className="h-full flex flex-col gap-3">
      {/* ═══ HERO (compact) ═══ */}
      <div className="glass rounded-2xl p-4 shrink-0 relative overflow-hidden">
        <div className="accent-strip" style={{ background: color, height: 3 }} />
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/profile')}
            className="text-slate-400 hover:text-white p-1 -ml-1"
            aria-label="Înapoi"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black text-white shrink-0"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}
          >
            {p.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-lg text-white truncate">{p.name}</h1>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="chip text-[9px] font-black" style={{ background: `${xp.tier.color}18`, color: xp.tier.color }}>
                {xp.tier.icon} LVL {xp.level}
              </span>
              {streak.current > 0 && <span className="streak-badge">🔥 {streak.current}</span>}
              <span className="chip text-[9px] bg-white/5 text-slate-400">{p.entries.length} check-in-uri</span>
              {likeCount > 0 && (
                <span className="text-[10px] text-pink-400 font-bold flex items-center gap-0.5">
                  <Heart className="w-2.5 h-2.5" fill="currentColor" /> {likeCount}
                </span>
              )}
            </div>
          </div>
          {/* XP bar inline */}
          <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 w-32">
            <div className="font-mono text-sm font-black" style={{ color: xp.tier.color }}>{xp.total} XP</div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${xp.xpInLevel}%`,
                  background: `linear-gradient(90deg, ${xp.tier.color}, ${xp.tier.color}cc)`,
                  boxShadow: `0 0 8px ${xp.tier.color}66`,
                }}
              />
            </div>
            <div className="text-[8px] font-mono text-slate-500">{xp.xpInLevel}/100 · +{xp.perLog}/log</div>
          </div>
        </div>
        <div
          className="mt-2 rounded-xl px-3 py-1.5 text-[11px] font-bold"
          style={{
            background: insight.tone === 'good' ? 'rgba(0,255,136,0.06)' : insight.tone === 'warn' ? 'rgba(249,115,22,0.06)' : 'rgba(255,255,255,0.03)',
            color: insight.tone === 'good' ? '#00ff88' : insight.tone === 'warn' ? '#f97316' : '#94a3b8',
          }}
        >
          {insight.emoji} {insight.text}
        </div>
      </div>

      {/* ═══ TABS ═══ */}
      <div className="tab-bar shrink-0 self-start">
        {(['overview', 'progres', 'istoric'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`tab ${tab === t ? 'on' : ''}`}>
            {t === 'overview' ? 'Overview' : t === 'progres' ? 'Progres' : 'Istoric'}
          </button>
        ))}
      </div>

      {/* ═══ TAB CONTENT ═══ */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'overview' && <OverviewTab person={p} color={color} />}
        {tab === 'progres' && <ProgressChartClient person={p} color={color} />}
        {tab === 'istoric' && <IstoricTab person={p} />}
      </div>
    </div>
  );
}

function OverviewTab({ person, color }: { person: any; color: string }) {
  const last = person.latest;
  const first = person.first;
  const stats: { key: MetricKey; label: string; unit: string; icon: string; lower?: boolean }[] = [
    { key: 'kg', label: 'Greutate', unit: 'kg', icon: '⚖️' },
    { key: 'bodyFat', label: 'Body Fat', unit: '%', icon: '🔥', lower: true },
    { key: 'talie', label: 'Talie', unit: 'cm', icon: '📏', lower: true },
    { key: 'muscle', label: 'Masă musculară', unit: '%', icon: '💪' },
  ];
  return (
    <div className="h-full grid grid-cols-2 gap-3 content-start anim-fade">
      {stats.map((m, i) => {
        const val = last[m.key] as number | null;
        const startVal = first[m.key] as number | null;
        const dStart = delta(val, startVal);
        return (
          <div key={m.key} className={`glass rounded-2xl p-4 relative overflow-hidden anim-fade d${i + 1}`}>
            <div className="accent-strip" style={{ background: color, height: 2 }} />
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{m.icon} {m.label}</div>
            <div className="font-mono text-2xl font-black text-white">
              {fmt(val, 1)}<span className="text-xs font-normal text-slate-500 ml-1">{m.unit}</span>
            </div>
            {dStart != null && dStart !== 0 && (
              <div className="text-[10px] font-mono mt-1 font-bold" style={{ color: deltaColor(dStart, m.lower) }}>
                {dStart > 0 ? '+' : ''}{dStart.toFixed(1)} de la start
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function IstoricTab({ person }: { person: any }) {
  return (
    <div className="h-full glass rounded-2xl p-3 flex flex-col anim-fade">
      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 shrink-0">
        📋 Istoric ({person.entries.length})
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[var(--bg)]">
            <tr className="text-[9px] uppercase tracking-widest text-slate-500 font-black">
              <th className="text-left py-2">Data</th>
              <th className="text-right py-2">Kg</th>
              <th className="text-right py-2">BF%</th>
              <th className="text-right py-2">Talie</th>
              <th className="text-right py-2">Muscle</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {[...person.entries].reverse().map((e: any, i: number) => (
              <tr key={i} className="border-t border-white/[0.04]">
                <td className="py-2 text-slate-300 text-[11px]">
                  {new Date(e.date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: '2-digit' })}
                </td>
                <td className="text-right py-2">{fmt(e.kg)}</td>
                <td className="text-right py-2">{fmt(e.bodyFat)}</td>
                <td className="text-right py-2">{fmt(e.talie)}</td>
                <td className="text-right py-2">{fmt(e.muscle)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center text-sm text-slate-400">Loading...</div>}>
      <ProfileInner />
    </Suspense>
  );
}
