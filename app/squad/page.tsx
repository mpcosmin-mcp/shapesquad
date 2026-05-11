'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Flame,
  Trophy,
  TrendingDown,
  TrendingUp,
  Crown,
  Heart,
  ArrowRight,
  Zap,
} from 'lucide-react';
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

  const topProgress = useMemo(() => {
    return enriched
      .filter((e) => e.p.first.bodyFat != null && e.p.latest.bodyFat != null && e.p.entries.length >= 2)
      .map((e) => ({ ...e, drop: e.p.first.bodyFat! - e.p.latest.bodyFat! }))
      .filter((x) => x.drop > 0)
      .sort((a, b) => b.drop - a.drop)[0];
  }, [enriched]);

  const topStreak = useMemo(() => {
    return [...enriched].sort((a, b) => b.streak.current - a.streak.current)[0];
  }, [enriched]);

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
        <div className="text-center anim-fade">
          <Zap className="w-12 h-12 text-bronze mx-auto mb-4 anim-pulse" strokeWidth={2.5} fill="currentColor" />
          <p className="font-display text-base italic text-fg-dim">Citesc echipa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto -mr-2 pr-2 pb-2">
      <div className="space-y-3">
        <div className="anim-fade">
          <h1 className="font-display text-xl md:text-2xl font-bold tracking-tight text-fg">
            Squad
          </h1>
          <p className="text-[11px] text-fg-muted mt-0.5">
            Cine progresează · click pe oricine pentru profil
          </p>
        </div>

        {/* ═══ 4 story modules ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 anim-fade d1">
          <StoryCard
            icon={<Crown className="w-4 h-4" />}
            label="Lider XP"
            data={leaderboard[0]}
            people={people}
            metric={`${leaderboard[0]?.xp.total ?? 0} XP`}
            tint="amber"
            reason={`LVL ${leaderboard[0]?.xp.level} · ${leaderboard[0]?.p.entries.length} logs`}
          />
          {topProgress && (
            <StoryCard
              icon={<TrendingDown className="w-4 h-4" />}
              label="Cel mai mare progres"
              data={topProgress}
              people={people}
              metric={`−${topProgress.drop.toFixed(1)}% BF`}
              tint="emerald"
              reason="de la prima măsurare"
            />
          )}
          {topStreak && topStreak.streak.current > 0 && (
            <StoryCard
              icon={<Flame className="w-4 h-4" />}
              label="Streak king"
              data={topStreak}
              people={people}
              metric={`${topStreak.streak.current} luni`}
              tint="rose"
              reason="luni consecutive"
            />
          )}
          {onTheRise && (
            <StoryCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="Pe val acum"
              data={onTheRise}
              people={people}
              metric={`−${(onTheRise.p.previous!.bodyFat! - onTheRise.p.latest.bodyFat!).toFixed(1)}%`}
              tint="cyan"
              reason="progres la ultim check-in"
            />
          )}
        </div>

        {/* ═══ Squad list ═══ */}
        <div className="anim-fade d2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber" strokeWidth={2.5} />
              <span className="font-display text-base font-bold">Toată echipa</span>
            </h2>
            <span className="label">{people.length} membri</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {leaderboard.map(({ p, xp, streak, likeCount, insight }, i) => (
              <PersonCard
                key={p.name}
                person={p}
                people={people}
                xp={xp}
                streak={streak}
                likeCount={likeCount}
                insight={insight}
                rank={i + 1}
                isMe={p.name === activeUser}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StoryCard({
  icon,
  label,
  data,
  people,
  metric,
  tint,
  reason,
}: {
  icon: React.ReactNode;
  label: string;
  data: any;
  people: Person[];
  metric: string;
  tint: 'amber' | 'emerald' | 'rose' | 'cyan';
  reason: string;
}) {
  if (!data) return null;
  const { p } = data;
  const ci = people.indexOf(p);
  const color = PERSON_COLORS[ci % PERSON_COLORS.length];
  const tintVar = {
    amber: 'var(--amber)',
    emerald: 'var(--emerald)',
    rose: 'var(--rose)',
    cyan: 'var(--cyan)',
  }[tint];

  return (
    <Link
      href={`/profile?name=${encodeURIComponent(p.name)}`}
      className="panel panel-interactive p-3 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: tintVar }} />
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
          style={{
            background: `color-mix(in srgb, ${tintVar} 15%, transparent)`,
            color: tintVar,
          }}
        >
          {icon}
        </div>
        <div className="label text-[9px]" style={{ color: tintVar }}>
          {label}
        </div>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-display font-black text-white shrink-0"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)` }}
        >
          {p.name[0]}
        </div>
        <div className="font-display font-bold text-base text-fg leading-tight truncate">
          {p.name}
        </div>
      </div>
      <div className="font-mono text-lg font-bold tabular-nums leading-tight" style={{ color: tintVar }}>
        {metric}
      </div>
      <div className="text-[10px] text-fg-muted mt-0.5 leading-tight">{reason}</div>
    </Link>
  );
}

function PersonCard({
  person,
  people,
  xp,
  streak,
  likeCount,
  insight,
  rank,
  isMe,
}: {
  person: Person;
  people: Person[];
  xp: any;
  streak: any;
  likeCount: number;
  insight: any;
  rank: number;
  isMe: boolean;
}) {
  const ci = people.indexOf(person);
  const color = PERSON_COLORS[ci % PERSON_COLORS.length];
  const medal = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : null;
  const bfDelta =
    person.first?.bodyFat != null && person.latest?.bodyFat != null
      ? person.latest.bodyFat - person.first.bodyFat
      : null;
  const kgDelta =
    person.first?.kg != null && person.latest?.kg != null
      ? person.latest.kg - person.first.kg
      : null;

  return (
    <Link
      href={`/profile?name=${encodeURIComponent(person.name)}`}
      className="panel panel-interactive p-3 relative overflow-hidden"
      style={
        isMe
          ? {
              borderColor: `color-mix(in srgb, ${color} 50%, var(--border))`,
              boxShadow: `var(--shadow-panel-hover), 0 0 0 1px ${color}44`,
            }
          : undefined
      }
    >
      <div className="flex items-start gap-3 mb-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-display font-black text-white shrink-0 shadow-panel"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)` }}
        >
          {person.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-display font-bold text-sm text-fg truncate">{person.name}</span>
            {medal && <span className="text-xs">{medal}</span>}
            {isMe && <span className="chip text-[8px] bg-bronze/15 text-bronze">tu</span>}
          </div>
          <div className="text-[10px] text-fg-muted font-mono mt-0.5">
            #{String(rank).padStart(2, '0')} · {person.entries.length} logs
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-sm font-bold tabular-nums" style={{ color: xp.tier.color }}>
            {xp.total}
          </div>
          <div className="label text-[8px]">XP</div>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-2 flex-wrap">
        <span className="chip text-[9px]" style={{ background: `${xp.tier.color}22`, color: xp.tier.color }}>
          {xp.tier.icon} LVL {xp.level}
        </span>
        {streak.current > 0 && (
          <span className="streak-badge">
            <Flame className="w-2.5 h-2.5" /> {streak.current}
          </span>
        )}
        {likeCount > 0 && (
          <span className="text-[10px] text-rose flex items-center gap-0.5">
            <Heart className="w-2.5 h-2.5" fill="currentColor" /> {likeCount}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-2 text-[10px] font-mono tabular-nums">
        {kgDelta != null && kgDelta !== 0 && <DeltaInline value={kgDelta} suffix="kg" lower={false} />}
        {bfDelta != null && bfDelta !== 0 && <DeltaInline value={bfDelta} suffix="%" lower={true} />}
      </div>

      <div
        className="rounded-md px-2 py-1.5 text-[10px] leading-snug"
        style={{
          background:
            insight.tone === 'good'
              ? 'color-mix(in srgb, var(--emerald) 6%, transparent)'
              : insight.tone === 'warn'
              ? 'color-mix(in srgb, var(--amber) 6%, transparent)'
              : 'color-mix(in srgb, var(--fg-muted) 5%, transparent)',
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
    </Link>
  );
}

function DeltaInline({ value, suffix, lower }: { value: number; suffix: string; lower: boolean }) {
  const isGood = lower ? value < 0 : value > 0;
  const color = value === 0 ? 'var(--fg-muted)' : isGood ? 'var(--emerald)' : 'var(--rose)';
  return (
    <span
      className="px-1.5 py-0.5 rounded font-bold"
      style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}
    >
      {value > 0 ? '+' : ''}
      {value.toFixed(1)}
      {suffix}
    </span>
  );
}
