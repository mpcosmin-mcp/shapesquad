/* ─────────────────────────────────────────────────────────
   Competition primitives — per-metric leaderboards + an achievement feed.

   Pure functions over Person[] (domain logic, no React). The page in
   app/clasament/ renders these; the social layer (likes/comments) is keyed by
   entry (`${date}_${name}`) and wired separately via <EntryReactions/>.

   Direction: each MetricDef carries `lowerBetter` (body fat, visceral, waist).
   "Improvement" is always sign-adjusted so a POSITIVE number = good progress.
   ───────────────────────────────────────────────────────── */
import { type Person, type MetricKey, type MetricDef, METRICS, f } from './shape';

export function metricDef(key: MetricKey): MetricDef {
  return METRICS.find((m) => m.key === key) ?? METRICS[0];
}

/** Chronological, non-null samples of one metric for a person. */
function seriesFor(p: Person, key: MetricKey): { date: string; val: number }[] {
  return [...p.entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({ date: e.date, val: e[key] as number | null }))
    .filter((x): x is { date: string; val: number } => x.val != null);
}

/* ─── Leaderboards ───────────────────────────────────────── */

export interface CurrentRow {
  person: Person;
  value: number;
}

/** Rank by CURRENT best value (respects lowerBetter). Excludes people with no data. */
export function rankByCurrent(people: Person[], key: MetricKey): CurrentRow[] {
  const def = metricDef(key);
  const rows = people
    .map((p) => {
      const s = seriesFor(p, key);
      return s.length ? { person: p, value: s[s.length - 1].val } : null;
    })
    .filter((r): r is CurrentRow => r !== null);
  rows.sort((a, b) => (def.lowerBetter ? a.value - b.value : b.value - a.value));
  return rows;
}

export interface ProgressRow {
  person: Person;
  from: number;
  to: number;
  improvement: number; // sign-adjusted so positive = good
}

/** Rank by IMPROVEMENT over the person's whole history (first → latest sample). */
export function rankByProgress(people: Person[], key: MetricKey): ProgressRow[] {
  const def = metricDef(key);
  const rows = people
    .map((p) => {
      const s = seriesFor(p, key);
      if (s.length < 2) return null;
      const from = s[0].val;
      const to = s[s.length - 1].val;
      const improvement = def.lowerBetter ? from - to : to - from;
      return { person: p, from, to, improvement };
    })
    .filter((r): r is ProgressRow => r !== null);
  rows.sort((a, b) => b.improvement - a.improvement);
  return rows;
}

/* ─── Achievement feed ───────────────────────────────────── */

export type HighlightKind = 'record' | 'progress' | 'leader';

export interface Highlight {
  kind: HighlightKind;
  metric: MetricKey;
  label: string;
  icon: string;
  text: string;
}

export interface FeedItem {
  name: string;
  date: string;
  person: Person;
  highlights: Highlight[];
}

/** Body metrics drive the feed highlights (measurements are noisier). */
const FEED_METRICS = METRICS.filter((m) => m.category === 'body');

function threshold(m: MetricDef): number {
  if (m.key === 'visceralFat') return 0.5;
  if (m.unit === 'kg' || m.unit === 'cm') return 0.5;
  return 0.3;
}

const arrow = (lowerBetter: boolean, delta: number) =>
  (lowerBetter ? delta < 0 : delta > 0) ? '↓' : '↑';

/** Who currently holds #1 on each body metric → gold "leader" badges. */
function computeLeaders(people: Person[]): Record<string, Highlight[]> {
  const out: Record<string, Highlight[]> = {};
  for (const m of FEED_METRICS) {
    const ranked = rankByCurrent(people, m.key);
    if (!ranked.length) continue;
    const leader = ranked[0].person.name;
    (out[leader] ||= []).push({
      kind: 'leader',
      metric: m.key,
      label: m.label,
      icon: m.icon,
      text: `Lider ${m.label}`,
    });
  }
  return out;
}

/**
 * Build the feed: one card per notable entry. Always includes each person's
 * latest entry (recent activity + leader badges), plus any historical entry
 * that set a personal record or made real progress. Sorted newest-first.
 */
export function buildFeed(people: Person[], limit = 40): FeedItem[] {
  const leaders = computeLeaders(people);
  const items: FeedItem[] = [];

  for (const p of people) {
    const sorted = [...p.entries].sort((a, b) => a.date.localeCompare(b.date));
    if (!sorted.length) continue;

    sorted.forEach((e, i) => {
      const highlights: Highlight[] = [];

      for (const m of FEED_METRICS) {
        const v = e[m.key] as number | null;
        if (v == null) continue;

        const prior = sorted
          .slice(0, i)
          .map((x) => x[m.key] as number | null)
          .filter((x): x is number => x != null);

        if (prior.length) {
          const priorBest = m.lowerBetter ? Math.min(...prior) : Math.max(...prior);
          const isRecord = m.lowerBetter ? v < priorBest - 1e-9 : v > priorBest + 1e-9;
          if (isRecord) {
            highlights.push({
              kind: 'record',
              metric: m.key,
              label: m.label,
              icon: m.icon,
              text: `Record ${m.label} · ${f(v, 1)}${m.unit}`,
            });
            continue; // a record is the headline; skip the smaller progress note
          }
          const prev = sorted[i - 1]?.[m.key] as number | null;
          if (prev != null) {
            const delta = v - prev;
            const good = m.lowerBetter ? delta < 0 : delta > 0;
            if (good && Math.abs(delta) >= threshold(m)) {
              highlights.push({
                kind: 'progress',
                metric: m.key,
                label: m.label,
                icon: m.icon,
                text: `${m.label} ${arrow(!!m.lowerBetter, delta)}${f(Math.abs(delta), 1)}${m.unit}`,
              });
            }
          }
        }
      }

      const isLatest = i === sorted.length - 1;
      if (isLatest && leaders[p.name]) highlights.push(...leaders[p.name]);

      if (highlights.length || isLatest) {
        items.push({ name: p.name, date: e.date, person: p, highlights });
      }
    });
  }

  items.sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
  return items.slice(0, limit);
}
