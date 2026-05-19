'use client';
import { useMemo } from 'react';
import {
  type Person, type Entry, type MetricKey,
  bfColor, muscleColor, visceralColor, personalDeltaColor,
} from '@/lib/shape';
import { Sparkline } from '@/components/ui/Sparkline';

/**
 * Personal Metrics — minimalist grid of mini-modules for the logged-in user.
 *
 * Goal: after login, see YOUR entire progress on every metric at a glance.
 * Each module shows: label + current + tiny sparkline + Δ vs first + Δ vs last.
 * Auto-hide modules where the user has no data, so the grid stays clean.
 *
 * Gender-aware: M sees biceps/piept/spate/fesieri; F sees biceps/piept/talie/fesieri.
 */

type Spec = {
  key: MetricKey;
  label: string;
  unit: string;
  lowerBetter: boolean;
  decimals: number;
  colorOf: (v: number | null, gender: 'M' | 'F') => string;
};

const BODY_SPECS: Spec[] = [
  { key: 'kg',          label: 'Greutate', unit: 'kg', lowerBetter: false, decimals: 1, colorOf: () => 'var(--color-accent)' },
  { key: 'bodyFat',     label: 'Body fat', unit: '%',  lowerBetter: true,  decimals: 1, colorOf: (v, g) => bfColor(v, g) },
  { key: 'muscle',      label: 'Muscle',   unit: '%',  lowerBetter: false, decimals: 1, colorOf: (v, g) => muscleColor(v, g) },
  { key: 'visceralFat', label: 'Visceral', unit: '',   lowerBetter: true,  decimals: 0, colorOf: (v) => visceralColor(v) },
  { key: 'water',       label: 'Apă',      unit: '%',  lowerBetter: false, decimals: 1, colorOf: () => '#22d3ee' },
];

const MEASURE_SPECS_M: Spec[] = [
  { key: 'biceps',  label: 'Biceps',  unit: 'cm', lowerBetter: false, decimals: 1, colorOf: () => '#f472b6' },
  { key: 'piept',   label: 'Piept',   unit: 'cm', lowerBetter: false, decimals: 1, colorOf: () => '#a78bfa' },
  { key: 'spate',   label: 'Spate',   unit: 'cm', lowerBetter: false, decimals: 1, colorOf: () => '#34d399' },
  { key: 'fesieri', label: 'Fesieri', unit: 'cm', lowerBetter: false, decimals: 1, colorOf: () => '#fbbf24' },
];
const MEASURE_SPECS_F: Spec[] = [
  { key: 'biceps',  label: 'Biceps',  unit: 'cm', lowerBetter: false, decimals: 1, colorOf: () => '#f472b6' },
  { key: 'piept',   label: 'Piept',   unit: 'cm', lowerBetter: false, decimals: 1, colorOf: () => '#a78bfa' },
  { key: 'talie',   label: 'Talie',   unit: 'cm', lowerBetter: true,  decimals: 1, colorOf: () => '#34d399' },
  { key: 'fesieri', label: 'Fesieri', unit: 'cm', lowerBetter: false, decimals: 1, colorOf: () => '#fbbf24' },
];

export function PersonalMetrics({ person }: { person: Person }) {
  const sortedAsc = useMemo(
    () => [...person.entries].sort((a, b) => a.date.localeCompare(b.date)),
    [person.entries],
  );

  const specs: Spec[] = [
    ...BODY_SPECS,
    ...(person.gender === 'F' ? MEASURE_SPECS_F : MEASURE_SPECS_M),
  ];

  const tiles = specs
    .map((s) => buildTile(s, sortedAsc, person.gender))
    .filter((t) => t.current != null);

  if (tiles.length === 0) {
    return (
      <section className="card px-5 py-6 text-center">
        <p className="text-sm text-[var(--color-fg-muted)]">
          Nicio măsurătoare încă. După prima logare apar mini-modulele cu progresul tău.
        </p>
      </section>
    );
  }

  return (
    <section className="card px-4 sm:px-5 py-4">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-1">
        <div>
          <div className="label">Progresul tău · pe fiecare metric</div>
          <div className="text-[10px] num text-[var(--color-fg-faint)] mt-0.5">
            Δ start = de la prima măsurătoare · Δ prev = vs luna anterioară
          </div>
        </div>
        <div className="text-[10px] num text-[var(--color-fg-faint)]">{sortedAsc.length} măsurători</div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {tiles.map((t) => (
          <MiniTile key={t.key} tile={t} />
        ))}
      </div>
    </section>
  );
}

interface Tile {
  key: string;
  label: string;
  unit: string;
  decimals: number;
  current: number | null;
  color: string;
  series: (number | null)[];
  dates: string[];
  deltaStart: number | null;
  deltaPrev: number | null;
  deltaStartColor: string;
  deltaPrevColor: string;
}

function buildTile(s: Spec, sortedAsc: Entry[], gender: 'M' | 'F'): Tile {
  const values = sortedAsc.map((e) => e[s.key] as number | null);
  const dates = sortedAsc.map((e) => e.date);

  const present = values.map((v, i) => ({ v, i })).filter((x) => x.v != null);
  const first = present[0]?.v ?? null;
  const last = present[present.length - 1]?.v ?? null;
  const prev = present.length >= 2 ? present[present.length - 2].v! : null;

  const deltaStart = first != null && last != null ? round(last - first, s.decimals) : null;
  const deltaPrev = prev != null && last != null ? round(last - prev, s.decimals) : null;

  // Sparkline: last 6 measurements
  const tailDates = dates.slice(-6);
  const tailValues = values.slice(-6);

  return {
    key: s.key,
    label: s.label,
    unit: s.unit,
    decimals: s.decimals,
    current: last,
    color: s.colorOf(last, gender),
    series: tailValues,
    dates: tailDates,
    deltaStart,
    deltaPrev,
    deltaStartColor: personalDeltaColor(deltaStart, s.lowerBetter),
    deltaPrevColor: personalDeltaColor(deltaPrev, s.lowerBetter),
  };
}

function round(n: number, dec: number): number {
  const f = Math.pow(10, dec);
  return Math.round(n * f) / f;
}

function MiniTile({ tile }: { tile: Tile }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--color-fg-muted)] truncate">
          {tile.label}
        </span>
        <span className="text-[9px] num text-[var(--color-fg-faint)]">{tile.unit}</span>
      </div>

      <div className="flex items-end justify-between gap-2">
        <span
          className="num font-bold leading-none text-2xl tracking-tight"
          style={{ color: tile.current == null ? 'var(--color-fg-faint)' : tile.color }}
        >
          {tile.current == null
            ? '—'
            : tile.decimals === 0
              ? Math.round(tile.current)
              : tile.current.toFixed(tile.decimals)}
        </span>
        <Sparkline
          values={tile.series}
          dates={tile.dates}
          unit={tile.unit}
          color={tile.color}
          width={56}
          height={20}
        />
      </div>

      <div className="flex items-center justify-between gap-1 pt-1 border-t border-[var(--color-border)]/60">
        <DeltaLine label="start" delta={tile.deltaStart} unit={tile.unit} color={tile.deltaStartColor} dec={tile.decimals} />
        <DeltaLine label="prev"  delta={tile.deltaPrev}  unit={tile.unit} color={tile.deltaPrevColor}  dec={tile.decimals} />
      </div>
    </div>
  );
}

function DeltaLine({ label, delta, unit, color, dec }: {
  label: string;
  delta: number | null;
  unit: string;
  color: string;
  dec: number;
}) {
  const sign = delta == null ? '' : delta > 0 ? '+' : '';
  const text = delta == null
    ? '—'
    : `${sign}${dec === 0 ? Math.round(delta) : delta.toFixed(dec)}${unit}`;
  return (
    <div className="flex items-baseline gap-1 text-[9px] leading-none">
      <span className="uppercase tracking-wider font-bold text-[var(--color-fg-faint)]">Δ {label}</span>
      <span className="num font-bold" style={{ color }}>{text}</span>
    </div>
  );
}
