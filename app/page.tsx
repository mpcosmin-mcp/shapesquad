'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Zap, Heart, Trophy, Flame } from 'lucide-react';
import { useShapeData } from '@/lib/useShapeData';
import { calcXP, calcStreak, getPersonInsight, PERSON_COLORS, getLikes, getLikeCount } from '@/lib/shape';

export default function DashboardPage() {
  const { loading, people } = useShapeData();
  const likes = typeof window !== 'undefined' ? getLikes() : {};

  const maxEntries = useMemo(() => Math.max(1, ...people.map((p) => p.entries.length)), [people]);

  // Leaderboard sorted by XP
  const leaderboard = useMemo(() => {
    return people
      .map((p) => ({ p, xp: calcXP(p, maxEntries), streak: calcStreak(p), likes: getLikeCount(likes, p.name) }))
      .sort((a, b) => b.xp.total - a.xp.total);
  }, [people, maxEntries, likes]);

  // Ticker
  const ticker = useMemo(() => {
    if (people.length === 0) return [];
    const out: string[] = [];
    const total = people.reduce((s, p) => s + p.entries.length, 0);
    out.push(`📋 ${total} check-in-uri totale — 1% daily!`);
    people.forEach((p) => {
      if (p.entries.length >= 2 && p.first.bodyFat != null && p.latest.bodyFat != null) {
        const drop = p.first.bodyFat - p.latest.bodyFat;
        if (drop > 0.5) out.push(`💪 ${p.name} a îmbunătățit BF% cu ${drop.toFixed(1)} puncte`);
      }
    });
    leaderboard.slice(0, 3).forEach(({ p, xp }, i) => {
      const medal = ['🥇', '🥈', '🥉'][i];
      out.push(`${medal} ${p.name} — LVL ${xp.level} ${xp.tier.icon} ${xp.tier.name} (${xp.total} XP)`);
    });
    return out;
  }, [people, leaderboard]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Zap className="w-10 h-10 text-yellow-400 mx-auto mb-3 animate-pulse" fill="currentColor" />
          <p className="text-sm font-bold text-slate-400">Loading squad data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3">
      {/* ═══ TAGLINE ═══ */}
      <div className="glass rounded-2xl p-4 shrink-0 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-32 h-32 rounded-full opacity-[0.05]" style={{ background: 'var(--neon-blue)' }} />
        <h1 className="font-black text-base md:text-lg tracking-tight leading-tight relative">
          <span className="text-white">Nu ne comparăm. </span>
          <span className="bg-gradient-to-r from-[var(--neon-blue)] to-[var(--neon-green)] bg-clip-text text-transparent">Ne construim.</span>
          <span className="text-white"> Ne susținem.</span>
        </h1>
      </div>

      {/* ═══ TICKER ═══ */}
      {ticker.length > 0 && (
        <div className="overflow-hidden rounded-2xl glass shrink-0 py-2">
          <div className="flex animate-ticker whitespace-nowrap">
            {[...ticker, ...ticker].map((t, i) => (
              <span key={i} className="inline-block mx-6 text-[11px] font-bold text-slate-400 shrink-0">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ═══ LEADERBOARD ═══ */}
      <div className="flex-1 min-h-0 glass rounded-2xl p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" /> Leaderboard XP
          </h2>
          <span className="text-[9px] font-mono text-slate-500">{people.length} membri</span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
          {leaderboard.map(({ p, xp, streak, likes: lc }, i) => {
            const ci = people.indexOf(p);
            const color = PERSON_COLORS[ci % PERSON_COLORS.length];
            const insight = getPersonInsight(p);
            const medal = i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`;

            return (
              <Link
                key={p.name}
                href={`/profile?name=${encodeURIComponent(p.name)}`}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] transition-all"
              >
                <span className="w-6 text-center text-[11px] font-black text-slate-400">{medal}</span>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0"
                  style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}
                >
                  {p.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-white truncate">{p.name}</span>
                    <span className="chip text-[9px] font-black shrink-0" style={{ background: `${xp.tier.color}18`, color: xp.tier.color }}>
                      {xp.tier.icon} LVL {xp.level}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-500 truncate">{insight.emoji} {insight.text}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-sm font-black" style={{ color: xp.tier.color }}>{xp.total}</div>
                  <div className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">XP</div>
                </div>
                <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0 w-14">
                  {streak.current > 0 && (
                    <span className="streak-badge"><Flame className="w-3 h-3" /> {streak.current}</span>
                  )}
                  {lc > 0 && (
                    <span className="text-[9px] text-pink-400 font-bold flex items-center gap-0.5">
                      <Heart className="w-2.5 h-2.5" fill="currentColor" /> {lc}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
