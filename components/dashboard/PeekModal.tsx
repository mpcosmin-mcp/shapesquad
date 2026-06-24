'use client';
import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { type Person, PERSON_COLORS, firstNameOf, calcXP, calcStreak, getLevelTier } from '@/lib/shape';
import { Avi } from '@/components/ui/Avi';
import { PersonalMetrics } from '@/components/dashboard/PersonalMetrics';
import { EntryReactions } from '@/components/dashboard/EntryReactions';

/**
 * Peek Modal — blurred overlay for viewing a COLLEAGUE's data.
 *
 * The background blur + dark scrim makes it unmistakably clear you're
 * peeking, not on your own page. Closes on: backdrop click, Esc, X button.
 *
 * Social block (reactions + comments) for their latest entry is rendered
 * at the bottom — identity is loggedInUser (the reactor/commenter).
 */
export function PeekModal({
  person,
  personIndex,
  allPeople,
  loggedInUser,
  onClose,
}: {
  person: Person;
  personIndex: number;
  allPeople: Person[];
  loggedInUser: string;
  onClose: () => void;
}) {
  const accent = PERSON_COLORS[personIndex % PERSON_COLORS.length];
  const firstName = firstNameOf(person.name);
  const allNames = allPeople.map((p) => p.name);

  const maxEntries = Math.max(1, ...allPeople.map((p) => p.entries.length));
  const xp = calcXP(person, maxEntries);
  const streak = calcStreak(person);
  const tier = getLevelTier(xp.level);

  // Close on Esc
  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); },
    [onClose],
  );
  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    // Prevent body scroll while modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [handleKey]);

  return (
    /*
     * Backdrop — covers everything incl. the sticky TopBar.
     * backdrop-blur-md blurs the dashboard behind; dark scrim dims it.
     */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(2,6,23,0.70)' }}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label={`Date ${firstName}`}
    >
      {/* Blur layer — separate element so we can blur without affecting the panel */}
      <div className="absolute inset-0 backdrop-blur-md pointer-events-none" />

      {/*
       * Panel — stops click propagation so clicking inside doesn't close.
       * Mobile: near-fullscreen bottom sheet (rounded-t-3xl).
       * Desktop: centered card (max-w-2xl, rounded-2xl).
       */}
      <div
        className="relative z-10 w-full sm:w-[88vw] lg:w-[75vw] sm:max-w-6xl max-h-[92dvh] sm:max-h-[90dvh] overflow-y-auto
          rounded-t-3xl sm:rounded-2xl
          border border-[var(--color-border)]
          bg-[var(--color-card)]
          shadow-2xl shadow-black/60
          anim-scale"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Peek indicator strip at the top */}
        <div
          className="absolute inset-x-0 top-0 h-0.5 rounded-t-3xl sm:rounded-t-2xl"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}80, transparent)` }}
        />

        {/* Mobile drag handle */}
        <div className="flex justify-center pt-2.5 pb-0 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[var(--color-border-strong)] opacity-60" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 sm:px-5 pt-4 pb-3 border-b border-[var(--color-border)]">
          <Avi name={person.name} color={accent} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold tracking-tight truncate" style={{ color: accent }}>
                {firstName}
              </h2>
              {/* "vizualizezi" badge — unmistakable peek signal */}
              <span
                className="text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}40` }}
              >
                vizualizezi
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] num text-[var(--color-fg-muted)]">
              <span style={{ color: tier.color }}>{tier.icon}</span>
              <span className="font-semibold">Lv {xp.level}</span>
              <span className="text-[var(--color-fg-faint)]">·</span>
              <span>{tier.name}</span>
              {streak.current >= 2 && (
                <>
                  <span className="text-[var(--color-fg-faint)]">·</span>
                  <span>🔥 {streak.current} streak</span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="tap p-2 rounded-xl hover:bg-[var(--color-surface)] transition-colors duration-150 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            aria-label="Închide"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-5 py-4 space-y-4">
          {/* Metrics grid — showHeader=false, the modal header above is the header */}
          {person.entries.length > 0 ? (
            <PersonalMetrics person={person} accent={accent} showHeader={false} large />
          ) : (
            <div className="text-sm text-[var(--color-fg-muted)] italic text-center py-6">
              {firstName} nu are nicio măsurătoare înregistrată încă.
            </div>
          )}

          {/* Social block — reactions + comments for their latest entry */}
          {person.latest && (
            <div
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
            >
              <div className="label mb-2">reacții & comentarii</div>
              <EntryReactions
                entryDate={person.latest.date}
                entryName={person.name}
                currentUser={loggedInUser}
                allNames={allNames}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
