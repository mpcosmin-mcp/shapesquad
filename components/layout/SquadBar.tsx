'use client';
import { useMemo, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import {
  type Person,
  PERSON_COLORS, calcXP, calcStreak, getLevelTier, monthlyDelta,
} from '@/lib/shape';
import { Avi } from '@/components/ui/Avi';
import { LikeButton } from '@/components/ui/LikeButton';
import { useShapeData } from '@/lib/useShapeData';
import { useActiveUser } from '@/lib/useActiveUser';
import { useLoggedInUser } from '@/lib/useLoggedInUser';
import { likeKey } from '@/lib/likes';

/**
 * Squad Bar — horizontal strip of all team members.
 *
 *   • Click an avatar → switch the dashboard to view that person.
 *   • Hover (or tap) an avatar → small tooltip card with tier / Lv /
 *     streak / strongest metric / top stats / a heart to like the person.
 *
 * Replaces the old UserPicker login + ProfilePopover. Always visible at
 * the top of the dashboard.
 */
export function SquadBar() {
  const { people } = useShapeData();
  const { activeUser, setActiveUser } = useActiveUser();
  const { loggedInUser } = useLoggedInUser();
  const [hovered, setHovered] = useState<string | null>(null);
  const tooltipTimer = useRef<number | null>(null);

  const sorted = useMemo(() => {
    if (people.length === 0) return [] as Array<{ p: Person; idx: number }>;
    // Pin active user first, rest alphabetic
    const active = people.findIndex((p) => p.name === activeUser);
    const others = people
      .map((p, i) => ({ p, i }))
      .filter(({ i }) => i !== active)
      .sort((a, b) => a.p.name.localeCompare(b.p.name));
    const head = active >= 0 ? [{ p: people[active], i: active }] : [];
    return [...head, ...others].map(({ p, i }) => ({ p, idx: i }));
  }, [people, activeUser]);

  if (people.length === 0) return null;

  const showTooltip = (name: string) => {
    if (tooltipTimer.current) window.clearTimeout(tooltipTimer.current);
    setHovered(name);
  };
  const hideTooltip = () => {
    if (tooltipTimer.current) window.clearTimeout(tooltipTimer.current);
    tooltipTimer.current = window.setTimeout(() => setHovered(null), 80);
  };

  return (
    <div className="sticky top-14 z-20 bg-[var(--color-bg)]/85 backdrop-blur-md border-b border-[var(--color-border)]">
      <div className="max-w-6xl mx-auto w-full px-3 sm:px-5 py-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
          <span className="label shrink-0 mr-1">squad</span>
          {sorted.map(({ p, idx }) => (
            <UserChip
              key={p.name}
              person={p}
              color={PERSON_COLORS[idx % PERSON_COLORS.length]}
              active={p.name === activeUser}
              hovered={hovered === p.name}
              onPick={() => setActiveUser(p.name)}
              onEnter={() => showTooltip(p.name)}
              onLeave={hideTooltip}
              currentUser={loggedInUser}
              allPeople={people}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function UserChip({
  person, color, active, hovered, onPick, onEnter, onLeave, currentUser, allPeople,
}: {
  person: Person;
  color: string;
  active: boolean;
  hovered: boolean;
  onPick: () => void;
  onEnter: () => void;
  onLeave: () => void;
  currentUser: string;
  allPeople: Person[];
}) {
  const fn = person.name.split(/\s+/)[0];
  const maxEntries = Math.max(1, ...allPeople.map((p) => p.entries.length));
  const xp = calcXP(person, maxEntries);
  const streak = calcStreak(person);
  const tier = getLevelTier(xp.level);

  return (
    <div className="relative shrink-0">
      <button
        onClick={onPick}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onFocus={onEnter}
        onBlur={onLeave}
        className={`flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border transition-colors ${
          active ? 'ring-1 ring-[var(--color-accent)]/40' : ''
        }`}
        style={{
          background: active
            ? `linear-gradient(135deg, ${color}28, transparent 70%)`
            : `linear-gradient(135deg, ${color}10, transparent 70%)`,
          borderColor: active ? `${color}60` : 'var(--color-border)',
        }}
        aria-pressed={active}
        aria-label={`Vezi datele pentru ${person.name}`}
      >
        <Avi name={person.name} color={color} size="xs" />
        <span className="text-[11px] font-bold whitespace-nowrap" style={{ color: active ? color : 'var(--color-fg)' }}>
          {fn}
        </span>
        <span className="text-[9px] num font-bold opacity-80" style={{ color: tier.color }}>
          {tier.icon}{xp.level}
        </span>
      </button>

      {hovered && (
        <div
          className="absolute left-0 top-full mt-1.5 z-40 w-60 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl shadow-black/40 fade-in-up p-3"
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
        >
          <div className="flex items-center gap-2.5 mb-2">
            <Avi name={person.name} color={color} size="md" />
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm" style={{ color }}>{fn}</div>
              <div className="text-[10px] text-[var(--color-fg-muted)]">
                <span style={{ color: tier.color }}>{tier.icon}</span>
                <span className="num font-semibold ml-1">Lv {xp.level}</span>
                <span className="text-[var(--color-fg-faint)] mx-1">·</span>
                <span>{tier.name}</span>
              </div>
            </div>
            {person.name !== currentUser && (
              <LikeButton
                targetKey={likeKey.user(person.name)}
                by={currentUser}
                size="md"
                mode="pill"
                label={`like pentru ${fn}`}
              />
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center mb-2">
            <Pill label="XP" value={xp.total} />
            <Pill label="Logs" value={person.entries.length} />
            <Pill label="Streak" value={streak.current} icon={streak.current >= 2 ? <Flame size={9} /> : null} />
          </div>

          <Strengths person={person} />
        </div>
      )}
    </div>
  );
}

function Pill({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5">
      <div className="text-[8px] uppercase tracking-wider font-bold text-[var(--color-fg-faint)]">{label}</div>
      <div className="num font-bold text-sm flex items-center justify-center gap-1 leading-none mt-0.5 text-[var(--color-fg)]">
        {icon}
        {value}
      </div>
    </div>
  );
}

/** Show 1-2 "wins" — biggest improvements in the user's own history */
function Strengths({ person }: { person: Person }) {
  const wins = useMemo(() => {
    const candidates: Array<{ label: string; value: string; tone: 'good' | 'warn' }> = [];

    const bfD = monthlyDelta(person, 'bodyFat');
    if (bfD != null) {
      if (bfD <= -0.3) candidates.push({ label: 'BF', value: `${bfD.toFixed(1)}% vs prev`, tone: 'good' });
      else if (bfD >= 0.5) candidates.push({ label: 'BF', value: `+${bfD.toFixed(1)}% vs prev`, tone: 'warn' });
    }
    const musD = monthlyDelta(person, 'muscle');
    if (musD != null) {
      if (musD >= 0.3) candidates.push({ label: 'Muscle', value: `+${musD.toFixed(1)}% vs prev`, tone: 'good' });
      else if (musD <= -0.5) candidates.push({ label: 'Muscle', value: `${musD.toFixed(1)}% vs prev`, tone: 'warn' });
    }
    const kgD = monthlyDelta(person, 'kg');
    if (kgD != null && Math.abs(kgD) >= 0.5) {
      candidates.push({ label: 'Greutate', value: `${kgD > 0 ? '+' : ''}${kgD.toFixed(1)}kg`, tone: 'good' });
    }
    return candidates.slice(0, 2);
  }, [person]);

  if (wins.length === 0) {
    return (
      <div className="text-[10px] text-[var(--color-fg-faint)] italic text-center py-1">
        nicio mișcare semnificativă luna asta
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="text-[9px] uppercase tracking-wider font-bold text-[var(--color-fg-faint)]">recent</div>
      {wins.map((w, i) => (
        <div key={i} className="flex items-center justify-between text-[10px]">
          <span className="text-[var(--color-fg-muted)]">{w.label}</span>
          <span
            className="num font-bold"
            style={{ color: w.tone === 'good' ? 'var(--color-good)' : 'var(--color-warn)' }}
          >
            {w.value}
          </span>
        </div>
      ))}
    </div>
  );
}
