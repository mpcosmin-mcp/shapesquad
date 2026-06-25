'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { Flame } from 'lucide-react';
import {
  type Person,
  PERSON_COLORS, firstNameOf, calcXP, calcStreak, getLevelTier,
} from '@/lib/shape';
import { ARIA_SCHEDULE, getWeekStart, getWeekDates, isToday, isPast, type Activity } from '@/lib/activities';
import { Avi } from '@/components/ui/Avi';
import { AriaLogo } from '@/components/ui/AriaLogo';
import { useShapeData } from '@/lib/useShapeData';
import { useLoggedInUser } from '@/lib/useLoggedInUser';

/**
 * Squad Rail — vertical left column listing all team members.
 *
 * Clicking a member OPENS THE PEEK MODAL for them (does NOT change the
 * main dashboard — that is always the logged-in user's own data).
 *
 * The logged-in user is shown pinned at top, labelled "tu", and is not
 * clickable (no point peeking at yourself).
 *
 * Desktop (lg+): sticky left rail w-56.
 * Mobile: hidden — opened as a drawer via the "Squad" button in AppShell.
 */
export function SquadRail({
  peekTarget,
  onPeek,
  className = '',
}: {
  peekTarget: string | null;
  onPeek: (name: string | null) => void;
  className?: string;
}) {
  const { people } = useShapeData();
  const { loggedInUser } = useLoggedInUser();

  const sorted = useMemo(() => {
    if (people.length === 0) return [] as Array<{ p: Person; idx: number }>;
    // Logged-in user pinned first, rest alphabetic
    const selfIdx = people.findIndex((p) => p.name === loggedInUser);
    const others = people
      .map((p, i) => ({ p, i }))
      .filter(({ i }) => i !== selfIdx)
      .sort((a, b) => a.p.name.localeCompare(b.p.name));
    const head = selfIdx >= 0 ? [{ p: people[selfIdx], i: selfIdx }] : [];
    return [...head, ...others].map(({ p, i }) => ({ p, idx: i }));
  }, [people, loggedInUser]);

  if (people.length === 0) return null;

  return (
    <aside
      className={`flex flex-col gap-1 ${className}`}
      aria-label="Membrii echipei"
    >
      <div className="label px-2 mb-1">squad</div>
      {sorted.map(({ p, idx }, pos) => {
        const isSelf = p.name === loggedInUser;
        const isActive = peekTarget === p.name;
        return (
          <div key={p.name} className={`fade-in-up delay-${Math.min(pos, 4)}`}>
            <RailChip
              person={p}
              color={PERSON_COLORS[idx % PERSON_COLORS.length]}
              isSelf={isSelf}
              isActive={isActive}
              allPeople={people}
              onClick={() => {
                if (isSelf) return;
                onPeek(isActive ? null : p.name);
              }}
            />
          </div>
        );
      })}

      {/* Aria partnership section */}
      <AriaRailSection />
    </aside>
  );
}

/* ─── Single rail chip ──────────────────────────────────── */

function RailChip({
  person,
  color,
  isSelf,
  isActive,
  allPeople,
  onClick,
}: {
  person: Person;
  color: string;
  isSelf: boolean;
  isActive: boolean;
  allPeople: Person[];
  onClick: () => void;
}) {
  const fn = firstNameOf(person.name);
  const maxEntries = Math.max(1, ...allPeople.map((p) => p.entries.length));
  const xp = calcXP(person, maxEntries);
  const streak = calcStreak(person);
  const tier = getLevelTier(xp.level);

  return (
    <button
      onClick={onClick}
      disabled={isSelf}
      className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-xl border transition-all duration-150 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]
        ${isSelf
          ? 'opacity-70 cursor-default border-transparent bg-[var(--color-surface)]'
          : isActive
            ? 'border-[var(--color-accent)]/50 ring-1 ring-[var(--color-accent)]/20 hover:-translate-y-0.5 hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.4)]'
            : 'border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-surface)] hover:-translate-y-0.5 hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.4)]'
        }`}
      style={isActive
        ? { background: `linear-gradient(135deg, ${color}18, transparent 70%)` }
        : isSelf
          ? { background: `linear-gradient(135deg, ${color}10, transparent 70%)` }
          : undefined
      }
      aria-pressed={isActive}
      aria-label={isSelf ? `Tu (${fn})` : `Vizualizează datele lui ${fn}`}
      title={isSelf ? undefined : `Peek ${fn}`}
    >
      <Avi name={person.name} color={color} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-bold truncate" style={{ color: isActive ? color : 'var(--color-fg)' }}>
            {fn}
          </span>
          {isSelf && (
            <span
              className="text-[8px] font-bold uppercase tracking-widest shrink-0"
              style={{ color }}
            >
              tu
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[9px] num">
          <span style={{ color: tier.color }}>{tier.icon}</span>
          <span className="font-bold" style={{ color: tier.color }}>Lv {xp.level}</span>
          {streak.current >= 2 && (
            <span className="flex items-center gap-0.5 text-[var(--color-fg-faint)]">
              <Flame size={8} style={{ color: '#f97316' }} />
              <span className="font-semibold" style={{ color: '#f97316' }}>{streak.current}</span>
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ─── Aria partnership card in the rail ─────────────────── */

function AriaRailSection() {
  const today = getWeekStart(new Date());
  const dates = getWeekDates(today);
  const todayStr = dates.find(isToday);

  const todaySessions = todayStr
    ? ARIA_SCHEDULE.filter((a) => {
        const d = new Date(todayStr);
        return a.day === ((d.getDay() + 6) % 7); // JS getDay: 0=Sun → our 0=Mon
      })
    : [];

  const upcoming = todaySessions.length > 0 ? todaySessions : getNextSessions(dates);

  return (
    <>
      <div className="my-2 border-t border-[var(--color-border)]/50" />
      <Link
        href="/activitati"
        className="group flex flex-col items-center gap-2 px-2 py-3 rounded-xl border border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-all"
      >
        <AriaLogo size={52} />
        <div className="text-center">
          <div className="text-xs font-bold text-[var(--color-fg)] group-hover:text-[var(--color-good)] transition-colors">
            Activități Aria
          </div>
          <div className="text-[8px] uppercase tracking-widest text-[var(--color-fg-faint)] mt-0.5">
            Parteneriat Aumovio
          </div>
        </div>
        {upcoming.length > 0 && (
          <div className="w-full space-y-1">
            {upcoming.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--color-surface)]/60 text-[9px]"
              >
                <span>{a.emoji}</span>
                <span className="font-semibold truncate" style={{ color: a.color }}>{a.name}</span>
                <span className="num text-[var(--color-fg-faint)] ml-auto shrink-0">{a.startTime}</span>
              </div>
            ))}
            <div className="text-[8px] text-center text-[var(--color-fg-faint)]">
              {todaySessions.length > 0 ? 'azi' : 'următoarele'}
            </div>
          </div>
        )}
      </Link>
    </>
  );
}

function getNextSessions(dates: string[]): Activity[] {
  for (const d of dates) {
    if (isPast(d)) continue;
    const dayIdx = (new Date(d).getDay() + 6) % 7;
    const sessions = ARIA_SCHEDULE.filter((a) => a.day === dayIdx);
    if (sessions.length > 0) return sessions;
  }
  return [];
}
