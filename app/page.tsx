'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Heart, Trophy, Flame, ArrowRight, Zap } from 'lucide-react';
import { useShapeData } from '@/lib/useShapeData';
import {
  calcXP,
  calcStreak,
  getPersonInsight,
  PERSON_COLORS,
  getLikes,
  getLikeCount,
} from '@/lib/shape';

export default function DashboardPage() {
  const { loading, people } = useShapeData();
  const likes = typeof window !== 'undefined' ? getLikes() : {};

  const maxEntries = useMemo(
    () => Math.max(1, ...people.map((p) => p.entries.length)),
    [people]
  );

  const leaderboard = useMemo(() => {
    return people
      .map((p) => ({
        p,
        xp: calcXP(p, maxEntries),
        streak: calcStreak(p),
        likes: getLikeCount(likes, p.name),
        insight: getPersonInsight(p),
      }))
      .sort((a, b) => b.xp.total - a.xp.total);
  }, [people, maxEntries, likes]);

  const ticker = useMemo(() => {
    if (people.length === 0) return [];
    const out: string[] = [];
    const total = people.reduce((s, p) => s + p.entries.length, 0);
    out.push(`📋 ${total} check-in-uri totale — 1% daily`);
    people.forEach((p) => {
      if (p.entries.length >= 2 && p.first.bodyFat != null && p.latest.bodyFat != null) {
        const drop = p.first.bodyFat - p.latest.bodyFat;
        if (drop > 0.5) out.push(`💪 ${p.name} a îmbunătățit BF% cu ${drop.toFixed(1)} puncte`);
      }
    });
    leaderboard.slice(0, 3).forEach(({ p, xp }, i) => {
      const medal = ['🥇', '🥈', '🥉'][i];
      out.push(`${medal} ${p.name} — LVL ${xp.level} ${xp.tier.icon} ${xp.total} XP`);
    });
    return out;
  }, [people, leaderboard]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center anim-fade">
          <Zap className="w-12 h-12 text-bronze mx-auto mb-4 anim-pulse" strokeWidth={2.5} />
          <p className="font-display text-base italic text-fg-dim">Citesc echipa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3">
      {/* ═══ TAGLINE ═══ */}
      <div className="panel p-5 shrink-0 relative overflow-hidden anim-fade">
        <div
          className="absolute -right-16 -top-16 w-44 h-44 rounded-full opacity-[0.08]"
          style={{ background: 'var(--bronze)' }}
        />
        <h1 className="font-display text-xl md:text-2xl tracking-tight leading-tight relative">
          <span className="text-fg">Nu ne comparăm. </span>
          <span className="italic text-bronze">Ne construim.</span>
          <span className="text-fg"> Ne susținem.</span>
        </h1>
        <p className="text-[11px] text-fg-muted mt-1.5 font-medium">
          Aici câștigă cine se prezintă. 1% daily 💪
        </p>
      </div>

      {/* ═══ TICKER ═══ */}
      {ticker.length > 0 && (
        <div className="panel py-2 shrink-0 overflow-hidden anim-fade d1">
          <div className="flex animate-ticker whitespace-nowrap">
            {[...ticker, ...ticker].map((t, i) => (
              <span key={i} className="inline-block mx-6 text-[11px] font-medium text-fg-muted shrink-0">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ═══ LEADERBOARD ═══ */}
      <div className="flex-1 min-h-0 panel p-4 flex flex-col anim-fade d2">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h2 className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber" strokeWidth={2.5} />
            <span className="font-display text-base font-bold text-fg">Leaderboard</span>
          </h2>
          <span className="label">{people.length} membri</span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto -mr-2 pr-2 space-y-1.5">
          {leaderboard.map(({ p, xp, streak, likes: lc, insight }, i) => {
            const ci = people.indexOf(p);
            const color = PERSON_COLORS[ci % PERSON_COLORS.length];
            const medal = i < 3 ? ['🥇', '🥈', '🥉'][i] : null;

            return (
              <Link
                key={p.name}
                href={`/profile?name=${encodeURIComponent(p.name)}`}
                onClick={() => {
                  try {
                    localStorage.setItem('shapesquad_active_user', p.name);
                  } catch {}
                }}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg bg-card hover:bg-card-hover border border-border hover:border-border-strong hover:shadow-panel-hover transition-all anim-fade d${Math.min(i + 1, 8)}`}
              >
                {/* Rank */}
                <div className="w-7 shrink-0 text-center">
                  {medal ? (
                    <span className="text-base">{medal}</span>
                  ) : (
                    <span className="font-mono text-[11px] font-bold text-fg-faint">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-display font-black text-white shrink-0"
                  style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
                >
                  {p.name[0]}
                </div>

                {/* Name + insight */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-sm text-fg truncate">{p.name}</span>
                    <span
                      className="chip shrink-0"
                      style={{
                        background: `${xp.tier.color}22`,
                        color: xp.tier.color,
                      }}
                    >
                      {xp.tier.icon} LVL {xp.level}
                    </span>
                  </div>
                  <div className="text-[10px] text-fg-muted truncate mt-0.5">
                    {insight.emoji} {insight.text}
                  </div>
                </div>

                {/* XP */}
                <div className="text-right shrink-0 min-w-[58px]">
                  <div className="font-mono text-sm font-bold tabular-nums" style={{ color: xp.tier.color }}>
                    {xp.total}
                  </div>
                  <div className="label text-[8px]">XP</div>
                </div>

                {/* Streak + likes */}
                <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0 w-12">
                  {streak.current > 0 && (
                    <span className="streak-badge">
                      <Flame className="w-3 h-3" /> {streak.current}
                    </span>
                  )}
                  {lc > 0 && (
                    <span className="text-[10px] text-rose font-bold flex items-center gap-0.5">
                      <Heart className="w-2.5 h-2.5" fill="currentColor" /> {lc}
                    </span>
                  )}
                </div>

                {/* Arrow */}
                <ArrowRight className="w-3.5 h-3.5 text-fg-faint group-hover:text-fg-dim group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
