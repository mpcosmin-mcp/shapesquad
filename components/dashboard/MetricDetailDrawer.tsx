'use client';
import { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import type { Entry, MetricKey } from '@/lib/shape';
import { personalDeltaColor } from '@/lib/shape';
import { fmtDate } from '@/lib/utils';
import { TeamChart } from '@/components/ui/TeamChart';
import { LikeButton } from '@/components/ui/LikeButton';
import { likeKey } from '@/lib/likes';

/**
 * Metric Detail Modal — health-tracker style deep-dive for ONE metric.
 *
 * Opens from PersonalMetrics when you tap a tile. Shows:
 *   • Headline: metric name + current value + Δ vs first
 *   • Stats row: min · max · avg · # entries · Δ total
 *   • Big chart of the full history (single line, continuous)
 *   • Tabular history with row-by-row Δ vs prev
 *
 * Closes on backdrop click, Escape key, or X button.
 * Centered on screen, ~560px desktop / full-screen mobile.
 */
export interface MetricSpec {
  key: MetricKey;
  label: string;
  unit: string;
  lowerBetter: boolean;
  decimals: number;
  color: string;
  target?: number;
}

export function MetricDetailDrawer({
  spec, entries, personName, viewer, onClose,
}: {
  spec: MetricSpec | null;
  entries: Entry[];
  personName: string;
  viewer: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!spec) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    // Prevent background scroll when drawer is open
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [spec, onClose]);

  const data = useMemo(() => {
    if (!spec) return null;
    const sortedAsc = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const present = sortedAsc
      .map((e) => ({ date: e.date, v: e[spec.key] as number | null }))
      .filter((x) => x.v != null) as { date: string; v: number }[];
    if (present.length === 0) return null;

    const values = present.map((p) => p.v);
    const dates = present.map((p) => p.date);
    const first = values[0];
    const last = values[values.length - 1];
    const prev = values.length >= 2 ? values[values.length - 2] : null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((s, v) => s + v, 0) / values.length;

    const deltaTotal = round(last - first, spec.decimals);
    const deltaPrev = prev != null ? round(last - prev, spec.decimals) : null;

    return {
      values,
      dates,
      first, last, prev,
      min, max, avg,
      deltaTotal, deltaPrev,
      count: present.length,
    };
  }, [spec, entries]);

  if (!spec) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[3px] anim-fade-in"
        onClick={onClose}
        aria-hidden
      />

      {/* Centered modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Detalii ${spec.label}`}
          className="pointer-events-auto bg-[var(--color-bg)] border border-[var(--color-border)] shadow-2xl shadow-black/60 flex flex-col overflow-hidden anim-scale w-full h-full sm:h-auto sm:max-h-[88vh] sm:w-[560px] lg:w-[640px] sm:rounded-2xl"
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[var(--color-border)]"
          style={{ background: `linear-gradient(135deg, ${spec.color}10, transparent 70%)` }}
        >
          <div className="min-w-0">
            <div className="label" style={{ color: spec.color }}>{spec.label}</div>
            {data ? (
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="num font-bold text-3xl tracking-tight" style={{ color: spec.color }}>
                  {fmtVal(data.last, spec.decimals)}
                </span>
                <span className="text-xs text-[var(--color-fg-muted)]">{spec.unit || '·'}</span>
                {data.deltaTotal != null && Math.abs(data.deltaTotal) >= (spec.decimals === 0 ? 1 : 0.05) && (
                  <span
                    className="num text-[11px] font-bold ml-2"
                    style={{ color: personalDeltaColor(data.deltaTotal, spec.lowerBetter) }}
                  >
                    {data.deltaTotal > 0 ? '+' : ''}{fmtVal(data.deltaTotal, spec.decimals)}{spec.unit} de la start
                  </span>
                )}
              </div>
            ) : (
              <div className="text-xs text-[var(--color-fg-muted)] italic mt-1">nicio măsurătoare</div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <LikeButton
              targetKey={likeKey.metric(personName, spec.key)}
              by={viewer}
              size="md"
              mode="pill"
              label={`${personName} · ${spec.label}`}
            />
            <button
              onClick={onClose}
              className="tap rounded-lg flex items-center justify-center text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface)] transition-colors"
              aria-label="Închide"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Scroll body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4 space-y-5">
          {data ? (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <Stat label="min" value={fmtVal(data.min, spec.decimals)} unit={spec.unit} />
                <Stat label="max" value={fmtVal(data.max, spec.decimals)} unit={spec.unit} />
                <Stat label="avg" value={fmtVal(data.avg, spec.decimals)} unit={spec.unit} />
                <Stat label="logs" value={String(data.count)} />
                <Stat
                  label="Δ prev"
                  value={data.deltaPrev != null ? `${data.deltaPrev > 0 ? '+' : ''}${fmtVal(data.deltaPrev, spec.decimals)}` : '—'}
                  unit={spec.unit}
                  color={personalDeltaColor(data.deltaPrev, spec.lowerBetter)}
                />
              </div>

              {/* Chart */}
              <div>
                <div className="label mb-2">Evoluție · luni consecutive</div>
                <TeamChart
                  series={[{ name: spec.label, color: spec.color, values: data.values }]}
                  dates={data.dates}
                  height={220}
                  target={spec.target}
                  targetLabel="target"
                  unit={spec.unit}
                  lowerBetter={spec.lowerBetter}
                />
              </div>

              {/* History table */}
              <div>
                <div className="label mb-2">Istoric · toate măsurătorile</div>
                <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-center px-3 py-2 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                    <span className="label">Data</span>
                    <span className="label text-right">{spec.label}</span>
                    <span className="label text-right">Δ prev</span>
                  </div>
                  <div className="divide-y divide-[var(--color-border)]/60">
                    {data.values
                      .map((v, i) => ({ v, date: data.dates[i] }))
                      .reverse()
                      .map((row, i) => {
                        const reverseIdx = data.values.length - 1 - i;
                        const prevV = reverseIdx > 0 ? data.values[reverseIdx - 1] : null;
                        const d = prevV != null ? round(row.v - prevV, spec.decimals) : null;
                        const dColor = personalDeltaColor(d, spec.lowerBetter);
                        return (
                          <div
                            key={row.date}
                            className="grid grid-cols-[1fr_auto_auto] gap-3 items-center px-3 py-2"
                          >
                            <span className="text-xs text-[var(--color-fg)]">{fmtDate(row.date)}</span>
                            <span className="num text-sm font-bold text-right" style={{ color: spec.color }}>
                              {fmtVal(row.v, spec.decimals)}{spec.unit}
                            </span>
                            <span className="num text-xs text-right font-semibold" style={{ color: dColor }}>
                              {d == null
                                ? '—'
                                : `${d > 0 ? '+' : ''}${fmtVal(d, spec.decimals)}${spec.unit}`}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-[var(--color-fg-muted)] italic py-8 text-center">
              Nicio măsurătoare pentru acest metric.
            </div>
          )}
        </div>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, unit, color }: {
  label: string;
  value: string;
  unit?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
      <div className="text-[9px] uppercase tracking-wider font-bold text-[var(--color-fg-faint)]">{label}</div>
      <div className="num font-bold text-base leading-tight mt-0.5" style={{ color: color ?? 'var(--color-fg)' }}>
        {value}{unit && value !== '—' ? <span className="text-[10px] text-[var(--color-fg-muted)] font-medium ml-0.5">{unit}</span> : null}
      </div>
    </div>
  );
}

function fmtVal(v: number, decimals: number): string {
  if (!isFinite(v)) return '—';
  return decimals === 0 ? String(Math.round(v)) : v.toFixed(decimals);
}

function round(n: number, dec: number): number {
  const f = Math.pow(10, dec);
  return Math.round(n * f) / f;
}
