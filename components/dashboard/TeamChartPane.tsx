'use client';
import { useMemo, useState } from 'react';
import {
  type Person,
  PERSON_COLORS, lastNMonths,
} from '@/lib/shape';
import { Card } from '@/components/ui/Card';
import { TeamChart } from '@/components/ui/TeamChart';

type Range = '3m' | '6m' | 'all';
type Metric = 'kg' | 'bodyFat' | 'muscle' | 'visceralFat';

const METRIC_META: Record<Metric, { label: string; unit: string; target: number; lowerBetter?: boolean }> = {
  kg:          { label: 'Greutate',  unit: 'kg', target: 0 },
  bodyFat:     { label: 'Body Fat',  unit: '%',  target: 20, lowerBetter: true },
  muscle:      { label: 'Muscle',    unit: '%',  target: 35 },
  visceralFat: { label: 'Visceral',  unit: '',   target: 9, lowerBetter: true },
};

/**
 * Team Chart Pane — multi-metric chart with tabs + per-person filter.
 *
 *   Header: title · range tabs (3 luni / 6 luni / tot)
 *   Metric tabs: kg / BF / muscle / visceral + target indicator
 *   Person filter chips: default = current user only (not comparative).
 *     Click "Toți" to opt into the multi-line overlay.
 *   Big SVG chart with Bezier curves + hover crosshair + tooltip
 */
export function TeamChartPane({ people, currentUser }: { people: Person[]; currentUser: string }) {
  const [range, setRange] = useState<Range>('6m');
  const [metric, setMetric] = useState<Metric>('bodyFat');
  // Default: focus on the active user (no implicit cross-user comparison).
  const [focusUser, setFocusUser] = useState<string | null>(currentUser);

  const allEntries = useMemo(() => people.flatMap((p) => p.entries), [people]);

  const scoped = useMemo(() => {
    if (range === 'all') return allEntries;
    return lastNMonths(allEntries, range === '3m' ? 3 : 6);
  }, [allEntries, range]);

  const allDates = useMemo(
    () => [...new Set(scoped.map((e) => e.date))].sort(),
    [scoped],
  );

  const series = useMemo(() => {
    const usersToShow = focusUser ? [focusUser] : people.map((p) => p.name);
    return usersToShow.map((n) => {
      const idx = people.findIndex((p) => p.name === n);
      const color = PERSON_COLORS[idx % PERSON_COLORS.length];
      const personMap = new Map(scoped.filter((e) => e.name === n).map((e) => [e.date, e]));
      const values = allDates.map((d) => {
        const v = personMap.get(d);
        return v ? ((v[metric] as number | null) ?? null) : null;
      });
      return {
        name: n.split(/\s+/)[0],
        color,
        values,
      };
    });
  }, [scoped, allDates, metric, focusUser, people]);

  const meta = METRIC_META[metric];

  return (
    <Card className="p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="label">
            {focusUser
              ? `${focusUser.split(/\s+/)[0]} · doar acest user`
              : 'istoric echipă · toți pe același chart'}
          </div>
          <div className="text-base font-bold">{meta.label}</div>
        </div>
        <div className="flex items-center gap-1.5">
          {(['3m', '6m', 'all'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-colors ${
                range === r
                  ? 'bg-[var(--color-accent)] text-[var(--color-bg)]'
                  : 'border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
              }`}
            >
              {r === '3m' ? '3 luni' : r === '6m' ? '6 luni' : 'tot'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 border-b border-[var(--color-border)] pb-3 flex-wrap">
        {(Object.keys(METRIC_META) as Metric[]).map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
              metric === m
                ? 'bg-[var(--color-accent)]/15 text-[var(--color-fg)] ring-1 ring-[var(--color-accent)]/40'
                : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface)]'
            }`}
          >
            {METRIC_META[m].label}
          </button>
        ))}
        {meta.target > 0 && (
          <span className="text-[10px] text-[var(--color-fg-muted)] ml-auto num">
            target {meta.lowerBetter ? '≤ ' : '≥ '}{meta.target}{meta.unit}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="label mr-1">filtru:</span>
        <PersonChip label="Toți" active={focusUser === null} onClick={() => setFocusUser(null)} />
        {people.map((p, idx) => {
          const fn = p.name.split(/\s+/)[0];
          const c = PERSON_COLORS[idx % PERSON_COLORS.length];
          const active = focusUser === p.name;
          return (
            <PersonChip
              key={p.name}
              label={fn}
              color={c}
              active={active}
              onClick={() => setFocusUser(active ? null : p.name)}
            />
          );
        })}
      </div>

      <TeamChart
        series={series}
        dates={allDates}
        height={280}
        target={meta.target > 0 ? meta.target : undefined}
        targetLabel="target"
        unit={meta.unit}
        lowerBetter={meta.lowerBetter}
      />
    </Card>
  );
}

function PersonChip({
  label, color, active, onClick,
}: {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  const accent = color ?? 'var(--color-accent)';
  return (
    <button
      onClick={onClick}
      className="text-[11px] font-bold px-2.5 py-1 rounded-full transition-colors"
      style={
        active
          ? {
              background: `${accent}22`,
              color: accent,
              boxShadow: `inset 0 0 0 1px ${accent}80`,
            }
          : {
              background: 'transparent',
              color: 'var(--color-fg-muted)',
              boxShadow: 'inset 0 0 0 1px var(--color-border)',
            }
      }
    >
      {label}
    </button>
  );
}
