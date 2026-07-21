'use client';

import { useMemo, useState } from 'react';
import {
  type MetricKey, type Person,
  firstNameOf, personColor, calcXP, getLevelTier, f,
} from '@/lib/shape';
import {
  BOARD_METRICS, metricDef, heightsConfigured,
  rankByCurrent, rankByProgress, rankByBmiCurrent, rankByBmiProgress,
} from '@/lib/leaderboard';
import { useShapeData } from '@/lib/useShapeData';
import { useLoggedInUser } from '@/lib/useLoggedInUser';
import { useSocial, entryKeyOf } from '@/lib/social';
import { Card } from '@/components/ui/Card';
import { Avi } from '@/components/ui/Avi';
import { ReactionBar } from '@/components/dashboard/ReactionBar';
import { EntryReactions } from '@/components/dashboard/EntryReactions';
import { PeekModal } from '@/components/dashboard/PeekModal';
import { Trophy, TrendingUp, Crown } from 'lucide-react';

type Mode = 'progres' | 'acum';
type BoardKey = MetricKey | 'bmi';
const MEDAL = ['🥇', '🥈', '🥉'];

const GENDER_META = {
  M: { label: 'băieți', icon: '♂', color: '#3b82f6' },
  F: { label: 'fete', icon: '♀', color: '#ec4899' },
} as const;

interface BoardRow {
  person: Person;
  primary: string;
  sub: string | null;
  good: boolean | null;
}

/** Rank one gender group on the selected board (metric or BMI). */
function boardRows(group: Person[], key: BoardKey, mode: Mode): BoardRow[] {
  if (key === 'bmi') {
    if (mode === 'acum') {
      return rankByBmiCurrent(group).map((r) => ({
        person: r.person,
        primary: f(r.bmi, 1),
        sub: r.category,
        good: r.healthy ? true : null,
      }));
    }
    return rankByBmiProgress(group).map((r) => ({
      person: r.person,
      primary: `${r.improvement > 0 ? '+' : ''}${f(r.improvement, 1)}`,
      sub: `BMI ${f(r.from, 1)} → ${f(r.to, 1)}`,
      good: r.improvement > 0.05 ? true : r.improvement < -0.05 ? false : null,
    }));
  }
  const def = metricDef(key);
  if (mode === 'acum') {
    return rankByCurrent(group, key).map((r) => ({
      person: r.person,
      primary: `${f(r.value, 1)}${def.unit}`,
      sub: null,
      good: null,
    }));
  }
  return rankByProgress(group, key).map((r) => ({
    person: r.person,
    primary: `${r.improvement > 0 ? '+' : ''}${f(r.improvement, 1)}${def.unit}`,
    sub: `${f(r.from, 1)} → ${f(r.to, 1)}`,
    good: r.improvement > 0.05 ? true : r.improvement < -0.05 ? false : null,
  }));
}

export default function ClasamentPage() {
  const { people, loading } = useShapeData();
  const { loggedInUser } = useLoggedInUser();
  const allNames = useMemo(() => people.map((p) => p.name), [people]);

  const [metric, setMetric] = useState<BoardKey>('bodyFat');
  const [mode, setMode] = useState<Mode>('progres');
  // Click a person on the board → their full history in the same PeekModal
  // used by the Squad rail. Clicking yourself does nothing (that's your dashboard).
  const [peekTarget, setPeekTarget] = useState<string | null>(null);

  const def = metric === 'bmi'
    ? { label: 'BMI', icon: '⚖️', unit: '' }
    : metricDef(metric);
  const maxEntries = Math.max(1, ...people.map((p) => p.entries.length));

  // ♂ / ♀ ranked separately — physiology differs, so does the competition.
  const genders = useMemo(
    () => (['M', 'F'] as const).filter((g) => people.some((p) => p.gender === g)),
    [people],
  );
  const boards = useMemo(
    () => genders
      .map((g) => ({ g, rows: boardRows(people.filter((p) => p.gender === g), metric, mode) }))
      .filter((b) => b.rows.length > 0),
    [genders, people, metric, mode],
  );

  const peekPerson = peekTarget ? people.find((p) => p.name === peekTarget) ?? null : null;
  const peekIndex = peekTarget ? people.findIndex((p) => p.name === peekTarget) : -1;
  const peek = (name: string) => {
    if (name !== loggedInUser) setPeekTarget(name);
  };

  if (loading && people.length === 0) {
    return <div className="text-center py-20 text-[var(--color-fg-muted)] text-sm anim-pulse">se încarcă clasamentul…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-4">
      {/* Header */}
      <div className="fade-in-up delay-0">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--color-fg)] flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#ffd700]" /> Clasament
        </h1>
        <p className="text-[11px] text-[var(--color-fg-muted)] mt-0.5">
          top achieveri pe fiecare modul · băieții și fetele concurează separat · reacționează cu emoji
        </p>
      </div>

      {/* Metric pills — kg has no board of its own (weight alone ≠ fitness);
          it competes as BMI instead. */}
      <div className="flex flex-wrap gap-1.5 fade-in-up delay-1">
        {BOARD_METRICS.map((m) => {
          const active = m.key === metric;
          return (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold border transition-all tap ${
                active
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/12 text-[var(--color-fg)]'
                  : 'border-[var(--color-border)] text-[var(--color-fg-muted)] hover:border-[var(--color-fg-dim)]'
              }`}
            >
              <span aria-hidden>{m.icon}</span>
              {m.shortLabel}
            </button>
          );
        })}
        {heightsConfigured() && (
          <button
            onClick={() => setMetric('bmi')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold border transition-all tap ${
              metric === 'bmi'
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/12 text-[var(--color-fg)]'
                : 'border-[var(--color-border)] text-[var(--color-fg-muted)] hover:border-[var(--color-fg-dim)]'
            }`}
          >
            <span aria-hidden>⚖️</span>
            BMI
          </button>
        )}
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] w-fit fade-in-up delay-2">
        {([
          { k: 'progres', label: 'Cel mai mult progres', icon: <TrendingUp className="w-3.5 h-3.5" /> },
          { k: 'acum', label: 'Top acum', icon: <Crown className="w-3.5 h-3.5" /> },
        ] as const).map((t) => (
          <button
            key={t.k}
            onClick={() => setMode(t.k)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              mode === t.k ? 'bg-[var(--color-card)] text-[var(--color-fg)] shadow-sm' : 'text-[var(--color-fg-muted)]'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Boards — one per gender with data on this metric */}
      {boards.length === 0 && (
        <Card className="p-6 text-center text-xs text-[var(--color-fg-muted)]">
          {metric === 'bmi' && mode === 'progres'
            ? 'Nu sunt destule măsurători de greutate pentru progres BMI încă.'
            : `Nu sunt destule date pentru ${def.label} încă.`}
        </Card>
      )}
      {boards.map(({ g, rows }) => {
        const gm = GENDER_META[g];
        const champ = rows[0];
        const rest = rows.slice(1);
        return (
          <section key={g} className="flex flex-col gap-2 fade-in-up delay-3">
            {genders.length > 1 && (
              <h2 className="label px-1 flex items-center gap-1.5">
                <span style={{ color: gm.color }}>{gm.icon}</span> {gm.label}
              </h2>
            )}

            <ChampionCard
              def={def}
              person={champ.person}
              allNames={allNames}
              primary={champ.primary}
              sub={champ.sub}
              good={champ.good}
              level={calcXP(champ.person, maxEntries).level}
              solo={rest.length === 0}
              currentUser={loggedInUser || ''}
              onPeek={() => peek(champ.person.name)}
            />

            {rest.length > 0 && (
              <Card className="p-2">
                <ul className="divide-y divide-[var(--color-border)]/50">
                  {rest.map((r, i) => (
                    <RankRow
                      key={r.person.name}
                      pos={i + 2}
                      row={r}
                      allNames={allNames}
                      currentUser={loggedInUser || ''}
                      onPeek={() => peek(r.person.name)}
                    />
                  ))}
                </ul>
              </Card>
            )}
          </section>
        );
      })}

      {/* History peek — same modal as the Squad rail */}
      {peekPerson && (
        <PeekModal
          person={peekPerson}
          personIndex={peekIndex >= 0 ? peekIndex : 0}
          allPeople={people}
          loggedInUser={loggedInUser || ''}
          onClose={() => setPeekTarget(null)}
        />
      )}
    </div>
  );
}

/* ─── Champion card (#1 within their gender group) ───────── */

function ChampionCard({
  def, person, allNames, primary, sub, good, level, solo, currentUser, onPeek,
}: {
  def: { label: string; icon: string; unit: string };
  person: Person;
  allNames: string[];
  primary: string;
  sub: string | null;
  good: boolean | null;
  level: number;
  solo: boolean;
  currentUser: string;
  onPeek: () => void;
}) {
  const color = personColor(person.name, allNames);
  const tier = getLevelTier(level);
  const isSelf = person.name === currentUser;
  return (
    <Card
      className="p-4 sm:p-5 relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${color}1f, var(--color-card) 60%)` }}
    >
      <div className="absolute top-3 right-4 text-[10px] uppercase tracking-widest font-bold text-[#ffd700] flex items-center gap-1">
        <Crown className="w-3.5 h-3.5" /> {solo ? def.label : `#1 ${def.label}`}
      </div>
      {/* Person area is the click target — reactions below stay independent */}
      <button
        onClick={onPeek}
        disabled={isSelf}
        className={`w-full flex items-center gap-3 text-left rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
          isSelf ? 'cursor-default' : 'tap hover:-translate-y-0.5'
        }`}
        title={isSelf ? undefined : `Vezi istoricul lui ${firstNameOf(person.name)}`}
        aria-label={isSelf ? undefined : `Vezi istoricul lui ${firstNameOf(person.name)}`}
      >
        <div className="relative">
          <Avi name={person.name} color={color} size="lg" />
          {/* No crown emoji when alone in the group — being #1 of 1 isn't a win */}
          {!solo && <span className="absolute -top-1.5 -right-1.5 text-lg" aria-hidden>👑</span>}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-lg leading-tight" style={{ color }}>{firstNameOf(person.name)}</div>
          <div className="text-[10px] num text-[var(--color-fg-muted)] flex items-center gap-1">
            <span style={{ color: tier.color }}>{tier.icon} Lv {level} · {tier.name}</span>
          </div>
        </div>
        <div className="ml-auto text-right">
          <div
            className="num font-bold text-2xl leading-none"
            style={{ color: good === true ? 'var(--color-good)' : good === false ? 'var(--color-bad)' : 'var(--color-fg)' }}
          >
            {primary}
          </div>
          <div className="text-[10px] num text-[var(--color-fg-faint)] mt-1">
            {sub ?? `${def.icon} ${def.label}`}
          </div>
        </div>
      </button>

      {/* Congratulate the champion — emoji + comments (keyed to their latest entry,
          so it's the same thread as on the dashboard) */}
      <EntryReactions
        entryDate={person.latest.date}
        entryName={person.name}
        currentUser={currentUser}
        allNames={allNames}
      />
    </Card>
  );
}

/* ─── Ranked row with compact emoji reactions ────────────── */

function RankRow({
  pos, row, allNames, currentUser, onPeek,
}: {
  pos: number;
  row: BoardRow;
  allNames: string[];
  currentUser: string;
  onPeek: () => void;
}) {
  const { toggleEntryReaction, entryReactionsFor } = useSocial();
  const color = personColor(row.person.name, allNames);
  const key = entryKeyOf(row.person.latest.date, row.person.name);
  const isSelf = row.person.name === currentUser;

  return (
    <li className="px-2 py-2.5">
      {/* Person row is the click target — the ReactionBar below stays independent */}
      <button
        onClick={onPeek}
        disabled={isSelf}
        className={`w-full flex items-center gap-3 text-left rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
          isSelf ? 'cursor-default' : 'tap hover:bg-[var(--color-surface)]'
        }`}
        title={isSelf ? undefined : `Vezi istoricul lui ${firstNameOf(row.person.name)}`}
        aria-label={isSelf ? undefined : `Vezi istoricul lui ${firstNameOf(row.person.name)}`}
      >
        <span className="w-6 text-center text-sm font-bold num text-[var(--color-fg-muted)] shrink-0">
          {MEDAL[pos - 1] ?? `${pos}`}
        </span>
        <Avi name={row.person.name} color={color} size="sm" />
        <span className="font-bold text-sm flex-1 min-w-0 truncate" style={{ color }}>
          {firstNameOf(row.person.name)}
        </span>
        <div className="text-right shrink-0">
          <div
            className="num font-bold text-sm"
            style={{ color: row.good === true ? 'var(--color-good)' : row.good === false ? 'var(--color-bad)' : 'var(--color-fg)' }}
          >
            {row.primary}
          </div>
          {row.sub && <div className="num text-[10px] text-[var(--color-fg-faint)]">{row.sub}</div>}
        </div>
      </button>
      <div className="pl-9 mt-1">
        <ReactionBar
          size="sm"
          reactions={entryReactionsFor(key)}
          currentUser={currentUser}
          onToggle={(emoji) => toggleEntryReaction(key, emoji, currentUser)}
        />
      </div>
    </li>
  );
}
