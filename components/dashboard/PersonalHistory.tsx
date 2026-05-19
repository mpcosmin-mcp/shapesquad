'use client';
import { type Person, bfColor, muscleColor, bfTier, personalTrendNote } from '@/lib/shape';
import { fmtDate } from '@/lib/utils';

/**
 * Personal History — compact tabular view of the last few logs.
 * Columns: DATA · KG · BF% · Muscle · STATUS pill (Optim/Average/Poor).
 * Footer: trend note from `personalTrendNote()` — deterministic, no AI call.
 */
export function PersonalHistory({ person, limit = 6 }: { person: Person; limit?: number }) {
  const mine = [...person.entries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);

  const trend = personalTrendNote(person);

  if (!mine.length) {
    return (
      <section className="card px-5 py-4 lg:py-5 flex flex-col">
        <div className="label mb-3">Istoric Personal</div>
        <div className="flex-1 flex items-center justify-center text-xs text-[var(--color-fg-muted)] italic py-6">
          nicio măsurătoare încă
        </div>
      </section>
    );
  }

  return (
    <section className="card px-5 py-4 lg:py-5 flex flex-col min-h-0">
      <div className="flex items-baseline justify-between mb-3">
        <span className="label">Istoric Personal</span>
        <span className="text-[10px] num text-[var(--color-fg-faint)]">ultimele {mine.length} măsurători</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 lg:gap-4 items-center pb-2 border-b border-[var(--color-border)]">
        <span className="label">Data</span>
        <span className="label text-right">Kg</span>
        <span className="label text-right hidden sm:inline">BF%</span>
        <span className="label text-right hidden sm:inline">Muscle</span>
        <span className="label text-right">Status</span>
      </div>

      <div className="divide-y divide-[var(--color-border)]/60">
        {mine.map((e) => {
          const bfPill: 'optim' | 'average' | 'poor' = bfStatus(e.bodyFat, e.gender);
          const pillLabel = bfPill === 'optim' ? 'Optim' : bfPill === 'average' ? 'Average' : 'Poor';
          const t = bfTier(e.bodyFat, e.gender);
          return (
            <div key={e.date} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 lg:gap-4 items-center py-2.5">
              <span className="text-xs text-[var(--color-fg)]">{fmtDate(e.date)}</span>
              <span className="num font-bold text-base text-right">
                {e.kg?.toFixed(1) ?? '—'}
              </span>
              <span
                className="num text-xs text-right hidden sm:inline"
                style={{ color: e.bodyFat != null ? bfColor(e.bodyFat, e.gender) : 'var(--color-fg-faint)' }}
              >
                {e.bodyFat != null ? e.bodyFat.toFixed(1) : '—'}
              </span>
              <span
                className="num text-xs text-right hidden sm:inline"
                style={{ color: e.muscle != null ? muscleColor(e.muscle, e.gender) : 'var(--color-fg-faint)' }}
              >
                {e.muscle != null ? e.muscle.toFixed(1) : '—'}
              </span>
              <span className={`pill ${bfPill}`} title={t.label}>{pillLabel}</span>
            </div>
          );
        })}
      </div>

      {trend && (
        <div className="mt-3 pt-3 border-t border-[var(--color-border)]/70">
          <div className="label mb-1">pattern</div>
          <p
            className="text-xs leading-relaxed"
            style={{
              color:
                trend.tone === 'good' ? 'var(--color-good)'
                : trend.tone === 'warn' ? 'var(--color-warn)'
                : 'var(--color-fg-muted)',
            }}
          >
            {trend.text}
          </p>
        </div>
      )}
    </section>
  );
}

function bfStatus(bf: number | null, gender: 'M' | 'F'): 'optim' | 'average' | 'poor' {
  if (bf == null) return 'average';
  const zone = gender === 'M' ? { lo: 12, hi: 22 } : { lo: 20, hi: 30 };
  if (bf >= zone.lo && bf <= zone.hi) return 'optim';
  const dist = bf < zone.lo ? zone.lo - bf : bf - zone.hi;
  return dist <= 4 ? 'average' : 'poor';
}
