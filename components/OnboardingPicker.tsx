'use client';

import { useShapeData } from '@/lib/useShapeData';
import { useActiveUser } from '@/lib/useActiveUser';
import { calcXP, calcStreak, PERSON_COLORS } from '@/lib/shape';
import { Flame } from 'lucide-react';
import { useMemo } from 'react';

export default function OnboardingPicker() {
  const { loading, people } = useShapeData();
  const { setActiveUser } = useActiveUser();

  const maxEntries = useMemo(
    () => Math.max(1, ...people.map((p) => p.entries.length)),
    [people]
  );

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center px-6">
      {/* Brand mark */}
      <div className="text-center mb-10 anim-fade">
        <div className="flex items-baseline justify-center gap-0.5 mb-2">
          <span className="text-3xl md:text-4xl font-semibold tracking-tight text-fg leading-none">
            shape
          </span>
          <span className="text-3xl md:text-4xl font-semibold tracking-tight text-fg-muted leading-none">
            squad
          </span>
        </div>
        <p className="text-xs text-fg-muted">Nu ne comparăm. Ne construim. Ne susținem.</p>
      </div>

      <div className="text-center mb-6 anim-fade d1">
        <h2 className="text-base font-medium text-fg">Cine ești?</h2>
        <p className="text-[11px] text-fg-muted mt-0.5">Alege profilul tău din echipă</p>
      </div>

      {loading ? (
        <div className="text-fg-muted text-sm anim-pulse">Loading...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 w-full max-w-3xl">
          {people.map((person, i) => {
            const color = PERSON_COLORS[i % PERSON_COLORS.length];
            const xp = calcXP(person, maxEntries);
            const streak = calcStreak(person);
            return (
              <button
                key={person.name}
                onClick={() => setActiveUser(person.name)}
                className={`card card-interactive p-3 text-center anim-fade d${Math.min(i + 1, 8)}`}
              >
                <div
                  className="w-10 h-10 mx-auto rounded-full flex items-center justify-center text-sm font-semibold text-white mb-2"
                  style={{ background: color }}
                >
                  {person.name[0]}
                </div>
                <div className="text-sm font-medium text-fg">{person.name}</div>
                <div className="flex items-center justify-center gap-1.5 mt-1.5 flex-wrap">
                  <span
                    className="chip text-[9px]"
                    style={{
                      background: `color-mix(in srgb, ${xp.tier.color} 14%, transparent)`,
                      color: xp.tier.color,
                    }}
                  >
                    L{xp.level}
                  </span>
                  {streak.current > 0 && (
                    <span className="streak-badge text-[9px]">
                      <Flame className="w-2.5 h-2.5" /> {streak.current}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-fg-faint mt-8 anim-fade d6">
        💡 Poți schimba profilul oricând din header
      </p>
    </div>
  );
}
