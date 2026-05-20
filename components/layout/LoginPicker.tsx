'use client';
import { type Person, PERSON_COLORS, calcXP, getLevelTier } from '@/lib/shape';
import { Avi } from '@/components/ui/Avi';

/**
 * Login gate — pick your account once. The chosen identity is the liker /
 * commenter for the rest of the session (persisted). Browsing other people's
 * progress via the SquadBar never changes who you are.
 */
export function LoginPicker({ people, onPick }: { people: Person[]; onPick: (name: string) => void }) {
  const maxEntries = Math.max(1, ...people.map((p) => p.entries.length));
  const sorted = [...people].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-dvh aurora flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="num text-2xl font-bold tracking-tight">
            shape<span className="text-[var(--color-accent)]">squad</span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-fg-muted)] mt-1">
            alege-ți contul
          </div>
        </div>

        <div className="space-y-2">
          {sorted.map((p) => {
            const color = PERSON_COLORS[people.indexOf(p) % PERSON_COLORS.length];
            const xp = calcXP(p, maxEntries);
            const tier = getLevelTier(xp.level);
            const fn = p.name.split(/\s+/)[0];
            return (
              <button
                key={p.name}
                onClick={() => onPick(p.name)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-fg-dim)] hover:-translate-y-0.5 transition-all text-left tap"
                style={{ background: `linear-gradient(135deg, ${color}14, var(--color-card) 75%)` }}
                aria-label={`Intră ca ${fn}`}
              >
                <Avi name={p.name} color={color} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold" style={{ color }}>{fn}</div>
                  <div className="text-[10px] num text-[var(--color-fg-muted)]">
                    <span style={{ color: tier.color }}>{tier.icon}</span> Lv {xp.level} · {tier.name}
                  </div>
                </div>
                <span className="text-[var(--color-fg-dim)]" aria-hidden>→</span>
              </button>
            );
          })}
        </div>

        <div className="text-center text-[10px] text-[var(--color-fg-faint)] mt-6">
          click pe contul tău ca să intri
        </div>
      </div>
    </div>
  );
}
