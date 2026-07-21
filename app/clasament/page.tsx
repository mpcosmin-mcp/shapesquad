'use client';

import { useMemo, useState } from 'react';
import {
  METRICS, type MetricKey,
  firstNameOf, personColor, calcXP, getLevelTier, f, fDate,
} from '@/lib/shape';
import {
  metricDef, rankByCurrent, rankByProgress, buildFeed,
  type Highlight,
} from '@/lib/leaderboard';
import { useShapeData } from '@/lib/useShapeData';
import { useLoggedInUser } from '@/lib/useLoggedInUser';
import { Card } from '@/components/ui/Card';
import { Avi } from '@/components/ui/Avi';
import { EntryReactions } from '@/components/dashboard/EntryReactions';
import { Trophy, TrendingUp, Crown } from 'lucide-react';

type Mode = 'progres' | 'acum';
const MEDAL = ['🥇', '🥈', '🥉'];

export default function ClasamentPage() {
  const { people, loading } = useShapeData();
  const { loggedInUser } = useLoggedInUser();
  const allNames = useMemo(() => people.map((p) => p.name), [people]);

  const [metric, setMetric] = useState<MetricKey>('bodyFat');
  const [mode, setMode] = useState<Mode>('progres');

  const def = metricDef(metric);
  const maxEntries = Math.max(1, ...people.map((p) => p.entries.length));

  const rows = useMemo(() => {
    if (mode === 'acum') {
      return rankByCurrent(people, metric).map((r) => ({
        person: r.person,
        primary: `${f(r.value, 1)}${def.unit}`,
        sub: null as string | null,
        good: null as boolean | null,
      }));
    }
    return rankByProgress(people, metric).map((r) => ({
      person: r.person,
      primary: `${r.improvement > 0 ? '+' : ''}${f(r.improvement, 1)}${def.unit}`,
      sub: `${f(r.from, 1)} → ${f(r.to, 1)}`,
      good: r.improvement > 0.05 ? true : r.improvement < -0.05 ? false : null,
    }));
  }, [people, metric, mode, def.unit]);

  const feed = useMemo(() => buildFeed(people), [people]);

  if (loading && people.length === 0) {
    return <div className="text-center py-20 text-[var(--color-fg-muted)] text-sm anim-pulse">se încarcă clasamentul…</div>;
  }

  const champ = rows[0];
  const rest = rows.slice(1);

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-4">
      {/* Header */}
      <div className="fade-in-up delay-0">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--color-fg)] flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#ffd700]" /> Clasament
        </h1>
        <p className="text-[11px] text-[var(--color-fg-muted)] mt-0.5">
          top achieveri pe fiecare modul · felicitați-vă în feed cu like &amp; comment
        </p>
      </div>

      {/* Metric pills */}
      <div className="flex flex-wrap gap-1.5 fade-in-up delay-1">
        {METRICS.map((m) => {
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

      {/* Champion */}
      {champ ? (
        <ChampionCard
          def={def}
          name={champ.person.name}
          allNames={allNames}
          primary={champ.primary}
          sub={champ.sub}
          good={champ.good}
          level={calcXP(champ.person, maxEntries).level}
        />
      ) : (
        <Card className="p-6 text-center text-xs text-[var(--color-fg-muted)]">
          Nu sunt destule date pentru {def.label} încă.
        </Card>
      )}

      {/* Rest of the ranking */}
      {rest.length > 0 && (
        <Card className="p-2 fade-in-up">
          <ul className="divide-y divide-[var(--color-border)]/50">
            {rest.map((r, i) => {
              const pos = i + 2; // champion was #1
              const color = personColor(r.person.name, allNames);
              return (
                <li key={r.person.name} className="flex items-center gap-3 px-2 py-2.5">
                  <span className="w-6 text-center text-sm font-bold num text-[var(--color-fg-muted)] shrink-0">
                    {MEDAL[pos - 1] ?? `${pos}`}
                  </span>
                  <Avi name={r.person.name} color={color} size="sm" />
                  <span className="font-bold text-sm flex-1 min-w-0 truncate" style={{ color }}>
                    {firstNameOf(r.person.name)}
                  </span>
                  <div className="text-right shrink-0">
                    <div
                      className="num font-bold text-sm"
                      style={{ color: r.good === true ? 'var(--color-good)' : r.good === false ? 'var(--color-bad)' : 'var(--color-fg)' }}
                    >
                      {r.primary}
                    </div>
                    {r.sub && <div className="num text-[10px] text-[var(--color-fg-faint)]">{r.sub}</div>}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Feed */}
      <div className="mt-2 fade-in-up">
        <h2 className="label px-1 mb-2">feed · realizări</h2>
        {feed.length === 0 ? (
          <Card className="p-6 text-center text-xs text-[var(--color-fg-muted)]">
            Încă nimic de sărbătorit — loghează măsurători și apar aici.
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {feed.map((item) => (
              <FeedCard
                key={`${item.date}_${item.name}`}
                name={item.name}
                date={item.date}
                highlights={item.highlights}
                allNames={allNames}
                currentUser={loggedInUser || ''}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Champion card (#1) ─────────────────────────────────── */

function ChampionCard({
  def, name, allNames, primary, sub, good, level,
}: {
  def: ReturnType<typeof metricDef>;
  name: string;
  allNames: string[];
  primary: string;
  sub: string | null;
  good: boolean | null;
  level: number;
}) {
  const color = personColor(name, allNames);
  const tier = getLevelTier(level);
  return (
    <Card
      className="p-4 sm:p-5 relative overflow-hidden fade-in-up delay-3"
      style={{ background: `linear-gradient(135deg, ${color}1f, var(--color-card) 60%)` }}
    >
      <div className="absolute top-3 right-4 text-[10px] uppercase tracking-widest font-bold text-[#ffd700] flex items-center gap-1">
        <Crown className="w-3.5 h-3.5" /> #1 {def.label}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avi name={name} color={color} size="lg" />
          <span className="absolute -top-1.5 -right-1.5 text-lg" aria-hidden>👑</span>
        </div>
        <div className="min-w-0">
          <div className="font-bold text-lg leading-tight" style={{ color }}>{firstNameOf(name)}</div>
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
      </div>
    </Card>
  );
}

/* ─── Feed card ──────────────────────────────────────────── */

const BADGE_STYLE: Record<Highlight['kind'], { bg: string; fg: string }> = {
  record:   { bg: 'var(--color-accent)', fg: 'var(--color-accent)' },
  progress: { bg: 'var(--color-good)',   fg: 'var(--color-good)' },
  leader:   { bg: '#ffd700',             fg: '#ffd700' },
};

function FeedCard({
  name, date, highlights, allNames, currentUser,
}: {
  name: string;
  date: string;
  highlights: Highlight[];
  allNames: string[];
  currentUser: string;
}) {
  const color = personColor(name, allNames);
  return (
    <Card className="p-3.5">
      <div className="flex items-center gap-2.5">
        <Avi name={name} color={color} size="sm" />
        <div className="min-w-0 flex-1">
          <span className="font-bold text-sm" style={{ color }}>{firstNameOf(name)}</span>
          <span className="text-[10px] num text-[var(--color-fg-faint)] ml-2">{fDate(date)}</span>
        </div>
      </div>

      {highlights.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {highlights.map((h, i) => {
            const s = BADGE_STYLE[h.kind];
            return (
              <span
                key={`${h.kind}-${h.metric}-${i}`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold"
                style={{ background: `${s.bg}18`, color: s.fg, border: `1px solid ${s.bg}33` }}
              >
                <span aria-hidden>{h.kind === 'record' ? '🏅' : h.kind === 'leader' ? '👑' : h.icon}</span>
                {h.text}
              </span>
            );
          })}
        </div>
      ) : (
        <p className="text-[11px] text-[var(--color-fg-muted)] mt-2">a logat măsurători noi 📝</p>
      )}

      <EntryReactions
        entryDate={date}
        entryName={name}
        currentUser={currentUser}
        allNames={allNames}
      />
    </Card>
  );
}
