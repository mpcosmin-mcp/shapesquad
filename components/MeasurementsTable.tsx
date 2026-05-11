'use client';

import { Entry, MetricKey } from '@/lib/shape';

interface MeasurementDef {
  key: MetricKey;
  label: string;
  icon: string;
  unit: string;
  lowerIsBetter: boolean;
}

interface Props {
  entries: Entry[];
  defs: MeasurementDef[];
}

interface Row {
  def: MeasurementDef;
  first: number | null;
  latest: number | null;
  previous: number | null;
  count: number;
}

export default function MeasurementsTable({ entries, defs }: Props) {
  const rows: Row[] = defs
    .map((def) => {
      const series = entries.filter((e) => e[def.key] != null);
      const values = series.map((e) => e[def.key] as number);
      return {
        def,
        first: values[0] ?? null,
        latest: values[values.length - 1] ?? null,
        previous: values.length > 1 ? values[values.length - 2] : null,
        count: values.length,
      };
    })
    .filter((r) => r.count > 0);

  if (rows.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <div className="divide-y divide-[var(--border)]">
        {rows.map((r) => {
          const recentDelta =
            r.previous != null && r.latest != null ? r.latest - r.previous : null;
          const startDelta =
            r.first != null && r.latest != null ? r.latest - r.first : null;

          const recentDir =
            recentDelta == null || Math.abs(recentDelta) < 0.1
              ? 'neutral'
              : (r.def.lowerIsBetter ? recentDelta < 0 : recentDelta > 0)
              ? 'good'
              : 'bad';
          const recentColor =
            recentDir === 'good'
              ? 'var(--good)'
              : recentDir === 'bad'
              ? 'var(--bad)'
              : 'var(--fg-muted)';

          const startDir =
            startDelta == null || Math.abs(startDelta) < 0.1
              ? 'neutral'
              : (r.def.lowerIsBetter ? startDelta < 0 : startDelta > 0)
              ? 'good'
              : 'bad';
          const startColor =
            startDir === 'good'
              ? 'var(--good)'
              : startDir === 'bad'
              ? 'var(--bad)'
              : 'var(--fg-muted)';

          return (
            <div
              key={r.def.key}
              className="px-4 py-3 flex items-center gap-3 hover:bg-[var(--card-hover)] transition-colors"
            >
              <span className="text-base shrink-0 w-6 text-center">{r.def.icon}</span>
              <span className="text-sm font-medium text-fg-dim w-20 shrink-0">{r.def.label}</span>
              <div className="flex-1 flex items-baseline gap-1.5 min-w-0">
                <span className="num font-semibold text-base text-fg tabular-nums">
                  {r.latest?.toFixed(1)}
                </span>
                <span className="text-[10px] text-fg-muted">{r.def.unit}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {r.first != null && r.first !== r.latest && (
                  <span className="text-[10px] text-fg-faint font-mono tabular-nums hidden sm:inline">
                    de la {r.first.toFixed(1)}
                  </span>
                )}
                {recentDelta != null && Math.abs(recentDelta) >= 0.1 && (
                  <span
                    className="text-[10px] font-semibold font-mono tabular-nums px-1.5 py-0.5 rounded"
                    style={{
                      color: recentColor,
                      background: `color-mix(in srgb, ${recentColor} 10%, transparent)`,
                    }}
                  >
                    {recentDelta > 0 ? '+' : ''}
                    {recentDelta.toFixed(1)}
                  </span>
                )}
                {startDelta != null && Math.abs(startDelta) >= 0.5 && (
                  <span
                    className="text-[10px] font-mono tabular-nums hidden md:inline"
                    style={{ color: startColor }}
                  >
                    {startDelta > 0 ? '+' : ''}
                    {startDelta.toFixed(1)} total
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
