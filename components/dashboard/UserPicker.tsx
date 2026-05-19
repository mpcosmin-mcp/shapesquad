'use client';
import { useMemo } from 'react';
import { Flame } from 'lucide-react';
import { useShapeData } from '@/lib/useShapeData';
import { useActiveUser } from '@/lib/useActiveUser';
import { calcXP, calcStreak, PERSON_COLORS, getLevelTier } from '@/lib/shape';
import { Avi } from '@/components/ui/Avi';

/**
 * Login page — aurora + glassmorphism card.
 *
 *   STEP 1 (only step now): pick your card. People sorted by XP descending.
 *   Click → set activeUser → AppShell renders dashboard.
 *
 * Quick-log inline (sleep tracker pattern) is intentionally omitted here:
 * ShapeSquad measurements span 10+ fields and need the full /log form.
 * Admins are nudged toward /log via the profile popover instead.
 */
export function UserPicker() {
  const { loading, people } = useShapeData();
  const { setActiveUser } = useActiveUser();

  const maxEntries = useMemo(
    () => Math.max(1, ...people.map((p) => p.entries.length)),
    [people],
  );

  const sorted = useMemo(() => {
    return [...people]
      .map((p, originalIdx) => ({ p, originalIdx, xp: calcXP(p, maxEntries) }))
      .sort((a, b) => b.xp.total - a.xp.total);
  }, [people, maxEntries]);

  return (
    <main className="aurora min-h-dvh flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-0.5">
            <span className="num text-4xl font-bold tracking-tight">shape</span>
            <span className="num text-4xl font-bold tracking-tight text-[var(--color-fg-muted)]">squad</span>
          </div>
          <div className="text-xs uppercase tracking-[0.22em] text-[var(--color-fg-muted)] mt-2 font-semibold">
            body · squad · ai
          </div>
        </div>

        <div className="glass rounded-3xl p-5 sm:p-6 space-y-3">
          <div className="text-center mb-2">
            <div className="text-lg font-bold">Welcome back</div>
            <div className="text-xs text-[var(--color-fg-muted)] mt-0.5">Alege-ți cardul ca să continui</div>
          </div>

          {loading ? (
            <div className="text-center text-[var(--color-fg-muted)] anim-pulse py-8 text-sm">
              se încarcă echipa...
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1 -mr-1">
              {sorted.map(({ p, originalIdx, xp }, idx) => {
                const c = PERSON_COLORS[originalIdx % PERSON_COLORS.length];
                const streak = calcStreak(p);
                const tier = getLevelTier(xp.level);
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '·';

                return (
                  <button
                    key={p.name}
                    onClick={() => setActiveUser(p.name)}
                    className="group text-left transition-all hover:translate-x-1 active:scale-[0.99]"
                  >
                    <div
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl relative overflow-hidden border transition-all"
                      style={{
                        background: `linear-gradient(135deg, ${c}10, transparent 70%)`,
                        borderColor: 'rgba(148,163,184,0.14)',
                      }}
                    >
                      <div className="absolute inset-y-0 left-0 w-1" style={{ background: c }} />
                      <span className="text-base shrink-0 ml-1 w-5 text-center" aria-hidden>{medal}</span>
                      <Avi name={p.name} color={c} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-[var(--color-fg)] truncate">{p.name}</span>
                          <span
                            className="text-[9px] num font-bold px-1.5 py-0.5 rounded shrink-0"
                            style={{ color: tier.color, background: tier.color + '15' }}
                          >
                            {tier.icon} Lv {xp.level}
                          </span>
                          {streak.current > 0 && (
                            <span className="text-[9px] num font-bold text-[var(--color-accent)] inline-flex items-center gap-0.5">
                              <Flame className="w-2.5 h-2.5" />
                              {streak.current}{streak.current === 1 ? 'lună' : 'luni'}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[var(--color-fg-muted)] mt-0.5">
                          {tier.name} · {p.entries.length} măsurători
                        </div>
                      </div>
                      <span
                        className="text-lg opacity-50 group-hover:opacity-100 transition-opacity shrink-0"
                        style={{ color: c }}
                      >
                        →
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <div className="text-[10px] text-[var(--color-fg-faint)] num">
            built with next.js · powered by claude haiku
          </div>
        </div>
      </div>
    </main>
  );
}
