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
        <span className="text-[10px] num text-[var(--color-fg-faint)]">
          {recent.length === 1 ? 'prima măsurătoare' : `ultimele ${recent.length} măsurători · vs anterioară`}
        </span>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="label text-left pb-2 w-full">Data</th>
            <th className="label text-right pb-2 pl-4">Kg</th>
            <th className="label text-right pb-2 pl-4 hidden sm:table-cell">BF%</th>
            <th className="label text-right pb-2 pl-4 hidden sm:table-cell">Muscle</th>
            <th className="label text-right pb-2 pl-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((e) => {
            const idxInAsc = sortedAsc.findIndex((x) => x.date === e.date);
            const status = rowProgressStatus(person, idxInAsc);
            return (
              <tr key={e.date} className="border-b border-[var(--color-border)]/60 last:border-b-0">
                <td className="align-middle text-xs text-[var(--color-fg)] py-2.5">{fmtDate(e.date)}</td>
                <td className="align-middle num font-bold text-base text-right py-2.5 pl-4">
                  {e.kg?.toFixed(1) ?? '—'}
                </td>
                <td
                  className="align-middle num text-xs text-right py-2.5 pl-4 hidden sm:table-cell"
                  style={{ color: e.bodyFat != null ? bfColor(e.bodyFat, e.gender) : 'var(--color-fg-faint)' }}
                >
                  {e.bodyFat != null ? e.bodyFat.toFixed(1) : '—'}
                </td>
                <td
                  className="align-middle num text-xs text-right py-2.5 pl-4 hidden sm:table-cell"
                  style={{ color: e.muscle != null ? muscleColor(e.muscle, e.gender) : 'var(--color-fg-faint)' }}
                >
                  {e.muscle != null ? e.muscle.toFixed(1) : '—'}
                </td>
                <td className="align-middle text-right py-2.5 pl-4 whitespace-nowrap">
                  <StatusPill status={status} firstRow={idxInAsc === 0} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

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
