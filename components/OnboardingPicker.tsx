'use client';

import { useShapeData } from '@/lib/useShapeData';
import { useActiveUser } from '@/lib/useActiveUser';
import { calcXP, calcStreak, PERSON_COLORS } from '@/lib/shape';
import { Flame, Zap } from 'lucide-react';
import { useMemo } from 'react';

export default function OnboardingPicker() {
  const { loading, people } = useShapeData();
  const { setActiveUser } = useActiveUser();

  const maxEntries = useMemo(
    () => Math.max(1, ...people.map((p) => p.entries.length)),
    [people]
  );

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 30%, color-mix(in srgb, var(--bronze) 12%, transparent), transparent 70%)',
        }}
      />

      {/* Brand mark */}
      <div className="text-center mb-10 anim-fade relative z-10">
        <div className="flex items-baseline justify-center gap-1 mb-3">
          <Zap className="w-7 h-7 text-bronze mr-1" strokeWidth={2.5} fill="currentColor" />
          <span className="font-display text-4xl md:text-5xl font-black tracking-tight text-fg leading-none">
            Shape
          </span>
          <span className="font-display text-4xl md:text-5xl font-black italic tracking-tight text-bronze leading-none">
            Squad
          </span>
        </div>
        <p className="font-display italic text-base md:text-lg text-fg-muted">
          Nu ne comparăm. <span className="text-bronze">Ne construim.</span> Ne susținem.
        </p>
      </div>

      <div className="text-center mb-6 anim-fade d1 relative z-10">
        <h2 className="font-display text-xl md:text-2xl font-bold text-fg">Cine ești?</h2>
        <p className="text-xs text-fg-muted mt-1">Alege profilul tău din echipă</p>
      </div>

      {loading ? (
        <div className="text-fg-muted font-display italic anim-pulse">Citesc echipa...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 w-full max-w-3xl relative z-10">
          {people.map((person, i) => {
            const color = PERSON_COLORS[i % PERSON_COLORS.length];
            const xp = calcXP(person, maxEntries);
            const streak = calcStreak(person);
            return (
              <button
                key={person.name}
                onClick={() => setActiveUser(person.name)}
                className={`panel panel-interactive p-3 text-left relative overflow-hidden anim-fade d${Math.min(i + 1, 8)}`}
              >
                <div
                  className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-[0.1]"
                  style={{ background: color }}
                />
                <div
                  className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center text-xl font-display font-black text-white mb-2 shadow-panel"
                  style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)` }}
                >
                  {person.name[0]}
                </div>
                <div className="font-display font-bold text-sm text-fg text-center leading-tight">
                  {person.name}
                </div>
                <div className="flex items-center justify-center gap-1.5 mt-1.5 flex-wrap">
                  <span
                    className="chip text-[9px]"
                    style={{ background: `${xp.tier.color}22`, color: xp.tier.color }}
                  >
                    {xp.tier.icon} L{xp.level}
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
        💡 Vei putea schimba profilul oricând din header
      </p>
    </div>
  );
}
