/* ─────────────────────────────────────────────────────────
   Competition primitives — per-metric leaderboards + an achievement feed.

   Pure functions over Person[] (domain logic, no React). The page in
   app/clasament/ renders these; the social layer (likes/comments) is keyed by
   entry (`${date}_${name}`) and wired separately via <EntryReactions/>.

   FAIRNESS RULES (why this file looks the way it does):
   - Men and women are ranked SEPARATELY — body fat, muscle, water and all
     circumference norms differ physiologically by sex. The page splits every
     board into ♂ / ♀ sections; this module just ranks whatever group it gets.
   - Raw weight (kg) is NOT a competition — neither "heaviest" nor "lightest"
     means fit. It re-enters as BMI (closest to the healthy band wins) once
     HEIGHTS_CM is filled in.
   - Direction per metric comes from MetricDef.lowerBetter: body fat, visceral
     fat and waist (talie) → smaller is better; muscle, water, biceps, back,
     chest, hips (fesieri) → bigger is better. "Improvement" is always
     sign-adjusted so a POSITIVE number = good progress.
   - Gender-specific measurements sort themselves out via data presence:
     men log spate (not talie), women log talie (not spate) — a group with no
     samples for a metric simply doesn't rank on it.
   ───────────────────────────────────────────────────────── */
import { type Person, type MetricKey, type MetricDef, METRICS, f } from './shape';

/** Metrics that make sense as a contest. kg is excluded — see BMI below. */
export const BOARD_METRICS: MetricDef[] = METRICS.filter((m) => m.key !== 'kg');

/**
 * name → height in cm. Matching is by first name, case- and diacritics-
 * insensitive (see heightFor), so 'Petrica' matches "Petrică Popescu" too.
 * Having entries here unlocks the BMI board.
 */
export const HEIGHTS_CM: Record<string, number> = {
  Petrica: 184,
  Varamea: 164,
  Cristi: 186,
  Carlso: 186,
  Carlos: 186, // same person — cover both spellings
  Lavinia: 165,
  Cata: 178,
  Clara: 165,
  Stefi: 150,
  Bogdan: 170,
  Gabriel: 172,
  Adina: 168,
};

const normName = (s: string): string =>
  s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Height for a person: exact key match, else first-name match (loose). */
export function heightFor(name: string): number | null {
  if (HEIGHTS_CM[name] != null) return HEIGHTS_CM[name];
  const first = normName(name.split(/\s+/)[0] ?? '');
  for (const [k, v] of Object.entries(HEIGHTS_CM)) {
    if (normName(k) === first) return v;
  }
  return null;
}

export const heightsConfigured = (): boolean => Object.keys(HEIGHTS_CM).length > 0;

/** Middle of the 18.5–24.9 healthy BMI band — "best" = closest to this. */
export const HEALTHY_BMI_MID = 21.7;

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Subponderal';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Supraponderal';
  return 'Obezitate';
}

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

/* ─── Leaderboards (rank WITHIN the group you pass — page passes per-gender) ── */

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

/* ─── BMI board (replaces raw kg once heights are known) ── */

function bmiPoints(p: Person): { first: number; latest: number } | null {
  const h = heightFor(p.name);
  if (!h) return null;
  const s = seriesFor(p, 'kg');
  if (!s.length) return null;
  const toBmi = (kg: number) => Math.round((kg / ((h / 100) ** 2)) * 10) / 10;
  return { first: toBmi(s[0].val), latest: toBmi(s[s.length - 1].val) };
}

export interface BmiCurrentRow {
  person: Person;
  bmi: number;
  category: string;
  healthy: boolean;
}

/** "Best" BMI = closest to the healthy mid — not lowest, not highest. */
export function rankByBmiCurrent(people: Person[]): BmiCurrentRow[] {
  const rows = people
    .map((p) => {
      const b = bmiPoints(p);
      if (!b) return null;
      return {
        person: p,
        bmi: b.latest,
        category: bmiCategory(b.latest),
        healthy: b.latest >= 18.5 && b.latest < 25,
      };
    })
    .filter((r): r is BmiCurrentRow => r !== null);
  rows.sort(
    (a, b) => Math.abs(a.bmi - HEALTHY_BMI_MID) - Math.abs(b.bmi - HEALTHY_BMI_MID),
  );
  return rows;
}

export interface BmiProgressRow {
  person: Person;
  from: number;
  to: number;
  improvement: number; // how much CLOSER to the healthy band you got (+ = good)
}

export function rankByBmiProgress(people: Person[]): BmiProgressRow[] {
  const rows = people
    .map((p) => {
      const b = bmiPoints(p);
      if (!b || b.first === b.latest) return null;
      const improvement =
        Math.round(
          (Math.abs(b.first - HEALTHY_BMI_MID) - Math.abs(b.latest - HEALTHY_BMI_MID)) * 10,
        ) / 10;
      return { person: p, from: b.first, to: b.latest, improvement };
    })
    .filter((r): r is BmiProgressRow => r !== null);
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

/**
 * Feed highlights come from body metrics EXCEPT kg — "heaviest/lightest ever"
 * is not an achievement (cut vs bulk goals differ); fat/visceral/muscle/water
 * have an unambiguous good direction.
 */
const FEED_METRICS = METRICS.filter((m) => m.category === 'body' && m.key !== 'kg');

function threshold(m: MetricDef): number {
  if (m.key === 'visceralFat') return 0.5;
  return 0.3;
}

const arrow = (lowerBetter: boolean, delta: number) =>
  (lowerBetter ? delta < 0 : delta > 0) ? '↓' : '↑';

/**
 * Who currently holds #1 on each body metric → gold "leader" badges.
 * Computed WITHIN each gender (fair), and only when the group has at least
 * two people — being #1 in a group of one is not a crown.
 */
function computeLeaders(people: Person[]): Record<string, Highlight[]> {
  const out: Record<string, Highlight[]> = {};
  const bothGenders = new Set(people.map((p) => p.gender)).size > 1;
  for (const g of ['M', 'F'] as const) {
    const group = people.filter((p) => p.gender === g);
    if (group.length < 2) continue;
    for (const m of FEED_METRICS) {
      const ranked = rankByCurrent(group, m.key);
      if (ranked.length < 2) continue;
      const leader = ranked[0].person.name;
      const suffix = bothGenders ? (g === 'M' ? ' ♂' : ' ♀') : '';
      (out[leader] ||= []).push({
        kind: 'leader',
        metric: m.key,
        label: m.label,
        icon: m.icon,
        text: `Lider ${m.label}${suffix}`,
      });
    }
  }
  return out;
}

/**
 * Build the feed: one card per notable entry. Always includes each person's
 * latest entry (recent activity + leader badges), plus any historical entry
 * that set a personal record or made real progress. Sorted newest-first.
 * Records/progress are vs YOUR OWN history — inherently gender-fair.
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
