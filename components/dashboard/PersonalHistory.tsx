'use client';
import {
  type Person,
  bfColor, muscleColor, personalTrendNote,
  rowProgressStatus, type ProgressStatus,
} from '@/lib/shape';
import { fmtDate } from '@/lib/utils';

/**
 * Personal History — compact tabular view of the last few logs.
 * Columns: DATA · KG · BF% · Muscle · STATUS pill.
 *
 * Status pills reflect each entry's direction vs the entry BEFORE it
 * (PROGRES / STABIL / RECALIBRARE) — never compared to a "perfect" zone.
 * Footer: deterministic trend note (no AI call).
 */
export function PersonalHistory({ person, limit = 6 }: { person: Person; limit?: number }) {
  const sortedAsc = [...person.entries].sort((a, b) => a.date.localeCompare(b.date));
  const recent = [...sortedAsc].reverse().slice(0, limit); // newest first for display
  const trend = personalTrendNote(person);

  if (!recent.length) {
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
        <span className="text-[10px] num text-[var(--color-fg-faint)]">ultimele {recent.length} măsurători · vs anterioară</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 lg:gap-4 items-center pb-2 border-b border-[var(--color-border)]">
        <span className="label">Data</span>
        <span className="label text-right">Kg</span>
        <span className="label text-right hidden sm:inline">BF%</span>
        <span className="label text-right hidden sm:inline">Muscle</span>
        <span className="label text-right">Status</span>
      </div>

      <div className="divide-y divide-[var(--color-border)]/60">
        {recent.map((e) => {
          const idxInAsc = sortedAsc.findIndex((x) => x.date === e.date);
          const status = rowProgressStatus(person, idxInAsc);
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
              <StatusPill status={status} firstRow={idxInAsc === 0} />
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

function StatusPill({ status, firstRow }: { status: ProgressStatus; firstRow: boolean }) {
  if (firstRow) {
    return (
      <span className="num text-[9px] font-bold uppercase tracking-wider text-[var(--color-fg-faint)] px-1.5 py-0.5">
        Start
      </span>
    );
  }
  const meta = {
    progres: { label: 'Progres', color: 'var(--color-good)' },
    stabil: { label: 'Stabil', color: 'var(--color-fg-muted)' },
    recalibrare: { label: 'Recalibrare', color: 'var(--color-warn)' },
  }[status];
  return (
    <span
      className="num text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
      style={{
        color: meta.color,
        borderColor: meta.color,
        background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
      }}
    >
      {meta.label}
    </span>
  );
}
