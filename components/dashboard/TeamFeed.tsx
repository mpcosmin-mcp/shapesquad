'use client';
import { useMemo, useState } from 'react';
import {
  type Entry, type Person,
  PERSON_COLORS, bfColor, muscleColor, visceralColor,
} from '@/lib/shape';
import { fmtDate, thisMonthKey, monthOf } from '@/lib/utils';
import { Avi } from '@/components/ui/Avi';
import { EntryReactions } from '@/components/dashboard/EntryReactions';
import { useSocial } from '@/lib/social';

type Range = 'month' | 'all';

/**
 * Team Feed — social layer.
 *
 * Default scope: THIS MONTH. Tab "Toate" shows entire history (last N).
 * Each entry row has likes + comments (Instagram-style threading).
 */
export function TeamFeed({
  people, currentUser, limit = 6,
}: {
  people: Person[];
  currentUser: string;
  limit?: number;
}) {
  const [range, setRange] = useState<Range>('month');
  const { syncError } = useSocial();

  const allNames = people.map((p) => p.name);
  const allEntries = people.flatMap((p) => p.entries);
  const thisMonth = thisMonthKey();

  const feed = useMemo(() => {
    const scoped = range === 'month'
      ? allEntries.filter((e) => monthOf(e.date) === thisMonth)
      : allEntries;
    return scoped
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, range === 'month' ? 30 : limit);
  }, [allEntries, range, thisMonth, limit]);

  const monthCount = useMemo(
    () => new Set(
      allEntries.filter((e) => monthOf(e.date) === thisMonth).map((e) => e.name),
    ).size,
    [allEntries, thisMonth],
  );

  return (
    <section className="card px-4 sm:px-5 py-4 lg:py-5">
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-3">
        <div>
          <div className="label flex items-center gap-2">
            <span>Feed echipă{range === 'month' ? ' · luna asta' : ''}</span>
            {syncError === 'kv-unavailable' && (
              <span
                className="num text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                style={{ background: 'rgba(251,191,36,0.12)', color: 'var(--color-warn)' }}
                title="Vercel KV nu e configurat — reacțiile rămân doar pe acest device. Vezi SOCIAL_SYNC.md."
              >
                offline
              </span>
            )}
          </div>
          <div className="text-[10px] num text-[var(--color-fg-faint)] mt-0.5">
            {range === 'month'
              ? `${monthCount}/${people.length} membri au logat luna asta`
              : `ultimele ${feed.length} măsurători`}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ScopeChip active={range === 'month'} onClick={() => setRange('month')} label="Luna asta" />
          <ScopeChip active={range === 'all'} onClick={() => setRange('all')} label="Toate" />
        </div>
      </div>

      {feed.length === 0 ? (
        <div className="text-xs text-[var(--color-fg-muted)] italic py-6 text-center">
          {range === 'month' ? (
            <>
              nimeni n-a logat încă luna asta. fii primul — și{' '}
              <button
                onClick={() => setRange('all')}
                className="text-[var(--color-accent)] font-bold hover:underline"
              >
                vezi feed-ul total
              </button>{' '}
              cât aștepți.
            </>
          ) : (
            'nicio măsurătoare încă.'
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {feed.map((e) => (
            <FeedItem
              key={`${e.date}_${e.name}`}
              entry={e}
              currentUser={currentUser}
              allNames={allNames}
              previousFor={prevForPerson(allEntries, e.name, e.date)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function prevForPerson(allEntries: Entry[], name: string, beforeDate: string): Entry | null {
  const earlier = allEntries
    .filter((e) => e.name === name && e.date < beforeDate)
    .sort((a, b) => b.date.localeCompare(a.date));
  return earlier[0] ?? null;
}

function ScopeChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-colors ${
        active
          ? 'bg-[var(--color-accent)]/15 text-[var(--color-fg)] ring-1 ring-[var(--color-accent)]/40'
          : 'border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
      }`}
    >
      {label}
    </button>
  );
}

function FeedItem({
  entry, currentUser, allNames, previousFor,
}: {
  entry: Entry;
  currentUser: string;
  allNames: string[];
  previousFor: Entry | null;
}) {
  const idx = Math.max(0, allNames.indexOf(entry.name));
  const c = PERSON_COLORS[idx % PERSON_COLORS.length];
  const isMe = entry.name === currentUser;
  const fn = entry.name.split(/\s+/)[0];

  return (
    <div
      className="rounded-xl border p-3 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${c}08, transparent 70%)`,
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="absolute inset-y-0 left-0 w-0.5" style={{ background: c, opacity: 0.6 }} />

      <div className="flex items-start gap-2.5 pl-1">
        <Avi name={entry.name} color={c} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="font-bold text-sm" style={{ color: c }}>{fn}</span>
            {isMe && (
              <span className="text-[8px] uppercase tracking-wider text-[var(--color-accent)] font-bold">tu</span>
            )}
            <span className="text-[10px] num text-[var(--color-fg-muted)]">{fmtDate(entry.date)}</span>
            <span className="text-[var(--color-fg-faint)]">·</span>
            {entry.kg != null && <MetricInline label="kg" value={entry.kg.toFixed(1)} color="var(--color-accent)" delta={delta(entry.kg, previousFor?.kg)} />}
            {entry.bodyFat != null && <MetricInline label="BF" value={`${entry.bodyFat.toFixed(1)}%`} color={bfColor(entry.bodyFat, entry.gender)} delta={delta(entry.bodyFat, previousFor?.bodyFat)} lowerBetter />}
            {entry.muscle != null && <MetricInline label="mus" value={`${entry.muscle.toFixed(1)}%`} color={muscleColor(entry.muscle, entry.gender)} delta={delta(entry.muscle, previousFor?.muscle)} />}
            {entry.visceralFat != null && <MetricInline label="v" value={`${entry.visceralFat}`} color={visceralColor(entry.visceralFat)} delta={delta(entry.visceralFat, previousFor?.visceralFat)} lowerBetter />}
          </div>

          {hasMeasurements(entry) ? (
            <p className="text-[11px] text-[var(--color-fg-muted)] mt-1.5 num">
              {summarizeBody(entry)}
            </p>
          ) : (
            <p className="text-[11px] text-[var(--color-fg-faint)] italic mt-1.5">
              măsurătoare fără date secundare
            </p>
          )}
        </div>
      </div>

      <EntryReactions
        date={entry.date}
        name={entry.name}
        currentUser={currentUser}
        allNames={allNames}
      />
    </div>
  );
}

function delta(curr: number | null, prev: number | null | undefined): number | null {
  if (curr == null || prev == null) return null;
  return Math.round((curr - prev) * 10) / 10;
}

function MetricInline({
  label, value, color, delta, lowerBetter,
}: {
  label: string;
  value: string;
  color: string;
  delta: number | null;
  lowerBetter?: boolean;
}) {
  const deltaGood = delta != null && (lowerBetter ? delta < 0 : delta > 0);
  const deltaBad = delta != null && (lowerBetter ? delta > 0 : delta < 0);
  const deltaColor = deltaGood ? 'var(--color-good)' : deltaBad ? 'var(--color-bad)' : 'var(--color-fg-faint)';
  return (
    <span className="num text-[10px] font-bold inline-flex items-baseline gap-0.5" style={{ color }}>
      <span className="text-[8px] opacity-70">{label}</span>
      <span>{value}</span>
      {delta != null && Math.abs(delta) >= 0.1 && (
        <span className="text-[8px] ml-0.5" style={{ color: deltaColor }}>
          {delta > 0 ? '+' : ''}{delta.toFixed(1)}
        </span>
      )}
    </span>
  );
}

function hasMeasurements(e: Entry): boolean {
  return e.biceps != null || e.spate != null || e.piept != null || e.talie != null || e.fesieri != null || e.water != null;
}

function summarizeBody(e: Entry): string {
  const parts: string[] = [];
  if (e.water != null) parts.push(`apă ${e.water.toFixed(1)}%`);
  if (e.talie != null) parts.push(`talie ${e.talie}cm`);
  if (e.piept != null) parts.push(`piept ${e.piept}cm`);
  if (e.biceps != null) parts.push(`biceps ${e.biceps}cm`);
  if (e.spate != null) parts.push(`spate ${e.spate}cm`);
  if (e.fesieri != null) parts.push(`fesieri ${e.fesieri}cm`);
  return parts.join(' · ');
}
