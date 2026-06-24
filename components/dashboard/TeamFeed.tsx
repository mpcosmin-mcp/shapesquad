'use client';
import { useMemo } from 'react';
import { type Person, firstNameOf, personColor, bfColor, kgColor, fDate } from '@/lib/shape';
import { Avi } from '@/components/ui/Avi';
import { EntryReactions } from '@/components/dashboard/EntryReactions';
import { useSocial } from '@/lib/social';

/**
 * Team Feed — the social layer of ShapeSquad.
 *
 * Shows each person's LATEST measurement as a card: name + date +
 * headline body-comp metrics (kg + BF%) + ReactionBar + flat comment thread.
 * Sorted newest-first by entry date.
 */
export function TeamFeed({
  people,
  currentUser,
}: {
  people: Person[];
  currentUser: string;
}) {
  const { syncError } = useSocial();

  const allNames = useMemo(() => people.map(p => p.name), [people]);

  // Latest entry per person, sorted newest date first.
  const feed = useMemo(
    () =>
      [...people]
        .filter(p => p.latest)
        .sort((a, b) => b.latest.date.localeCompare(a.latest.date)),
    [people],
  );

  return (
    <section className="card px-4 sm:px-5 py-4 lg:py-5">
      {/* Header */}
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <div>
          <div className="label flex items-center gap-2">
            <span>Feed echipă</span>
            {syncError === 'kv-unavailable' && (
              <span
                className="num text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                style={{ background: 'rgba(251,191,36,0.12)', color: 'var(--color-warn)' }}
                title="Redis KV nu e configurat — reacțiile rămân doar pe acest dispozitiv."
              >
                offline
              </span>
            )}
          </div>
          <div className="text-[10px] num text-[var(--color-fg-faint)] mt-0.5">
            {feed.length} {feed.length === 1 ? 'membru' : 'membri'} · ultima măsurătoare per persoană
          </div>
        </div>
      </div>

      {/* Feed cards */}
      {feed.length === 0 ? (
        <div className="text-xs text-[var(--color-fg-muted)] italic py-6 text-center">
          nicio măsurătoare înregistrată încă.
        </div>
      ) : (
        <div className="space-y-2.5">
          {feed.map(p => (
            <FeedCard
              key={p.name}
              person={p}
              currentUser={currentUser}
              allNames={allNames}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ─── Single feed card ───────────────────────────────────── */

function FeedCard({
  person,
  currentUser,
  allNames,
}: {
  person: Person;
  currentUser: string;
  allNames: string[];
}) {
  const c = personColor(person.name, allNames);
  const isMe = person.name === currentUser;
  const fn = firstNameOf(person.name);
  const e = person.latest;

  return (
    <div
      className="rounded-xl border p-3 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${c}08, transparent 70%)`,
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Left edge person color stripe */}
      <div className="absolute inset-y-0 left-0 w-0.5" style={{ background: c, opacity: 0.6 }} />

      <div className="flex items-start gap-2.5 pl-1">
        <Avi name={person.name} color={c} size="sm" />
        <div className="flex-1 min-w-0">
          {/* Header line */}
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="font-bold text-sm" style={{ color: c }}>{fn}</span>
            {isMe && (
              <span className="text-[8px] uppercase tracking-wider text-[var(--color-accent)] font-bold">tu</span>
            )}
            <span className="text-[10px] num text-[var(--color-fg-muted)]">{fDate(e.date)}</span>

            {/* Headline metrics */}
            {e.kg != null && (
              <MetricPill label="kg" value={`${e.kg}`} color={kgColor(e.kg)} />
            )}
            {e.bodyFat != null && (
              <MetricPill label="BF%" value={`${e.bodyFat.toFixed(1)}%`} color={bfColor(e.bodyFat, e.gender)} />
            )}
          </div>
        </div>
      </div>

      {/* Reactions footer */}
      <EntryReactions
        entryDate={e.date}
        entryName={person.name}
        currentUser={currentUser}
        allNames={allNames}
      />
    </div>
  );
}

/* ─── Tiny metric pill ───────────────────────────────────── */

function MetricPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span className="num text-[10px] font-bold inline-flex items-baseline gap-0.5" style={{ color }}>
      <span className="text-[8px] opacity-70">{label}</span>
      <span>{value}</span>
    </span>
  );
}
