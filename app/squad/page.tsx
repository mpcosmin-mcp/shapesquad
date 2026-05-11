'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Flame, Heart, Zap, ArrowRight } from 'lucide-react';
import { useShapeData } from '@/lib/useShapeData';
import { useActiveUser } from '@/lib/useActiveUser';
import {
  calcXP,
  calcStreak,
  getPersonInsight,
  PERSON_COLORS,
  getLikes,
  getLikeCount,
  Person,
} from '@/lib/shape';

export default function SquadPage() {
  const { loading, people } = useShapeData();
  const { activeUser } = useActiveUser();
  const likes = typeof window !== 'undefined' ? getLikes() : {};

  const maxEntries = useMemo(() => Math.max(1, ...people.map((p) => p.entries.length)), [people]);

  const enriched = useMemo(
    () =>
      people.map((p) => ({
        p,
        xp: calcXP(p, maxEntries),
        streak: calcStreak(p),
        likeCount: getLikeCount(likes, p.name),
        insight: getPersonInsight(p),
      })),
    [people, maxEntries, likes]
  );

  const leaderboard = useMemo(
    () => [...enriched].sort((a, b) => b.xp.total - a.xp.total),
    [enriched]
  );

  // Stats summary
  const topProgress = useMemo(() => {
    return enriched
      .filter((e) => e.p.first.bodyFat != null && e.p.latest.bodyFat != null && e.p.entries.length >= 2)
      .map((e) => ({ ...e, drop: e.p.first.bodyFat! - e.p.latest.bodyFat! }))
      .filter((x) => x.drop > 0)
      .sort((a, b) => b.drop - a.drop)[0];
  }, [enriched]);

  const topStreak = useMemo(
    () => [...enriched].sort((a, b) => b.streak.current - a.streak.current)[0],
    [enriched]
  );

  const onTheRise = useMemo(() => {
    return enriched
      .filter(
        (e) =>
          e.p.previous?.bodyFat != null &&
          e.p.latest.bodyFat != null &&
          e.p.previous.bodyFat - e.p.latest.bodyFat > 0.3
      )
      .sort((a, b) => {
        const da = a.p.previous!.bodyFat! - a.p.latest.bodyFat!;
        const db = b.p.previous!.bodyFat! - b.p.latest.bodyFat!;
        return db - da;
      })[0];
  }, [enriched]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Zap className="w-10 h-10 text-fg-muted mx-auto mb-3 anim-pulse" strokeWidth={2} />
          <p className="text-sm text-fg-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto -mr-2 pr-2 pb-2">
      <div className="space-y-4 max-w-7xl">
        {/* ═══ HEADER ═══ */}
        <div className="anim-fade">
          <h1 className="text-xl font-semibold text-fg tracking-tight">Squad</h1>
          <p className="text-xs text-fg-muted mt-0.5">
            {people.length} membri · click pe oricine pentru profil
          </p>
        </div>

        {/* ═══ SPOTLIGHT CARDS (3) ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 anim-fade d1">
          <SpotlightCard
            label="Lider XP"
            data={leaderboard[0]}
            people={people}
            metric={leaderboard[0] ? `${leaderboard[0].xp.total} XP` : '—'}
            reason={
              leaderboard[0] ? `LVL ${leaderboard[0].xp.level} · ${leaderboard[0].p.entries.length} logs` : ''
            }
          />
          {topProgress ? (
            <SpotlightCard
              label="Cel mai bun progres"
              data={topProgress}
              people={people}
              metric={`-${topProgress.drop.toFixed(1)}% BF`}
              reason="de la prima măsurare"
            />
          ) : (
            <EmptySpotlight label="Cel mai bun progres" />
          )}
          {topStreak && topStreak.streak.current > 0 ? (
            <SpotlightCard
              label="Streak king"
              data={topStreak}
              people={people}
              metric={`${topStreak.streak.current} luni`}
              reason="luni consecutive de log"
            />
          ) : onTheRise ? (
            <SpotlightCard
              label="Pe val acum"
              data={onTheRise}
              people={people}
              metric={`-${(onTheRise.p.previous!.bodyFat! - onTheRise.p.latest.bodyFat!).toFixed(1)}%`}
              reason="progres recent"
            />
          ) : (
            <EmptySpotlight label="Streak king" />
          )}
        </div>

        {/* ═══ LEADERBOARD LIST ═══ */}
        <div className="anim-fade d2">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="label">Leaderboard</h2>
            <span className="text-[10px] text-fg-faint">sortat după XP</span>
          </div>
          <div className="card divide-y divide-[var(--border)]">
            {leaderboard.map(({ p, xp, streak, likeCount, insight }, i) => {
              const ci = people.indexOf(p);
              const color = PERSON_COLORS[ci % PERSON_COLORS.length];
              const isMe = p.name === activeUser;
              const medal = i < 3 ? ['🥇', '🥈', '🥉'][i] : null;

              return (
                <Link
                  key={p.name}
                  href={`/profile?name=${encodeURIComponent(p.name)}`}
                  className="group px-4 py-3 flex items-center gap-3 hover:bg-[var(--card-hover)] transition-colors"
                >
                  <span className="w-7 text-center text-xs font-mono text-fg-faint shrink-0">
                    {medal ?? `#${String(i + 1).padStart(2, '0')}`}
                  </span>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold text-white shrink-0"
                    style={{ background: color }}
                  >
                    {p.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-fg truncate">
                        {p.name}
                      </span>
                      {isMe && <span className="text-[10px] text-fg-muted">· tu</span>}
                      <span
                        className="chip shrink-0"
                        style={{
                          background: `color-mix(in srgb, ${xp.tier.color} 14%, transparent)`,
                          color: xp.tier.color,
                        }}
                      >
                        L{xp.level}
                      </span>
                    </div>
                    <div className="text-[10px] text-fg-muted truncate mt-0.5">
                      {insight.emoji} {insight.text}
                    </div>
                  </div>
                  {streak.current > 0 && (
                    <span className="streak-badge shrink-0">
                      <Flame className="w-2.5 h-2.5" /> {streak.current}
                    </span>
                  )}
                  {likeCount > 0 && (
                    <span className="text-[10px] text-bad flex items-center gap-0.5 font-semibold shrink-0">
                      <Heart className="w-2.5 h-2.5" fill="currentColor" /> {likeCount}
                    </span>
                  )}
                  <div className="text-right shrink-0 w-14">
                    <div className="num text-sm font-semibold tabular-nums" style={{ color: xp.tier.color }}>
                      {xp.total}
                    </div>
                    <div className="text-[8px] text-fg-faint font-mono uppercase tracking-wider">
                      XP
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-fg-faint group-hover:text-fg-muted group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SpotlightCard({
  label,
  data,
  people,
  metric,
  reason,
}: {
  label: string;
  data: any;
  people: Person[];
  metric: string;
  reason: string;
}) {
  if (!data) return <EmptySpotlight label={label} />;
  const { p } = data;
  const ci = people.indexOf(p);
  const color = PERSON_COLORS[ci % PERSON_COLORS.length];

  return (
    <Link href={`/profile?name=${encodeURIComponent(p.name)}`} className="card card-interactive p-4">
      <div className="label mb-2.5">{label}</div>
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
          style={{ background: color }}
        >
          {p.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-fg leading-tight truncate">{p.name}</div>
        </div>
      </div>
      <div className="num text-2xl font-semibold tabular-nums text-fg leading-none">{metric}</div>
      <div className="text-[11px] text-fg-muted mt-1">{reason}</div>
    </Link>
  );
}

function EmptySpotlight({ label }: { label: string }) {
  return (
    <div className="card p-4 opacity-60">
      <div className="label mb-2.5">{label}</div>
      <div className="text-sm text-fg-muted">—</div>
      <div className="text-[11px] text-fg-faint mt-1">nu există date</div>
    </div>
  );
}
