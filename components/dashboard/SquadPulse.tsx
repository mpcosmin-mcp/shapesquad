'use client';
import { useMemo } from 'react';
import { Flame, Check } from 'lucide-react';
import {
  type Person, PERSON_COLORS, calcStreak, loggedInMonth,
} from '@/lib/shape';
import { Avi } from '@/components/ui/Avi';
import { Card } from '@/components/ui/Card';
import { thisMonthKey, fmtMonth } from '@/lib/utils';

/**
 * Squad Pulse — horizontal strip showing who logged this month.
 *
 * Rewards CONSISTENCY, not values. Each member shows:
 *   • avatar + first name
 *   • ✓ if they logged this month, dimmed if not
 *   • streak (consecutive months) with 🔥 if ≥ 2
 *
 * Sort order: people who logged this month first (sorted by streak desc),
 * then the rest. No comparison of measurements.
 */
export function SquadPulse({
  people, currentUser,
}: {
  people: Person[];
  currentUser: string;
}) {
  const month = thisMonthKey();
  const monthLabel = fmtMonth(month).toLowerCase();

  const rows = useMemo(() => {
    const built = people.map((p, idx) => ({
      person: p,
      idx,
      color: PERSON_COLORS[idx % PERSON_COLORS.length],
      logged: loggedInMonth(p, month),
      streak: calcStreak(p).current,
    }));
    return built.sort((a, b) => {
      if (a.logged && !b.logged) return -1;
      if (!a.logged && b.logged) return 1;
      if (a.streak !== b.streak) return b.streak - a.streak;
      return a.person.name.localeCompare(b.person.name);
    });
  }, [people, month]);

  const loggedCount = rows.filter((r) => r.logged).length;

  return (
    <Card className="px-4 sm:px-5 py-4">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-1">
        <div>
          <div className="label">Squad pulse · {monthLabel}</div>
          <div className="text-[10px] num text-[var(--color-fg-faint)] mt-0.5">
            {loggedCount}/{people.length} au logat luna asta
          </div>
        </div>
        <div className="text-[10px] num text-[var(--color-fg-muted)]">
          🔥 = consistență · ✓ = log luna asta
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        {rows.map(({ person, color, logged, streak }) => {
          const isMe = person.name === currentUser;
          const fn = person.name.split(/\s+/)[0];
          return (
            <div
              key={person.name}
              className={`relative flex flex-col items-center gap-1 px-2 py-2 rounded-xl shrink-0 transition-colors ${
                isMe ? 'ring-1 ring-[var(--color-accent)]/40 bg-[var(--color-accent)]/8' : ''
              }`}
              style={{ minWidth: 64 }}
            >
              <div className="relative">
                <Avi name={person.name} color={color} size="md" className={logged ? '' : 'opacity-40'} />
                {logged && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--color-good)] flex items-center justify-center text-[var(--color-bg)]"
                    aria-label="a logat luna asta"
                  >
                    <Check size={10} strokeWidth={3} />
                  </span>
                )}
              </div>
              <div className="text-[11px] font-bold truncate max-w-[56px]" style={{ color: logged ? color : 'var(--color-fg-faint)' }}>
                {fn}
              </div>
              {streak >= 2 ? (
                <div className="flex items-center gap-0.5 text-[9px] num font-bold text-[var(--color-accent)]">
                  <Flame size={9} />
                  <span>{streak}</span>
                </div>
              ) : (
                <div className="text-[9px] num text-[var(--color-fg-faint)]">
                  {person.entries.length} logs
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
