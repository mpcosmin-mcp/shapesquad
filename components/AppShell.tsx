'use client';
import { useEffect } from 'react';
import { useActiveUser } from '@/lib/useActiveUser';
import { useLoggedInUser } from '@/lib/useLoggedInUser';
import { useShapeData } from '@/lib/useShapeData';
import { TopBar } from '@/components/layout/TopBar';
import { SquadBar } from '@/components/layout/SquadBar';
import { LoginPicker } from '@/components/layout/LoginPicker';

/**
 * App shell — login gate up front.
 *
 *   ┌─────────────────────────────────────────────────────┐
 *   │ LoginPicker (until you pick your account)            │
 *   ├─────────────────────────────────────────────────────┤
 *   │ TopBar (sticky · shows you + switch account)         │
 *   │ SquadBar — horizontal user strip (sticky under top) │
 *   │ main · single-page dashboard scrolls naturally      │
 *   └─────────────────────────────────────────────────────┘
 *
 * Two identities, decoupled:
 *   • loggedInUser = WHO YOU ARE — set once at login, drives the gate.
 *   • activeUser   = WHO YOU'RE VIEWING — switchable via SquadBar.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { activeUser, setActiveUser, mounted } = useActiveUser();
  const { loggedInUser, setLoggedInUser, mounted: loginMounted } = useLoggedInUser();
  const { people, loading } = useShapeData();

  // Once logged in, default the VIEWED user to yourself (until you switch).
  useEffect(() => {
    if (!mounted || !loginMounted || loading) return;
    if (!loggedInUser) return;
    if (activeUser && people.some((p) => p.name === activeUser)) return;
    if (people.some((p) => p.name === loggedInUser)) {
      setActiveUser(loggedInUser);
    } else if (people.length > 0) {
      const sorted = [...people].sort((a, b) => b.entries.length - a.entries.length);
      setActiveUser(sorted[0].name);
    }
  }, [mounted, loginMounted, loading, loggedInUser, activeUser, people, setActiveUser]);

  if (!mounted || !loginMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--color-fg-muted)] text-sm anim-pulse">
        se încarcă...
      </div>
    );
  }

  // Login gate — pick your account once (needs the team list loaded).
  if (!loggedInUser) {
    if (loading || people.length === 0) {
      return (
        <div className="min-h-screen flex items-center justify-center text-[var(--color-fg-muted)] text-sm anim-pulse">
          se încarcă...
        </div>
      );
    }
    return (
      <LoginPicker
        people={people}
        onPick={(name) => { setLoggedInUser(name); setActiveUser(name); }}
      />
    );
  }

  return (
    <div className="min-h-dvh flex flex-col" data-page-content>
      <TopBar />
      <SquadBar />
      <main className="flex-1 min-w-0 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 pb-24 sm:pb-28">
        {children}
      </main>
    </div>
  );
}
