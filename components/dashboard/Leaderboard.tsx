'use client';
import { useMemo, useState } from 'react';
import {
  type Person, type AggRow,
  PERSON_COLORS, aggregateShape, lastNMonths,
  bfColor, muscleColor, visceralColor,
  calcXP, getLevelTier, calcStreak,
} from '@/lib/shape';
import { fmtDate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Avi } from '@/components/ui/Avi';
import { Sparkline } from '@/components/ui/Sparkline';

type Period = 'now' | '3m' | '6m' | 'all';
const PERIODS: { id: Period; label: string }[] = [
  { id: 'now', label: 'Ultima' },
  { id: '3m', label: '3 luni' },
  { id: '6m', label: '6 luni' },
  { id: 'all', label: 'Total' },
];

interface Row {
  name: string;
  gender: 'M' | 'F';
  color: string;
  kg: number | null;
  bodyFat: number | null;
  muscle: number | null;
  visceralFat: number | null;
  entries: number;
  xp: number;
  level: number;
  streak: number;
  badges: { emoji: string; label: string }[];
  hasData: boolean;
}

export function Leaderboard({
  people, currentUser,
}: {
  people: Person[];
  currentUser: string;
}) {
  const [period, setPeriod] = useState<Period>('now');

  const { rows, latestDate, periodLabel } = useMemo(() => {
    const allEntries = people.flatMap((p) => p.entries);
    let scoped = allEntries;
    let label = '';

    if (period === 'now') {
      // For each person, keep only their latest entry
      const byPerson = new Map<string, typeof allEntries[number]>();
      for (const e of allEntries) {
        const cur = byPerson.get(e.name);
        if (!cur || e.date > cur.date) byPerson.set(e.name, e);
      }
      scoped = Array.from(byPerson.values());
      label = 'ultima măsurătoare per persoană';
    } else if (period === '3m') {
      scoped = lastNMonths(allEntries, 3);
      label = 'ultimele 3 luni';
    } else if (period === '6m') {
      scoped = lastNMonths(allEntries, 6);
      label = 'ultimele 6 luni';
    } else {
      label = 'tot istoricul';
    }

    const aggRows: AggRow[] = aggregateShape(scoped);
    const maxEntries = Math.max(1, ...people.map((p) => p.entries.length));

    // Best-of badges
    const bfBest = bestBy(aggRows.filter((r) => r.bodyFat != null), (r) => -(r.bodyFat ?? Infinity));
    const musBest = bestBy(aggRows.filter((r) => r.muscle != null), (r) => r.muscle ?? -Infinity);
    const vfBest = bestBy(aggRows.filter((r) => r.visceralFat != null), (r) => -(r.visceralFat ?? Infinity));
    const streakBest = bestBy(
      people.map((p) => ({ name: p.name, val: calcStreak(p).current })),
      (r) => r.val,
    );

    const built: Row[] = people.map((p, idx) => {
      const a = aggRows.find((x) => x.name === p.name);
      const color = PERSON_COLORS[idx % PERSON_COLORS.length];
      const xp = calcXP(p, maxEntries);
      const streak = calcStreak(p).current;
      const badges: Row['badges'] = [];
      if (a) {
        if (bfBest?.name === p.name && a.bodyFat != null) badges.push({ emoji: '🔥', label: 'lowest BF' });
        if (musBest?.name === p.name && a.muscle != null) badges.push({ emoji: '💪', label: 'muscle king' });
        if (vfBest?.name === p.name && a.visceralFat != null) badges.push({ emoji: '🫀', label: 'lowest visceral' });
      }
      if (streakBest?.name === p.name && streak >= 2) badges.push({ emoji: '⚡', label: `${streak}m streak` });

      // Sort rank by overall: prefer BF (lower better), then muscle (higher better)
      const sortKey = (a?.bodyFat ?? 99) - (a?.muscle ?? 0) * 0.3;

      return {
        name: p.name,
        gender: p.gender,
        color,
        kg: a?.kg ?? null,
        bodyFat: a?.bodyFat ?? null,
        muscle: a?.muscle ?? null,
        visceralFat: a?.visceralFat ?? null,
        entries: a?.entries ?? 0,
        xp: xp.total,
        level: xp.level,
        streak,
        badges,
        hasData: !!a,
        _sortKey: sortKey,
      } as Row & { _sortKey: number };
    }).sort((a, b) => (a as any)._sortKey - (b as any)._sortKey);

    const lastDate = scoped.map((e) => e.date).sort().slice(-1)[0] || '';

    return { rows: built, latestDate: lastDate, periodLabel: label };
  }, [people, period]);

  const champion = rows[0]?.hasData ? rows[0] : null;

  return (
    <Card className="overflow-hidden">
      {champion && (
        <div
          className="px-4 sm:px-5 py-3 border-b border-[var(--color-border)] flex items-center gap-3"
          style={{ background: `linear-gradient(90deg, ${champion.color}18, transparent 70%)` }}
        >
          <span className="text-2xl shrink-0">🏆</span>
          <div className="flex-1 min-w-0">
            <div className="label truncate" style={{ color: champion.color }}>
              campion · {periodLabel}
            </div>
            <div className="font-bold text-sm truncate">
              {champion.name.split(/\s+/)[0]}{' '}
              {champion.bodyFat != null && (
                <span className="num text-[var(--color-fg-muted)] font-medium">· BF {champion.bodyFat.toFixed(1)}%</span>
              )}
            </div>
          </div>
          {champion.muscle != null && (
            <div className="text-right shrink-0">
              <div className="label">MUSCLE</div>
              <div className="num font-bold text-sm" style={{ color: muscleColor(champion.muscle, champion.gender) }}>
                {champion.muscle.toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      )}

      <div className="px-5 pt-4 pb-2 flex items-center gap-1 flex-wrap">
        <span className="label mr-1">clasament</span>
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${
              period === p.id
                ? 'bg-[var(--color-accent)] text-[var(--color-bg)]'
                : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface)]'
            }`}
          >
            {p.label}
          </button>
        ))}
        {latestDate && period === 'now' && (
          <span className="ml-auto text-[9px] num text-[var(--color-fg-muted)]">{fmtDate(latestDate)}</span>
        )}
      </div>

      <div className="px-3 pb-3 pt-1 space-y-1">
        {rows.map((r, i) => (
          <LeaderRow
            key={r.name}
            row={r}
            rank={i}
            isMe={r.name === currentUser}
            people={people}
          />
        ))}
      </div>
    </Card>
  );
}

function LeaderRow({
  row, rank, isMe, people,
}: {
  row: Row;
  rank: number;
  isMe: boolean;
  people: Person[];
}) {
  const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : '·';
  const tier = getLevelTier(row.level);
  const c = row.color;
  const fn = row.name.split(/\s+/)[0];

  // BF sparkline last 6 measurements
  const { sparkValues, sparkDates } = useMemo(() => {
    const person = people.find((p) => p.name === row.name);
    if (!person) return { sparkValues: [], sparkDates: [] };
    const sorted = [...person.entries].sort((a, b) => a.date.localeCompare(b.date)).slice(-6);
    return {
      sparkValues: sorted.map((e) => e.bodyFat),
      sparkDates: sorted.map((e) => e.date),
    };
  }, [people, row.name]);

  return (
    <div
      className={`block rounded-xl px-3 py-2.5 ${
        isMe ? 'bg-[var(--color-accent)]/8 ring-1 ring-[var(--color-accent)]/30' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg w-5 text-center shrink-0">{medal}</span>
        <Avi name={row.name} color={c} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-sm truncate" style={{ color: c }}>
              {fn}
            </span>
            {isMe && <span className="text-[8px] uppercase tracking-wider text-[var(--color-accent)] font-bold">tu</span>}
            <span
              className="text-[9px] num font-bold px-1 py-0.5 rounded shrink-0"
              style={{ color: tier.color, background: tier.color + '15' }}
            >
              {tier.icon} Lv{row.level}
            </span>
            {row.badges.slice(0, 3).map((b, i) => (
              <span key={i} className="text-[10px]" title={b.label}>{b.emoji}</span>
            ))}
          </div>
          <div className="text-[10px] text-[var(--color-fg-muted)] flex items-center gap-1.5 mt-0.5 flex-wrap">
            {row.hasData ? (
              <>
                {row.kg != null && <span className="num">{row.kg.toFixed(1)}<span className="text-[8px] opacity-70 ml-0.5">kg</span></span>}
                {row.muscle != null && (
                  <>
                    <span className="text-[var(--color-fg-faint)]">·</span>
                    <span className="num">
                      <strong style={{ color: muscleColor(row.muscle, row.gender) }}>{row.muscle.toFixed(1)}%</strong>
                      <span className="text-[8px] opacity-70 ml-0.5">mus</span>
                    </span>
                  </>
                )}
                {row.visceralFat != null && (
                  <>
                    <span className="text-[var(--color-fg-faint)]">·</span>
                    <span className="num">
                      v<strong style={{ color: visceralColor(row.visceralFat) }}>{row.visceralFat}</strong>
                    </span>
                  </>
                )}
                <span className="text-[var(--color-fg-faint)] ml-auto">{row.entries}m</span>
              </>
            ) : (
              <span className="italic text-[var(--color-fg-faint)]">nicio măsurătoare în interval</span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div
            className="num font-bold text-2xl sm:text-3xl leading-none"
            style={{ color: row.hasData && row.bodyFat != null ? bfColor(row.bodyFat, row.gender) : '#52525b' }}
          >
            {row.hasData && row.bodyFat != null ? row.bodyFat.toFixed(1) : '—'}
          </div>
          <div className="num text-[9px] text-[var(--color-fg-faint)] mt-0.5">BF%</div>
        </div>
        <Sparkline
          values={sparkValues}
          dates={sparkDates}
          width={40}
          height={20}
          color={c}
          className="shrink-0 hidden sm:block"
        />
      </div>
    </div>
  );
}

function bestBy<T>(arr: T[], score: (x: T) => number): T | null {
  if (!arr.length) return null;
  let best = arr[0];
  let bestScore = score(best);
  for (const x of arr.slice(1)) {
    const s = score(x);
    if (s > bestScore) { best = x; bestScore = s; }
  }
  return bestScore > -Infinity ? best : null;
}
