'use client';
import { useState, useEffect, useCallback } from 'react';
import { Users, X } from 'lucide-react';
import { PERSON_COLORS } from '@/lib/shape';
import { useLoggedInUser } from '@/lib/useLoggedInUser';
import { useShapeData } from '@/lib/useShapeData';
import { TopBar } from '@/components/layout/TopBar';
import { SquadRail } from '@/components/layout/SquadRail';
import { LoginPicker } from '@/components/layout/LoginPicker';
import { PeekModal } from '@/components/dashboard/PeekModal';

/**
 * App shell — login gate up front, then the new layout.
 *
 *   ┌─────────────────────────────────────────────────────┐
 *   │ LoginPicker (until you pick your account)            │
 *   ├─────────────────────────────────────────────────────┤
 *   │ TopBar (sticky, z-30)                                │
 *   ├───────────────┬─────────────────────────────────────┤
 *   │ SquadRail     │ main — YOUR dashboard (loggedInUser) │
 *   │ (desktop      │                                      │
 *   │  sticky left) │                                      │
 *   └───────────────┴─────────────────────────────────────┘
 *
 * Two identities:
 *   • loggedInUser = WHO YOU ARE — set once at login.
 *   • peekTarget   = COLLEAGUE YOU'RE PEEKING AT (local state, ephemeral).
 *
 * Mobile: SquadRail is hidden by default, toggled as a drawer via the
 * floating "Squad" button (bottom-right, 44px tap target).
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { loggedInUser, setLoggedInUser, mounted: loginMounted } = useLoggedInUser();
  const { people, loading } = useShapeData();

  // Who are we peeking at — null = no modal open.
  const [peekTarget, setPeekTarget] = useState<string | null>(null);
  // Mobile drawer open state
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on Esc
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setDrawerOpen(false);
  }, []);
  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  // Derive peek person + their index
  const peekPerson = peekTarget ? people.find((p) => p.name === peekTarget) ?? null : null;
  const peekIndex = peekTarget ? people.findIndex((p) => p.name === peekTarget) : -1;

  const handlePeek = (name: string | null) => {
    setPeekTarget(name);
    // Close mobile drawer when a peek is triggered from it
    if (name) setDrawerOpen(false);
  };

  if (!loginMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--color-fg-muted)] text-sm anim-pulse">
        se încarcă...
      </div>
    );
  }

  // Login gate
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
        onPick={(name) => setLoggedInUser(name)}
      />
    );
  }

  return (
    <div className="min-h-dvh flex flex-col" data-page-content>
      <TopBar />

      {/* Content row: [rail | main] */}
      <div className="flex flex-1 min-h-0">
        {/* Desktop left rail — sticky, scrolls independently */}
        <div className="hidden lg:flex flex-col w-56 shrink-0">
          <div className="sticky top-14 max-h-[calc(100dvh-3.5rem)] overflow-y-auto no-scrollbar py-4 px-2">
            <SquadRail peekTarget={peekTarget} onPeek={handlePeek} />
          </div>
        </div>

        {/* Main dashboard — always the logged-in user's data */}
        <main className="flex-1 min-w-0 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 pb-24 sm:pb-28">
          <div className="max-w-screen-xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile: floating Squad button (bottom-right, 44px) */}
      <button
        onClick={() => setDrawerOpen(true)}
        className="lg:hidden fixed bottom-6 right-4 z-40 flex items-center gap-2 px-4 h-11 rounded-full
          border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg shadow-black/40
          text-xs font-bold text-[var(--color-fg)] hover:border-[var(--color-accent)]/60
          hover:bg-[var(--color-surface)] transition-all active:scale-95"
        aria-label="Deschide lista echipei"
      >
        <Users size={16} className="text-[var(--color-accent)]" />
        <span>Squad</span>
        {/* Bubble showing team count */}
        <span
          className="num text-[9px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          {people.length}
        </span>
      </button>

      {/* Mobile drawer — slides up from bottom */}
      {drawerOpen && (
        <>
          {/* Drawer backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer panel */}
          <div
            className="lg:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl
              border-t border-[var(--color-border)] bg-[var(--color-card)]
              shadow-2xl shadow-black/60 max-h-[80dvh] overflow-y-auto
              anim-scale"
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="label">echipa ta</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="tap p-2 rounded-xl hover:bg-[var(--color-surface)] transition-colors text-[var(--color-fg-muted)]"
                aria-label="Închide"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-3 pb-6">
              <SquadRail peekTarget={peekTarget} onPeek={handlePeek} />
            </div>
          </div>
        </>
      )}

      {/* Peek modal — blurred overlay for colleague's data */}
      {peekPerson && (
        <PeekModal
          person={peekPerson}
          personIndex={peekIndex >= 0 ? peekIndex : 0}
          allPeople={people}
          loggedInUser={loggedInUser}
          onClose={() => setPeekTarget(null)}
        />
      )}
    </div>
  );
}
