'use client';
import { useActiveUser } from '@/lib/useActiveUser';
import { TopBar } from '@/components/layout/TopBar';
import { SquadAiBubble } from '@/components/dashboard/SquadAiBubble';
import { UserPicker } from '@/components/dashboard/UserPicker';

/**
 * App shell — single-page layout matching Sleep Tracker v2.
 *
 *   ┌─────────────────────────────────────────────────────┐
 *   │ TopBar (brand · theme · profile chip → popover)     │  sticky
 *   ├─────────────────────────────────────────────────────┤
 *   │  Main content (scrolls naturally)                   │
 *   └─────────────────────────────────────────────────────┘
 *
 *   Floating bottom-right: Squad AI Coach bubble (only AI surface).
 *
 * Login (no activeUser) → UserPicker full viewport, no TopBar / bubble.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { activeUser, mounted } = useActiveUser();

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--color-fg-muted)] text-sm anim-pulse">
        se încarcă...
      </div>
    );
  }

  if (!activeUser) {
    return <UserPicker />;
  }

  return (
    <div className="min-h-dvh flex flex-col" data-page-content>
      <TopBar />
      <main className="flex-1 min-w-0 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 pb-24 sm:pb-28">
        {children}
      </main>
      <SquadAiBubble />
    </div>
  );
}
