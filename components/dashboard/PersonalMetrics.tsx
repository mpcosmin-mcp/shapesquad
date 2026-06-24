'use client';
import { useMemo, useState } from 'react';
import {
  type Person, type Entry, type MetricKey,
  bfColor, muscleColor, visceralColor, personalDeltaColor,
} from '@/lib/shape';
import { Sparkline } from '@/components/ui/Sparkline';
import { Avi } from '@/components/ui/Avi';
import { MetricDetailDrawer, type MetricSpec } from '@/components/dashboard/MetricDetailDrawer';
import { masuratori } from '@/lib/utils';

/**
 * Personal Metrics — minimalist grid of mini-modules for the active user.
 *
 * Click any tile → opens MetricDetailDrawer with the full history for
 * that metric.
 *
 * Gender-aware: M sees biceps/piept/spate/fesieri; F sees biceps/piept/talie/fesieri.
 */

type Spec = {
  key: MetricKey;
  label: string;
  unit: string;
  lowerBetter: boolean;
  decimals: number;
  target?: number;
  colorOf: (v: number | null, gender: 'M' | 'F') => string;
};

const BODY_SPECS: Spec[] = [
  { key: 'kg',          label: 'Greutate', unit: 'kg', lowerBetter: false, decimals: 1, colorOf: () => 'var(--color-accent)' },
  { key: 'bodyFat',     label: 'Body fat', unit: '%',  lowerBetter: true,  decimals: 1, colorOf: (v, g) => bfColor(v, g) },
  { key: 'muscle',      label: 'Muscle',   unit: '%',  lowerBetter: false, decimals: 1, colorOf: (v, g) => muscleColor(v, g) },
  { key: 'visceralFat', label: 'Visceral', unit: '',   lowerBetter: true,  decimals: 0, target: 9, colorOf: (v) => visceralColor(v) },
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

export function PersonalMetrics({
  person,
  accent,
  showHeader = true,
  large = false,
}: {
  person: Person;
  accent: string;
  /** Set false when rendering inside PeekModal (header is provided by the modal itself) */
  showHeader?: boolean;
  /** Larger tiles + bigger charts + fewer columns — used in the peek modal */
  large?: boolean;
}) {
  const firstName = person.name.split(/\s+/)[0];
  const sortedAsc = useMemo(
    () => [...person.entries].sort((a, b) => a.date.localeCompare(b.date)),
    [person.entries],
  );

  const specs: Spec[] = useMemo(() => [
    ...BODY_SPECS,
    ...(person.gender === 'F' ? MEASURE_SPECS_F : MEASURE_SPECS_M),
  ], [person.gender]);

  const tiles = useMemo(
    () => specs.map((s) => buildTile(s, sortedAsc, person.gender)).filter((t) => t.current != null),
    [specs, sortedAsc, person.gender],
  );

  // Ordered spec list for the drawer's module navigation — only the tiles
  // that actually have data (same set the user sees as mini-modules).
  const drawerSpecs: MetricSpec[] = useMemo(
    () => tiles.map((t) => ({
      key: t.key as MetricKey,
      label: t.label,
      unit: t.unit,
      lowerBetter: t.lowerBetter,
      decimals: t.decimals,
      color: t.color,
      target: t.target,
    })),
    [tiles],
  );

  const [openSpec, setOpenSpec] = useState<MetricSpec | null>(null);

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
    <>
      <section className={large ? '' : 'card px-4 sm:px-5 py-4'}>
        {/* Active user header — shown on main page, suppressed inside PeekModal */}
        {showHeader && (
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--color-border)]">
            <Avi name={person.name} color={accent} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight truncate" style={{ color: accent }}>
                  {firstName}
                </h2>
                <span
                  className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: `${accent}22`, color: accent }}
                >
                  activ
                </span>
              </div>
              <div className="text-[11px] text-[var(--color-fg-muted)] num mt-0.5">
                {masuratori(sortedAsc.length)} · progresul tău
              </div>
            </div>
          </div>
        )}

        <div className="flex items-baseline justify-between mb-3 flex-wrap gap-1">
          <div className="label">click pe un modul pentru detalii</div>
          <div className="text-[10px] num text-[var(--color-fg-faint)]">
            Δ start = prima măsurătoare · Δ prev = luna anterioară
          </div>
        </div>

        <div className={large ? 'grid grid-cols-2 lg:grid-cols-3 gap-3' : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2'}>
          {tiles.map((t) => (
            <MiniTile
              key={t.key}
              tile={t}
              large={large}
              onOpen={() => setOpenSpec({
                key: t.key as MetricKey,
                label: t.label,
                unit: t.unit,
                lowerBetter: t.lowerBetter,
                decimals: t.decimals,
                color: t.color,
                target: t.target,
              })}
            />
          ))}
        </div>
      </section>

      <MetricDetailDrawer
        spec={openSpec}
        entries={person.entries}
        personName={person.name}
        onClose={() => setOpenSpec(null)}
        specs={drawerSpecs}
        onNavigate={setOpenSpec}
      />
    </>
  );
}

interface Tile {
  key: string;
  label: string;
  unit: string;
  decimals: number;
  lowerBetter: boolean;
  target?: number;
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

  const tailDates = dates.slice(-6);
  const tailValues = values.slice(-6);

  return {
    key: s.key,
    label: s.label,
    unit: s.unit,
    decimals: s.decimals,
    lowerBetter: s.lowerBetter,
    target: s.target,
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

function MiniTile({
  tile, onOpen, large = false,
}: {
  tile: Tile;
  onOpen: () => void;
  large?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  // One-line verdict for the hover preview.
  const verdict = (() => {
    if (tile.deltaPrev == null) return { text: 'prima lună cu date', color: 'var(--color-fg-muted)' };
    const flat = Math.abs(tile.deltaPrev) < (tile.decimals === 0 ? 1 : 0.1);
    if (flat) return { text: 'stabil față de luna trecută', color: 'var(--color-fg-muted)' };
    const good = tile.lowerBetter ? tile.deltaPrev < 0 : tile.deltaPrev > 0;
    return good
      ? { text: 'în progres față de luna trecută', color: 'var(--color-good)' }
      : { text: 'în regres față de luna trecută', color: 'var(--color-warn)' };
  })();
  const onTarget = (tile.target != null && tile.current != null)
    ? (tile.lowerBetter ? tile.current <= tile.target : tile.current >= tile.target)
    : null;

  return (
    <div
      className={`relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all hover:border-[var(--color-border-strong)] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.4)] active:translate-y-0 ${hovered ? 'z-30' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onOpen}
        className={`text-left w-full flex flex-col cursor-pointer rounded-xl ${large ? 'px-4 py-4 gap-2.5' : 'px-3 py-2.5 gap-1.5'}`}
        aria-label={`Deschide detalii ${tile.label}`}
      >
      <div className="flex items-baseline justify-between gap-1">
        <span className={`uppercase tracking-wider font-bold text-[var(--color-fg-muted)] truncate ${large ? 'text-[11px]' : 'text-[9px]'}`}>
          {tile.label}
        </span>
        <span className={`num text-[var(--color-fg-faint)] ${large ? 'text-[11px]' : 'text-[9px]'}`}>{tile.unit}</span>
      </div>

      <div className="flex items-end justify-between gap-2">
        <span
          className={`num font-bold leading-none tracking-tight ${large ? 'text-4xl' : 'text-2xl'}`}
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
          width={large ? 120 : 56}
          height={large ? 44 : 20}
        />
      </div>

      <div className="flex items-center justify-between gap-1 pt-1 border-t border-[var(--color-border)]/60">
        {tile.deltaPrev == null ? (
          <span className="mx-auto text-[9px] uppercase tracking-wider font-bold text-[var(--color-fg-faint)]">
            primă măsurătoare
          </span>
        ) : (
          <>
            <DeltaLine label="start" delta={tile.deltaStart} unit={tile.unit} color={tile.deltaStartColor} dec={tile.decimals} />
            <DeltaLine label="prev"  delta={tile.deltaPrev}  unit={tile.unit} color={tile.deltaPrevColor}  dec={tile.decimals} />
          </>
        )}
      </div>
      </button>

      {/* Hover preview — desktop peek: bigger chart + deltas + target + verdict.
          Suppressed in large mode (tiles are already big; an absolute popover would
          clip inside the peek modal). */}
      {hovered && !large && (
        <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-full mt-2 z-30 w-60 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl shadow-black/40 p-3 pointer-events-none fade-in-up">
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-fg-muted)] truncate">{tile.label}</span>
            <span className="num font-bold text-lg leading-none" style={{ color: tile.current == null ? 'var(--color-fg-faint)' : tile.color }}>
              {tile.current == null ? '—' : tile.decimals === 0 ? Math.round(tile.current) : tile.current.toFixed(tile.decimals)}
              <span className="text-[10px] text-[var(--color-fg-faint)] font-medium ml-0.5">{tile.unit}</span>
            </span>
          </div>
          <Sparkline values={tile.series} dates={tile.dates} unit={tile.unit} color={tile.color} width={216} height={44} />
          <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-[var(--color-border)]/60">
            <DeltaLine label="start" delta={tile.deltaStart} unit={tile.unit} color={tile.deltaStartColor} dec={tile.decimals} />
            <DeltaLine label="prev"  delta={tile.deltaPrev}  unit={tile.unit} color={tile.deltaPrevColor}  dec={tile.decimals} />
          </div>
          {onTarget != null && (
            <div className="num text-[10px] font-bold mt-2" style={{ color: onTarget ? 'var(--color-good)' : 'var(--color-bad)' }}>
              {onTarget ? '✓ peste target' : 'sub target'} ({tile.lowerBetter ? '≤' : '≥'} {tile.target}{tile.unit})
            </div>
          )}
          <div className="text-[10px] mt-1.5 leading-snug" style={{ color: verdict.color }}>
            {verdict.text}
          </div>
        </div>
      )}
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
