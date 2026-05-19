'use client';
import { useEffect } from 'react';
import { useActiveUser } from '@/lib/useActiveUser';
import { useShapeData } from '@/lib/useShapeData';
import { TopBar } from '@/components/layout/TopBar';
import { SquadBar } from '@/components/layout/SquadBar';
import { SquadAiBubble } from '@/components/dashboard/SquadAiBubble';

/**
 * App shell — no login gate.
 *
 *   ┌─────────────────────────────────────────────────────┐
 *   │ TopBar (sticky)                                     │
 *   ├─────────────────────────────────────────────────────┤
 *   │ SquadBar — horizontal user strip (sticky under top) │
 *   ├─────────────────────────────────────────────────────┤
 *   │ main · single-page dashboard scrolls naturally      │
 *   └─────────────────────────────────────────────────────┘
 *
 *   Floating bottom-right: Squad AI Coach bubble.
 *
 * The dashboard always renders. activeUser defaults to the first person
 * with the most measurements; users can switch via SquadBar.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { activeUser, setActiveUser, mounted } = useActiveUser();
  const { people, loading } = useShapeData();

  // First-time visit: pick a sensible default user once data is loaded.
  useEffect(() => {
    if (!mounted || loading) return;
    if (activeUser && people.some((p) => p.name === activeUser)) return;
    if (people.length === 0) return;
    const sorted = [...people].sort((a, b) => b.entries.length - a.entries.length);
    setActiveUser(sorted[0].name);
  }, [mounted, loading, activeUser, people, setActiveUser]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--color-fg-muted)] text-sm anim-pulse">
        se încarcă...
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col" data-page-content>
      <TopBar />
      <SquadBar />
      <main className="flex-1 min-w-0 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 pb-24 sm:pb-28">
        {children}
      </main>
      <SquadAiBubble />
    </div>
  );
}
