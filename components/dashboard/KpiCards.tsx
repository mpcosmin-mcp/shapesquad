'use client';
import {
  type Person,
  bfColor, muscleColor, visceralColor,
} from '@/lib/shape';
import { Sparkline } from '@/components/ui/Sparkline';

/**
 * KPI Cards — Greutate / Body Fat / Muscle / Visceral (the "Metrici de Aur").
 *
 * Each card:
 *  - label + colored target-vs-actual pill ("+1.4 ✓" / "−2.1 sub target")
 *  - giant number
 *  - delta vs last measurement + inline sparkline
 *  - glowing colored bottom border via .kpi class
 */
export function KpiCards({ person }: { person: Person }) {
  const sorted = [...person.entries].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1] ?? null;
  const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;

  // Use last 6 measurements as sparkline window — works for monthly cadence
  const last6 = sorted.slice(-6);
  const dates = last6.map((e) => e.date);
  const kgSeries  = last6.map((e) => e.kg);
  const bfSeries  = last6.map((e) => e.bodyFat);
  const musSeries = last6.map((e) => e.muscle);
  const vfSeries  = last6.map((e) => e.visceralFat);

  if (!last) {
    return (
      <div className="card flex items-center justify-center px-6 py-10 text-center">
        <div>
          <div className="text-3xl mb-2">📐</div>
          <div className="text-sm text-[var(--color-fg-muted)]">
            Nicio măsurătoare încă. Loghează prima dată pentru a vedea KPI-urile.
          </div>
        </div>
      </div>
    );
  }

  const kgDelta  = prev && last.kg != null && prev.kg != null ? round(last.kg - prev.kg) : null;
  const bfDelta  = prev && last.bodyFat != null && prev.bodyFat != null ? round(last.bodyFat - prev.bodyFat) : null;
  const musDelta = prev && last.muscle != null && prev.muscle != null ? round(last.muscle - prev.muscle) : null;
  const vfDelta  = prev && last.visceralFat != null && prev.visceralFat != null ? round(last.visceralFat - prev.visceralFat) : null;

  // Targets — gender-dependent for BF/muscle.
  const bfTarget = person.gender === 'M' ? 20 : 28;
  const musTarget = person.gender === 'M' ? 35 : 28;
  const vfTarget = 9;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      <KpiCard
        label="Greutate"
        value={last.kg}
        unit="kg"
        delta={kgDelta}
        deltaUnit="kg"
        higherBetter={false}
        target={null}
        targetLabel="ref"
        series={kgSeries}
        dates={dates}
        color="var(--color-accent)"
        accentVar="var(--color-accent)"
      />
      <KpiCard
        label="Body Fat"
        value={last.bodyFat}
        unit="%"
        delta={bfDelta}
        deltaUnit="%"
        higherBetter={false}
        target={bfTarget}
        series={bfSeries}
        dates={dates}
        color={bfColor(last.bodyFat, person.gender)}
        accentVar="#a78bfa"
      />
      <KpiCard
        label="Muscle"
        value={last.muscle}
        unit="%"
        delta={musDelta}
        deltaUnit="%"
        higherBetter={true}
        target={musTarget}
        series={musSeries}
        dates={dates}
        color={muscleColor(last.muscle, person.gender)}
        accentVar="#fbbf24"
      />
      <KpiCard
        label="Visceral"
        value={last.visceralFat}
        unit=""
        delta={vfDelta}
        deltaUnit=""
        higherBetter={false}
        target={vfTarget}
        series={vfSeries}
        dates={dates}
        color={visceralColor(last.visceralFat)}
        accentVar="#fb7185"
      />
    </div>
  );
}

function round(n: number): number { return Math.round(n * 10) / 10; }

function KpiCard({
  label, value, unit, delta, deltaUnit,
  higherBetter, target, targetLabel = 'target',
  series, dates, color, accentVar,
}: {
  label: string;
  value: number | null;
  unit: string;
  delta: number | null;
  deltaUnit: string;
  higherBetter: boolean;
  target: number | null;
  targetLabel?: string;
  series: (number | null)[];
  dates: string[];
  color: string;
  accentVar: string;
}) {
  const deltaPositive = delta != null && (higherBetter ? delta > 0 : delta < 0);
  const deltaNegative = delta != null && (higherBetter ? delta < 0 : delta > 0);
  const deltaColor = deltaPositive ? 'var(--color-good)' : deltaNegative ? 'var(--color-bad)' : 'var(--color-fg-muted)';
  const deltaArrow = delta == null || delta === 0 ? '·' : delta > 0 ? '↑' : '↓';

  const vsTarget = value != null && target != null
    ? (higherBetter ? round(value - target) : round(target - value))
    : null;
  const onTarget = vsTarget != null && vsTarget >= 0;
  const targetPillBg = vsTarget == null
    ? 'transparent'
    : onTarget ? 'color-mix(in srgb, var(--color-good) 14%, transparent)'
               : 'color-mix(in srgb, var(--color-bad) 14%, transparent)';
  const targetPillColor = vsTarget == null
    ? 'var(--color-fg-faint)'
    : onTarget ? 'var(--color-good)' : 'var(--color-bad)';

  return (
    <div
      className="kpi card px-4 lg:px-5 py-4 lg:py-5 flex flex-col"
      style={{ ['--kpi-accent' as string]: accentVar } as React.CSSProperties}
    >
      <div className="flex items-center justify-between mb-2 gap-1.5">
        <span className="label">{label}</span>
        {target != null && vsTarget != null ? (
          <span
            className="num text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap"
            style={{ background: targetPillBg, color: targetPillColor }}
            title={`target ${higherBetter ? '≥' : '≤'} ${target}${unit}`}
          >
            {onTarget ? '+' : ''}{vsTarget}{unit} {onTarget ? '✓' : 'sub'}
          </span>
        ) : target != null ? (
          <span className="text-[9px] num text-[var(--color-fg-faint)]">
            {targetLabel} {higherBetter ? '≥' : '≤'} {target}{unit}
          </span>
        ) : (
          <span className="text-[9px] num text-[var(--color-fg-faint)]">{targetLabel}</span>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span
          className="num font-bold leading-none text-4xl lg:text-5xl tracking-tight"
          style={{ color: value == null ? 'var(--color-fg-faint)' : color }}
        >
          {value != null ? (Number.isInteger(value) ? value : value.toFixed(1)) : '—'}
        </span>
        <span className="text-xs text-[var(--color-fg-muted)] font-medium">{unit}</span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span
          className="text-[11px] num font-bold flex items-center gap-1"
          style={{ color: deltaColor }}
        >
          <span>{deltaArrow}</span>
          {delta != null ? (
            <>{Math.abs(delta).toFixed(1)}{deltaUnit} vs prev</>
          ) : (
            <span className="text-[var(--color-fg-faint)]">prima măsurătoare</span>
          )}
        </span>
        <Sparkline values={series} dates={dates} unit={unit} width={56} height={20} color={color} />
      </div>
    </div>
  );
}
