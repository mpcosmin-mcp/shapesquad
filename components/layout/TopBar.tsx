'use client';
import Link from 'next/link';
import { useActiveUser } from '@/lib/useActiveUser';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ProfilePopover } from '@/components/layout/ProfilePopover';

/**
 * Thin sticky top bar — single source of identity chrome.
 *
 *   Left:  brand "shape · squad"
 *   Right: theme toggle + profile chip (click → popover with profile/XP/switch user)
 */
export function TopBar() {
  const { activeUser, mounted } = useActiveUser();
  if (!mounted || !activeUser) return null;

  return (
    <header className="sticky top-0 z-30 bg-[var(--color-bg)]/85 backdrop-blur-md border-b border-[var(--color-border)] pt-safe">
      <div className="flex items-center justify-between gap-3 h-14 px-3 sm:px-5 max-w-6xl mx-auto w-full">
        <Link href="/" className="flex items-baseline gap-2 group">
          <span className="num text-xl font-bold tracking-tight transition-colors group-hover:text-[var(--color-accent)]">
            shape
          </span>
          <span className="text-[9px] uppercase tracking-[0.22em] text-[var(--color-fg-muted)] font-medium hidden sm:inline">
            body · squad · ai
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <ProfilePopover />
        </div>
      </div>
    </header>
  );
}
