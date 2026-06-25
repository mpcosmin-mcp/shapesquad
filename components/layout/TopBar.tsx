'use client';
import Link from 'next/link';
import { LogOut, PlusCircle, CalendarDays } from 'lucide-react';
import { PERSON_COLORS } from '@/lib/shape';
import { useLoggedInUser } from '@/lib/useLoggedInUser';
import { useShapeData } from '@/lib/useShapeData';
import { Avi } from '@/components/ui/Avi';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { InstallAppButton } from '@/components/layout/InstallAppButton';

/**
 * Thin sticky top bar — minimal chrome.
 *
 *   Left:  brand "shape squad"
 *   Right: your identity chip (click → switch account) · install · theme.
 *
 * The chip shows WHO YOU ARE (logged-in identity). Viewing other people via
 * the SquadBar doesn't change it.
 */
export function TopBar() {
  const { loggedInUser, logout, isAdmin } = useLoggedInUser();
  const { people } = useShapeData();

  const idx = people.findIndex((p) => p.name === loggedInUser);
  const color = idx >= 0 ? PERSON_COLORS[idx % PERSON_COLORS.length] : 'var(--color-accent)';
  const fn = loggedInUser ? loggedInUser.split(/\s+/)[0] : '';

  return (
    <header className="sticky top-0 z-30 bg-[var(--color-bg)]/85 backdrop-blur-md border-b border-[var(--color-border)] pt-safe">
      <div className="flex items-center justify-between gap-3 h-14 px-3 sm:px-5 max-w-6xl mx-auto w-full">
        <Link href="/" className="flex items-baseline gap-2 group">
          <span className="num text-xl font-bold tracking-tight transition-colors group-hover:text-[var(--color-accent)]">
            shape
          </span>
          <span className="text-[9px] uppercase tracking-[0.22em] text-[var(--color-fg-muted)] font-medium hidden sm:inline">
            body · squad
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/activitati"
            title="Activități Aria"
            aria-label="Activități Aria"
            className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full border border-[var(--color-good)]/40 bg-[var(--color-good)]/10 text-[var(--color-good)] hover:bg-[var(--color-good)]/20 transition-colors mr-0.5"
          >
            <CalendarDays size={14} />
            <span className="text-[11px] font-bold hidden sm:inline">Aria</span>
          </Link>
          {isAdmin && (
            <Link
              href="/log"
              title="Loghează măsurătoare"
              aria-label="Loghează măsurătoare"
              className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 transition-colors mr-0.5"
            >
              <PlusCircle size={14} />
              <span className="text-[11px] font-bold hidden sm:inline">Log</span>
            </Link>
          )}
          {loggedInUser && (
            <button
              onClick={logout}
              title="Schimbă cont"
              aria-label="Schimbă cont"
              className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full border border-[var(--color-border)] hover:border-[var(--color-fg-dim)] transition-colors mr-0.5"
              style={{ background: `linear-gradient(135deg, ${color}18, transparent 70%)` }}
            >
              <Avi name={loggedInUser} color={color} size="xs" />
              <span className="text-[11px] font-bold hidden sm:inline" style={{ color }}>{fn}</span>
              <LogOut size={12} className="text-[var(--color-fg-muted)]" />
            </button>
          )}
          <InstallAppButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
