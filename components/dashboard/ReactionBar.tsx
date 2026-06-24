'use client';
import { useEffect, useRef, useState } from 'react';
import { SmilePlus } from 'lucide-react';
import { REACTIONS, type ReactionMap } from '@/lib/reactions';
import { firstNameOf } from '@/lib/shape';

/**
 * Emoji reaction bar (Slack/Instagram-style) — 3 emojis only.
 *
 * Shows active reactions as pills (emoji + count, highlighted when the
 * current user is in that bucket) plus an "add reaction" button.
 * Tapping a pill toggles; tapping a palette emoji toggles + closes.
 *
 * Stateless about persistence — parent owns ReactionMap + onToggle.
 */
export function ReactionBar({
  reactions,
  currentUser,
  onToggle,
  size = 'md',
}: {
  reactions: ReactionMap;
  currentUser: string;
  onToggle: (emoji: string) => void;
  size?: 'sm' | 'md';
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPickerOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [pickerOpen]);

  const active = Object.entries(reactions).filter(([, users]) => users.length > 0);
  const pill = size === 'sm' ? 'text-[10px] px-1.5 py-0.5 gap-0.5' : 'text-[11px] px-2 py-0.5 gap-1';
  const iconSize = size === 'sm' ? 13 : 15;

  const fire = (emoji: string) => { onToggle(emoji); setPickerOpen(false); };

  return (
    <div ref={wrapRef} className="relative flex items-center gap-1.5 flex-wrap">
      {/* Active reaction pills */}
      {active.map(([emoji, users]) => {
        const mine = users.includes(currentUser);
        const names = users.map(u => firstNameOf(u)).join(', ');
        return (
          <button
            key={emoji}
            onClick={() => onToggle(emoji)}
            title={names}
            aria-pressed={mine}
            aria-label={`${emoji} ${users.length} — ${names}`}
            className={`tap inline-flex items-center rounded-full font-bold transition-all active:scale-90 ${pill} ${
              mine
                ? 'bg-[var(--color-accent)]/15 ring-1 ring-[var(--color-accent)]/50 text-[var(--color-fg)]'
                : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
            }`}
          >
            <span className="leading-none">{emoji}</span>
            <span className="num leading-none">{users.length}</span>
          </button>
        );
      })}

      {/* Add-reaction trigger */}
      <button
        onClick={() => setPickerOpen(o => !o)}
        aria-label="Adaugă reacție"
        aria-expanded={pickerOpen}
        className={`tap inline-flex items-center justify-center rounded-full transition-all active:scale-90 ${
          size === 'sm' ? 'p-0.5' : 'p-1'
        } ${
          pickerOpen
            ? 'text-[var(--color-accent)] bg-[var(--color-accent)]/10'
            : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
        }`}
      >
        <SmilePlus size={iconSize} strokeWidth={2} />
      </button>

      {/* Emoji palette popover */}
      {pickerOpen && (
        <div
          className="absolute bottom-full left-0 mb-1.5 z-20 flex items-center gap-0.5 p-1 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-md shadow-2xl shadow-black/40 fade-in-up"
          role="menu"
        >
          {REACTIONS.map(emoji => {
            const mine = (reactions[emoji] ?? []).includes(currentUser);
            return (
              <button
                key={emoji}
                onClick={() => fire(emoji)}
                aria-label={`Reacționează cu ${emoji}`}
                className={`w-8 h-8 flex items-center justify-center rounded-full text-base transition-transform hover:scale-125 active:scale-95 ${
                  mine ? 'bg-[var(--color-accent)]/20' : 'hover:bg-[var(--color-surface)]'
                }`}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
