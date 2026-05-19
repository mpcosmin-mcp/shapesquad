'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useActiveUser } from '@/lib/useActiveUser';
import { useShapeData } from '@/lib/useShapeData';
import { calcXP, calcStreak, PERSON_COLORS } from '@/lib/shape';
import { Avi } from '@/components/ui/Avi';
import { LogOut, User } from 'lucide-react';

/**
 * Profile chip + popover (top-right of TopBar).
 *
 * Chip: avatar + first name in person's color.
 * Popover: avatar / name / tier / XP bar / streak (luni) / total măsurători
 *          / "Profilul meu" link / "Schimbă utilizator" action.
 */
export function ProfilePopover() {
  const { activeUser, setActiveUser, isAdmin } = useActiveUser();
  const { people } = useShapeData();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!activeUser) return null;

  const me = people.find((p) => p.name === activeUser);
  const myIdx = me ? people.indexOf(me) : -1;
  const c = myIdx >= 0 ? PERSON_COLORS[myIdx % PERSON_COLORS.length] : '#818cf8';
  const fn = activeUser.split(/\s+/)[0];

  const maxEntries = Math.max(1, ...people.map((p) => p.entries.length));
  const xp = me ? calcXP(me, maxEntries) : null;
  const streak = me ? calcStreak(me) : null;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 h-9 pl-1 pr-2.5 rounded-full border transition-colors"
        style={{
          background: open
            ? `linear-gradient(135deg, ${c}24, transparent 70%)`
            : `linear-gradient(135deg, ${c}10, transparent 70%)`,
          borderColor: open ? `${c}60` : 'var(--color-border)',
        }}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Avi name={activeUser} color={c} size="sm" />
        <span className="text-xs font-bold hidden sm:inline" style={{ color: c }}>{fn}</span>
        <span className="text-[var(--color-fg-muted)] text-[10px]" aria-hidden>▾</span>
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-2 w-72 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl shadow-black/40 overflow-hidden z-40 fade-in-up"
          role="dialog"
          aria-label="Profilul tău"
        >
          {/* Header strip */}
          <div
            className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-[var(--color-border)]"
            style={{ background: `linear-gradient(135deg, ${c}1f, transparent 70%)` }}
          >
            <Avi name={activeUser} color={c} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-base truncate" style={{ color: c }}>{activeUser}</div>
              {xp && (
                <div className="text-[10px] text-[var(--color-fg-muted)] flex items-center gap-1 mt-0.5">
                  <span style={{ color: xp.tier.color }}>{xp.tier.icon}</span>
                  <span className="num font-semibold">Lv {xp.level}</span>
                  <span className="text-[var(--color-fg-faint)]">·</span>
                  <span>{xp.tier.name}</span>
                  {isAdmin && <span className="text-[var(--color-warn)] font-mono ml-1">⚡ admin</span>}
                </div>
              )}
            </div>
          </div>

          {xp && (
            <div className="px-4 pt-3 pb-3">
              <div className="flex items-center justify-between text-[10px] mb-1.5">
                <span className="num font-bold text-[var(--color-accent)]">{xp.total} XP total</span>
                {streak && streak.current > 0 && (
                  <span className="num font-bold text-[var(--color-accent)]">{streak.current}{streak.current === 1 ? ' lună' : ' luni'} 🔥</span>
                )}
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${xp.xpInLevel}%`,
                    background: 'linear-gradient(90deg, var(--color-accent-soft), var(--color-accent))',
                  }}
                />
              </div>
              <div className="flex justify-between text-[9px] num text-[var(--color-fg-faint)] mt-1">
                <span>spre Lv {xp.level + 1}</span>
                <span>{xp.xpInLevel}/100 · +{xp.perLog}/log</span>
              </div>
            </div>
          )}

          {me && (
            <div className="px-4 pb-3 text-[10px] text-[var(--color-fg-muted)] num">
              <span className="font-bold text-[var(--color-fg)]">{me.entries.length}</span> măsurători ·{' '}
              <span className="font-bold text-[var(--color-fg)]">{streak?.longest ?? 0}</span> max streak
            </div>
          )}

          <div className="px-3 pb-3 space-y-1.5">
            <button
              onClick={() => { setOpen(false); router.push(`/log`); }}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-[var(--color-border)] text-xs font-semibold text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-fg-faint)] hover:bg-[var(--color-surface)] transition-colors ${isAdmin ? '' : 'hidden'}`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Loghează măsurătoare</span>
            </button>
            <button
              onClick={() => { setActiveUser(''); setOpen(false); }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-[var(--color-border)] text-xs font-semibold text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-fg-faint)] hover:bg-[var(--color-surface)] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Schimbă utilizator</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
