'use client';
import { useMemo } from 'react';
import {
  type Person, PERSON_COLORS, monthlyDelta, personalDeltaColor,
  calcStreak, progressStatus,
} from '@/lib/shape';
import { Avi } from '@/components/ui/Avi';
import { Card } from '@/components/ui/Card';

/**
 * Progress Wall — equal-status grid of cards, one per person.
 *
 * Each card shows the person's Δ vs their PREVIOUS measurement (not vs others):
 *   • Δ kg (neutral coloring — weight goal varies per person)
 *   • Δ Body Fat % (green if down, red if up)
 *   • Δ Muscle % (green if up, red if down)
 *
 * No ranking. No medals. No champion banner. The only highlight is the user's
 * own card, which gets a soft indigo ring so they can spot themselves quickly.
 *
 * Sort order: current user first, rest alphabetical.
 */
export function ProgressWall({
  people, currentUser,
}: {
  people: Person[];
  currentUser: string;
}) {
  const rows = useMemo(() => {
    return [...people]
      .map((p, idx) => ({
        person: p,
        idx,
        color: PERSON_COLORS[idx % PERSON_COLORS.length],
      }))
      .sort((a, b) => {
        if (a.person.name === currentUser) return -1;
        if (b.person.name === currentUser) return 1;
        return a.person.name.localeCompare(b.person.name);
      });
  }, [people, currentUser]);

  return (
    <Card className="px-4 sm:px-5 py-4">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-1">
        <div>
          <div className="label">Pentru fun · cum stăm cu toții</div>
          <div className="text-[10px] num text-[var(--color-fg-faint)] mt-0.5">
            fiecare card e propria direcție · ne uităm unul la altul ca să râdem, nu să ne batem
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {rows.map(({ person, color }) => (
          <ProgressCard
            key={person.name}
            person={person}
            color={color}
            isMe={person.name === currentUser}
          />
        ))}
      </div>
    </Card>
  );
}

function ProgressCard({
  person, color, isMe,
}: {
  person: Person;
  color: string;
  isMe: boolean;
}) {
  const fn = person.name.split(/\s+/)[0];
  const kgD = monthlyDelta(person, 'kg');
  const bfD = monthlyDelta(person, 'bodyFat');
  const musD = monthlyDelta(person, 'muscle');
  const streak = calcStreak(person).current;
  const status = progressStatus(person);

  const statusLabel = status === 'progres' ? 'Progres' : status === 'recalibrare' ? 'Recalibrare' : 'Stabil';
  const statusColor =
    status === 'progres' ? 'var(--color-good)'
    : status === 'recalibrare' ? 'var(--color-warn)'
    : 'var(--color-fg-muted)';
  const statusBg = `color-mix(in srgb, ${statusColor} 12%, transparent)`;

  return (
    <div
      className={`rounded-xl border p-3 relative overflow-hidden ${
        isMe ? 'ring-1 ring-[var(--color-accent)]/40' : ''
      }`}
      style={{
        background: `linear-gradient(135deg, ${color}08, transparent 70%)`,
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="absolute inset-y-0 left-0 w-0.5" style={{ background: color, opacity: 0.6 }} />

      <div className="flex items-center gap-2.5 pl-1 mb-2">
        <Avi name={person.name} color={color} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="font-bold text-sm truncate" style={{ color }}>{fn}</span>
            {isMe && <span className="text-[8px] uppercase tracking-wider text-[var(--color-accent)] font-bold">tu</span>}
          </div>
          <div className="text-[9px] num text-[var(--color-fg-faint)]">
            {person.entries.length} măsurători{streak >= 2 ? ` · 🔥${streak}m streak` : ''}
          </div>
        </div>
        <span
          className="num text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap"
          style={{ background: statusBg, color: statusColor }}
        >
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <DeltaPill label="kg" delta={kgD} lowerBetter={false} neutral />
        <DeltaPill label="BF" delta={bfD} lowerBetter={true} unit="%" />
        <DeltaPill label="muscle" delta={musD} lowerBetter={false} unit="%" />
      </div>
    </div>
  );
}

function DeltaPill({
  label, delta, lowerBetter, unit = '', neutral = false,
}: {
  label: string;
  delta: number | null;
  lowerBetter: boolean;
  unit?: string;
  neutral?: boolean;
}) {
  const color = neutral
    ? 'var(--color-fg-dim)'
    : personalDeltaColor(delta, lowerBetter);
  const arrow = delta == null ? '·' : delta > 0 ? '+' : '';
  const display = delta == null ? '—' : `${arrow}${delta.toFixed(1)}${unit}`;
  return (
    <div className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-1.5 text-center">
      <div className="text-[8px] uppercase tracking-wider text-[var(--color-fg-faint)] font-bold">
        {label}
      </div>
      <div className="num text-sm font-bold leading-tight" style={{ color }}>
        {display}
      </div>
    </div>
  );
}
