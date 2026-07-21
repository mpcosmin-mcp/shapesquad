// ── Types ──────────────────────────────────────────────
export interface Entry {
  name: string;
  date: string;
  kg: number | null;
  bodyFat: number | null;
  visceralFat: number | null;
  muscle: number | null;
  water: number | null;
  gender: 'M' | 'F';
  biceps: number | null;
  spate: number | null;
  piept: number | null;
  talie: number | null;
  fesieri: number | null;
}

export interface Person {
  name: string;
  gender: 'M' | 'F';
  entries: Entry[];
  latest: Entry;
  first: Entry;
  previous: Entry | null;
}

// ── Admins ─────────────────────────────────────────────
// Single source of truth. Admins can log measurements for anyone and see the
// Log entry point. Keyed off the LOGGED-IN identity (who you are), never the
// active/viewed person. Case-sensitive — must match the Sheet's `Nume` column.
export const ADMIN_NAMES = ['Petrica', 'Cosmin'];
export const isAdminName = (name: string | null | undefined): boolean =>
  !!name && ADMIN_NAMES.includes(name);

// ── API ────────────────────────────────────────────────
export const API = 'https://script.google.com/macros/s/AKfycbxqEkxY93XwuKtu1daSqSj_4EsILuaLGVJzoLpPEaBIKcqsLIcgSoCzk5_VeTsDNOAg/exec';

/**
 * Fetch all measurement data via our own /api/data server route.
 * The route does server-side fetch of Apps Script (no JSONP/CORS issues,
 * no 8s artificial timeout) and caches at the edge for 60s.
 *
 * Returns DEMO_DATA only as a last resort if the server route is unreachable
 * AND we have no useful response.
 */
export async function fetchAllData(): Promise<Entry[]> {
  try {
    const res = await fetch('/api/data', { cache: 'no-store' });
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.warn('[shapesquad] /api/data returned', res.status);
      return DEMO_DATA;
    }
    const data = await res.json();
    const rows = parseRows(data);
    if (rows.length === 0) {
      // eslint-disable-next-line no-console
      console.warn('[shapesquad] /api/data returned 0 rows; falling back to DEMO_DATA');
      return DEMO_DATA;
    }
    return rows;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[shapesquad] /api/data fetch threw; falling back to DEMO_DATA', e);
    return DEMO_DATA;
  }
}

/** True when the data shape looks identical to the local DEMO_DATA fallback. */
export function isDemoData(entries: Entry[]): boolean {
  if (entries.length !== DEMO_DATA.length) return false;
  const names = new Set(entries.map((e) => e.name));
  if (names.size !== 2) return false;
  return names.has('Adina') && names.has('Cosmin');
}

/**
 * Verify the log password server-side (never compared in the browser).
 * Returns true only on a 200 from /api/log/verify.
 */
export async function verifyLogPassword(password: string): Promise<boolean> {
  try {
    const res = await fetch('/api/log/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    return res.ok;
  } catch { return false; }
}

/**
 * Write one measurement row. The password is re-verified server-side in
 * /api/submit and stripped before the payload reaches Sheets.
 */
export async function submitEntry(
  entry: Record<string, any>,
  password: string,
): Promise<boolean> {
  try {
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...entry, password }),
    });
    return res.ok;
  } catch { return false; }
}

function parseRows(data: any): Entry[] {
  if (!data?.data) return [];
  return data.data.map((r: any) => ({
    name: (r['Nume'] || r['Name'] || '').trim(),
    date: parseDate(r['Date'] || ''),
    kg: num(r['Kg']),
    bodyFat: num(r['Body Fat %'], true),
    visceralFat: num(r['Visceral Fat']),
    muscle: num(r['Muscle'], true),
    water: num(r['Water'], true),
    gender: (r['Gender'] || 'M').toUpperCase() === 'F' ? 'F' as const : 'M' as const,
    biceps: num(r['Biceps']),
    spate: num(r['Spate']),
    piept: num(r['Piept']),
    talie: num(r['Talie']),
    fesieri: num(r['Fesieri']),
  })).filter((e: Entry) => e.name && e.date);
}

function num(v: any, isPercent = false): number | null {
  if (v == null || v === '') return null;
  const s = String(v).replace('%', '').replace(',', '.').trim();
  let n = parseFloat(s);
  if (isNaN(n)) return null;
  if (isPercent && n > 0 && n < 1) n = n * 100;
  return Math.round(n * 100) / 100;
}

function parseDate(v: string): string {
  if (!v) return '';
  const s = String(v);
  // M/D/YYYY
  const parts = s.split('/');
  if (parts.length === 3) {
    const [m, d, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Already ISO
  if (s.includes('-')) return s.slice(0, 10);
  return '';
}

// ── Grouping ───────────────────────────────────────────
export function groupByPerson(entries: Entry[]): Person[] {
  const map = new Map<string, Entry[]>();
  entries.forEach((e) => {
    const arr = map.get(e.name) || [];
    arr.push(e);
    map.set(e.name, arr);
  });
  return Array.from(map.entries()).map(([name, ents]) => {
    const sorted = ents.sort((a, b) => a.date.localeCompare(b.date));
    return {
      name,
      gender: sorted[sorted.length - 1].gender,
      entries: sorted,
      latest: sorted[sorted.length - 1],
      first: sorted[0],
      previous: sorted.length > 1 ? sorted[sorted.length - 2] : null,
    };
  });
}

// ── Metric Definitions ─────────────────────────────────
export type MetricKey = 'kg' | 'bodyFat' | 'visceralFat' | 'muscle' | 'water' | 'biceps' | 'spate' | 'piept' | 'talie' | 'fesieri';

export interface MetricDef {
  key: MetricKey;
  label: string;
  shortLabel: string;
  unit: string;
  icon: string;
  lowerBetter?: boolean;
  category: 'body' | 'measurement';
}

export const METRICS: MetricDef[] = [
  { key: 'kg', label: 'Greutate', shortLabel: 'Weight', unit: 'kg', icon: '⚖️', category: 'body' },
  { key: 'bodyFat', label: 'Body Fat', shortLabel: 'BF%', unit: '%', icon: '🔥', lowerBetter: true, category: 'body' },
  { key: 'visceralFat', label: 'Visceral Fat', shortLabel: 'Visc.', unit: '', icon: '🫀', lowerBetter: true, category: 'body' },
  { key: 'muscle', label: 'Masă Musculară', shortLabel: 'Muscle', unit: '%', icon: '💪', category: 'body' },
  { key: 'water', label: 'Apă', shortLabel: 'Water', unit: '%', icon: '💧', category: 'body' },
  { key: 'biceps', label: 'Biceps', shortLabel: 'Biceps', unit: 'cm', icon: '💪', category: 'measurement' },
  { key: 'spate', label: 'Spate', shortLabel: 'Back', unit: 'cm', icon: '🔙', category: 'measurement' },
  { key: 'piept', label: 'Piept', shortLabel: 'Chest', unit: 'cm', icon: '🫁', category: 'measurement' },
  { key: 'talie', label: 'Talie', shortLabel: 'Waist', unit: 'cm', icon: '📏', lowerBetter: true, category: 'measurement' },
  { key: 'fesieri', label: 'Fesieri', shortLabel: 'Hips', unit: 'cm', icon: '🍑', category: 'measurement' },
];

// ── Helpers ─────────────────────────────────────────────
export function d(curr: number | null, prev: number | null): number | null {
  if (curr == null || prev == null) return null;
  return Math.round((curr - prev) * 100) / 100;
}

export function dPct(curr: number | null, prev: number | null): number | null {
  if (curr == null || prev == null || prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 10000) / 100;
}

export function dColor(val: number | null, lowerBetter = false): string {
  if (val == null || val === 0) return 'var(--text3)';
  const good = lowerBetter ? val < 0 : val > 0;
  return good ? 'var(--accent)' : 'var(--red)';
}

export function f(v: number | null, dec = 1): string {
  if (v == null) return '—';
  return v.toFixed(dec);
}

export function fDate(iso: string): string {
  if (!iso) return '—';
  const dt = new Date(iso);
  return dt.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: '2-digit' });
}

// ── Daily Interpolation ──────────────────────────────
/** Densify sparse data into daily points via linear interpolation.
 *  Input: array of { date: ISO string, val: number }.
 *  Output: daily points between first and last date.
 *  Real measurements are marked with `isReal: true`. */
export interface DensePoint {
  date: string;      // display date "15 ian."
  isoDate: string;   // "2026-01-15"
  val: number;
  isReal: boolean;
}

export function densifyTimeSeries(
  entries: { date: string; val: number }[]
): DensePoint[] {
  if (entries.length === 0) return [];
  if (entries.length === 1) {
    const dt = new Date(entries[0].date);
    return [{
      date: dt.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }),
      isoDate: entries[0].date,
      val: entries[0].val,
      isReal: true,
    }];
  }

  // Sort by date
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const result: DensePoint[] = [];
  const DAY = 86400000;

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const tA = new Date(a.date).getTime();
    const tB = new Date(b.date).getTime();
    const days = Math.round((tB - tA) / DAY);

    for (let d = 0; d < days; d++) {
      const t = d / days; // 0..1
      const ts = tA + d * DAY;
      const dt = new Date(ts);
      const iso = dt.toISOString().slice(0, 10);
      result.push({
        date: dt.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }),
        isoDate: iso,
        val: Math.round((a.val + (b.val - a.val) * t) * 100) / 100,
        isReal: d === 0,
      });
    }
  }

  // Add last point
  const last = sorted[sorted.length - 1];
  const lastDt = new Date(last.date);
  result.push({
    date: lastDt.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }),
    isoDate: last.date,
    val: last.val,
    isReal: true,
  });

  return result;
}

/** Densify multi-person chart data (for SquadPage avg BF trend) */
export function densifyAvgSeries(
  dateValPairs: { date: string; avgBf: number }[]
): (DensePoint & { avgBf: number })[] {
  const dense = densifyTimeSeries(
    dateValPairs.map(p => ({ date: p.date, val: p.avgBf }))
  );
  return dense.map(p => ({ ...p, avgBf: p.val }));
}

// ── Overall Score (6.0 – 10.0) ────────────────────────
// Designed for regular people, not athletes.
// BF 25% for men is perfectly fine. Consistency is king.
const REF_HEIGHT = { M: 175, F: 162 }; // cm, Romania avg

export interface ScoreBreakdown {
  total: number;   // 6.0 – 10.0
  bf: number;      // 6.0 – 10.0
  progress: number;
  bmi: number;
  consistency: number;
  muscle: number;
}

/** Maps an internal 0–100 value to 6.0–10.0 with one decimal */
function toGrade(internal: number): number {
  return Math.round((6 + Math.max(0, Math.min(100, internal)) * 0.04) * 10) / 10;
}

export function calcOverallScore(p: Person, maxEntries: number): ScoreBreakdown {
  const g = p.gender;
  const l = p.latest;

  // 1. BF Score — generous ranges for normal people
  //    M: 10-26% is great zone (25% perfectly OK), F: 18-34%
  //    midpoint = perfect 10, outside degrades gently
  const bfOk = g === 'M' ? { lo: 10, hi: 26 } : { lo: 18, hi: 34 };
  const bfMid = (bfOk.lo + bfOk.hi) / 2;
  let bf = 60; // decent default if no data
  if (l.bodyFat != null) {
    if (l.bodyFat >= bfOk.lo && l.bodyFat <= bfOk.hi) {
      // Inside OK zone → 70–100
      const dist = Math.abs(l.bodyFat - bfMid);
      const halfRange = (bfOk.hi - bfOk.lo) / 2;
      bf = 70 + 30 * (1 - dist / halfRange);
    } else {
      // Outside OK zone → degrades gently (2 pts per %)
      const overshoot = l.bodyFat < bfOk.lo
        ? bfOk.lo - l.bodyFat
        : l.bodyFat - bfOk.hi;
      bf = Math.max(20, 70 - overshoot * 2);
    }
  }

  // 2. Progress — any improvement counts, stagnation is neutral not bad
  let progress = 65; // neutral = decent
  if (p.entries.length > 1 && p.first.bodyFat != null && l.bodyFat != null) {
    const drop = p.first.bodyFat - l.bodyFat; // positive = good
    // +3% drop = 100, 0 = 65, -3% = 30
    progress = Math.max(20, Math.min(100, 65 + drop * (35 / 3)));
  }

  // 3. BMI — wider healthy range (20-28 is fine for regular people)
  const h = REF_HEIGHT[g] / 100;
  let bmi = 60;
  if (l.kg != null) {
    const bmiVal = l.kg / (h * h);
    if (bmiVal >= 20 && bmiVal <= 28) {
      // Inside healthy range → 75–100
      const ideal = 24;
      const dist = Math.abs(bmiVal - ideal);
      bmi = 75 + 25 * (1 - dist / 4);
    } else {
      const overshoot = bmiVal < 20 ? 20 - bmiVal : bmiVal - 28;
      bmi = Math.max(20, 75 - overshoot * 5);
    }
  }

  // 4. Consistency — most important for regular people!
  //    Even 2 entries is good. Reward showing up.
  let consistency = 50;
  if (maxEntries > 0) {
    const ratio = p.entries.length / maxEntries;
    // 1 entry = 40, 50% of max = 75, 100% = 100
    consistency = Math.min(100, 30 + ratio * 70);
  }
  // Bonus: minimum 60 if they have 3+ entries (they're trying!)
  if (p.entries.length >= 3) consistency = Math.max(consistency, 60);
  if (p.entries.length >= 5) consistency = Math.max(consistency, 75);

  // 5. Muscle — generous, no data = neutral not penalized
  //    M: 35%+ is great (normal people!), F: 28%+ is great
  const musGood = g === 'M' ? 35 : 28;
  let muscle = 65; // no data = decent
  if (l.muscle != null) {
    if (l.muscle >= musGood) {
      muscle = Math.min(100, 75 + (l.muscle - musGood) * 0.8);
    } else {
      muscle = Math.max(30, 75 - (musGood - l.muscle) * 2);
    }
  }

  // Weighted total (internal 0-100)
  const raw = bf * 0.25 + progress * 0.20 + bmi * 0.15 + consistency * 0.25 + muscle * 0.15;

  return {
    total: toGrade(raw),
    bf: toGrade(bf),
    progress: toGrade(progress),
    bmi: toGrade(bmi),
    consistency: toGrade(consistency),
    muscle: toGrade(muscle),
  };
}

// ── Pattern Recognition ──────────────────────────────
export function getPersonInsight(p: Person): { text: string; emoji: string; tone: 'good' | 'neutral' | 'warn' } {
  const ents = p.entries;
  const l = p.latest;
  const first = p.first;
  const n = ents.length;

  // Trend helpers
  const bfDrop = (first.bodyFat != null && l.bodyFat != null) ? first.bodyFat - l.bodyFat : null;
  const kgDelta = (first.kg != null && l.kg != null) ? l.kg - first.kg : null;
  const musDelta = (n > 1 && first.muscle != null && l.muscle != null) ? l.muscle - first.muscle : null;

  // Recent momentum: compare last 2 entries if available
  const prev = p.previous;
  const recentBfDelta = (prev?.bodyFat != null && l.bodyFat != null) ? l.bodyFat - prev.bodyFat : null;
  const recentKgDelta = (prev?.kg != null && l.kg != null) ? l.kg - prev.kg : null;

  // BF zones
  const bfIdeal = p.gender === 'M' ? { lo: 12, hi: 20 } : { lo: 20, hi: 28 };
  const bfInZone = l.bodyFat != null && l.bodyFat >= bfIdeal.lo && l.bodyFat <= bfIdeal.hi;

  // Only 1 entry
  if (n === 1) {
    if (bfInZone) return { text: 'Punct de start solid — în zona ideală de BF%.', emoji: '🎯', tone: 'good' };
    return { text: 'Prima măsurătoare înregistrată. Drumul abia începe!', emoji: '🚀', tone: 'neutral' };
  }

  // Strong consistent BF drop
  if (bfDrop != null && bfDrop > 3) {
    if (recentBfDelta != null && recentBfDelta < -0.5)
      return { text: `BF scade constant (−${bfDrop.toFixed(1)}%). Formă excelentă, keep going!`, emoji: '🔥', tone: 'good' };
    return { text: `−${bfDrop.toFixed(1)}% body fat de la start. Progres serios!`, emoji: '💪', tone: 'good' };
  }

  // Moderate BF drop
  if (bfDrop != null && bfDrop > 1) {
    if (musDelta != null && musDelta > 0.5)
      return { text: `BF scade (−${bfDrop.toFixed(1)}%) și masă musculară crește (+${musDelta.toFixed(1)}%). Recompoziție!`, emoji: '⚡', tone: 'good' };
    return { text: `Trend descendent pe BF (−${bfDrop.toFixed(1)}%). Pe drumul cel bun.`, emoji: '📉', tone: 'good' };
  }

  // BF plateau but muscle gain
  if (bfDrop != null && Math.abs(bfDrop) < 1 && musDelta != null && musDelta > 0.5) {
    return { text: `BF stabil, dar masă musculară +${musDelta.toFixed(1)}%. Recompoziție lentă.`, emoji: '🧬', tone: 'good' };
  }

  // Weight loss with BF stagnation
  if (kgDelta != null && kgDelta < -2 && (bfDrop == null || bfDrop < 0.5)) {
    return { text: `Pierdere în greutate (${kgDelta.toFixed(1)} kg), dar BF% stagnează. Atenție la masă musculară!`, emoji: '⚠️', tone: 'warn' };
  }

  // BF going up
  if (bfDrop != null && bfDrop < -1) {
    if (recentBfDelta != null && recentBfDelta < 0)
      return { text: `BF a crescut recent (+${Math.abs(recentBfDelta).toFixed(1)}%). Moment de recalibrare.`, emoji: '🔄', tone: 'warn' };
    return { text: `BF a crescut de la start (+${Math.abs(bfDrop).toFixed(1)}%). Focus pe alimentație.`, emoji: '📋', tone: 'warn' };
  }

  // Recent positive momentum after plateau
  if (recentBfDelta != null && recentBfDelta < -0.5) {
    return { text: 'Momentum recent pozitiv — BF în scădere ultimul check-in!', emoji: '📈', tone: 'good' };
  }

  // Stable in ideal zone
  if (bfInZone) {
    return { text: `BF în zona ideală (${l.bodyFat!.toFixed(1)}%). Menținere excelentă!`, emoji: '✅', tone: 'good' };
  }

  // Consistent tracker
  if (n >= 4) {
    return { text: `${n} măsurători — consistență bună. Datele arată stabilitate.`, emoji: '📊', tone: 'neutral' };
  }

  // Default
  return { text: 'Colectează mai multe date pentru analiza trendului.', emoji: '📌', tone: 'neutral' };
}

// ── Simple XP System (RPG-style, no penalties) ────────
// XP per log = score × 10  (60-100 per log, based on quality)
// Total XP = entries × current_score × 10  (logs × quality)
// Level: every 100 XP = level up (linear, simple, RPG-style)
// You NEVER lose XP. No streak penalty, no decay. Skip a week? No problem.

export interface LevelTier { name: string; icon: string; color: string; minLevel: number; }
export const LEVEL_TIERS: LevelTier[] = [
  { name: 'Rookie', icon: '🌱', color: '#94a3b8', minLevel: 1 },
  { name: 'Regular', icon: '💪', color: '#3b82f6', minLevel: 5 },
  { name: 'Pro', icon: '🔥', color: '#f97316', minLevel: 10 },
  { name: 'Veteran', icon: '🏆', color: '#a855f7', minLevel: 20 },
  { name: 'Legend', icon: '👑', color: '#ffd700', minLevel: 50 },
];

export interface XPInfo {
  total: number;          // total XP accumulated
  level: number;          // current level (1+)
  xpInLevel: number;      // XP within current level (0-99)
  xpToNext: number;       // XP needed to reach next level
  perLog: number;         // XP awarded per log at current quality
  tier: LevelTier;        // tier label
  nextTier: LevelTier | null;  // next tier the user is climbing toward
}

export function getLevelTier(level: number): LevelTier {
  let t = LEVEL_TIERS[0];
  for (const tier of LEVEL_TIERS) if (level >= tier.minLevel) t = tier;
  return t;
}

export function getNextLevelTier(level: number): LevelTier | null {
  for (const tier of LEVEL_TIERS) if (level < tier.minLevel) return tier;
  return null;
}

export function calcXP(p: Person, maxEntries: number): XPInfo {
  const score = calcOverallScore(p, maxEntries);
  // XP per log = score × 10 (60-100 per log)
  const perLog = Math.round(score.total * 10);
  // Total = logs × quality (rewards both frequency AND quality)
  const total = p.entries.length * perLog;
  const level = Math.floor(total / 100) + 1;
  const xpInLevel = total % 100;
  const xpToNext = 100 - xpInLevel;
  return {
    total,
    level,
    xpInLevel,
    xpToNext,
    perLog,
    tier: getLevelTier(level),
    nextTier: getNextLevelTier(level),
  };
}

// ── Streak (kept for fun — not XP) ────────────────────
export interface StreakInfo {
  current: number;
  longest: number;
}

/** Count non-null measurement fields in an entry (max 10) */
export function countFilledFields(e: Entry): number {
  let c = 0;
  if (e.kg != null) c++;
  if (e.bodyFat != null) c++;
  if (e.visceralFat != null) c++;
  if (e.muscle != null) c++;
  if (e.water != null) c++;
  if (e.biceps != null) c++;
  if (e.spate != null) c++;
  if (e.piept != null) c++;
  if (e.talie != null) c++;
  if (e.fesieri != null) c++;
  return c;
}

export function calcStreak(p: Person): StreakInfo {
  // Get all YYYY-MM keys from entries
  const months = new Set(p.entries.map(e => e.date.slice(0, 7)));

  // Current streak: walk backwards from current month
  const now = new Date();
  let current = 0;
  let y = now.getFullYear();
  let m = now.getMonth(); // 0-indexed
  // Allow current month to not have entry yet — start from last month if needed
  const thisKey = `${y}-${String(m + 1).padStart(2, '0')}`;
  if (!months.has(thisKey)) {
    // Step back one month
    m--;
    if (m < 0) { m = 11; y--; }
  }
  for (let i = 0; i < 60; i++) { // max 5 years
    const key = `${y}-${String(m + 1).padStart(2, '0')}`;
    if (months.has(key)) {
      current++;
      m--;
      if (m < 0) { m = 11; y--; }
    } else {
      break;
    }
  }

  // Longest streak: scan all months from first to last entry
  let longest = 0;
  if (p.entries.length > 0) {
    const firstDate = new Date(p.first.date);
    const lastDate = new Date(p.latest.date);
    let streak = 0;
    let cy = firstDate.getFullYear();
    let cm = firstDate.getMonth();
    const endY = lastDate.getFullYear();
    const endM = lastDate.getMonth();
    while (cy < endY || (cy === endY && cm <= endM)) {
      const key = `${cy}-${String(cm + 1).padStart(2, '0')}`;
      if (months.has(key)) {
        streak++;
        longest = Math.max(longest, streak);
      } else {
        streak = 0;
      }
      cm++;
      if (cm > 11) { cm = 0; cy++; }
    }
  }

  return { current, longest: Math.max(longest, current) };
}

// ── Colors ─────────────────────────────────────────────
export const COLORS = [
  '#ff6b35', '#4ecdc4', '#ffe66d', '#f7fff7', '#6b5ce7',
  '#ff4d6a', '#2ec4b6', '#e8a87c', '#41b3a3', '#c38d9e',
  '#85dcba', '#e27d60',
];

// ── Aliases ───────────────────────────────────────────
export const delta = d;
export const deltaColor = dColor;
export const fmt = f;
export const PERSON_COLORS = COLORS;

// ════════════════════════════════════════════════════════════════════════════
// SLEEP-TRACKER-V2 PARITY — color/tier/status helpers for new dashboard.
// All additive. Existing exports above stay intact.
// ════════════════════════════════════════════════════════════════════════════

/** Identifier for a single measurement event across the team */
export function entryKeyOf(date: string, name: string): string {
  return `${date}_${name}`;
}

/** First name derived from "Full Name" — used in feed/leaderboard captions */
export function firstNameOf(name: string): string {
  return (name || '').split(/\s+/)[0] || name;
}

/** Tinted person color (alias for existing PERSON_COLORS picker, index-based) */
export function personColor(name: string, allNames: string[]): string {
  const idx = Math.max(0, allNames.indexOf(name));
  return COLORS[idx % COLORS.length];
}

/* ── Color scales — BINARY semantic: above target = green, below = red. ─── */

const C = {
  elite: '#10b981',
  good:  '#4ade80',
  under: '#f97316',
  bad:   '#ef4444',
  dim:   '#52525b',
} as const;

/** Weight color — neutral, hovers near user's reference (no global "good kg") */
export function kgColor(_kg: number | null): string {
  return 'var(--color-accent)';
}

/** Body Fat % — LOWER is better. Targets depend on gender. */
export function bfColor(bf: number | null, gender: 'M' | 'F'): string {
  if (bf == null) return C.dim;
  const t = gender === 'M' ? { elite: 12, good: 20, under: 26 } : { elite: 20, good: 28, under: 34 };
  if (bf < t.elite) return C.elite;
  if (bf <= t.good) return C.good;
  if (bf <= t.under) return C.under;
  return C.bad;
}

/** Muscle % — HIGHER is better. */
export function muscleColor(mus: number | null, gender: 'M' | 'F'): string {
  if (mus == null) return C.dim;
  const t = gender === 'M' ? { elite: 42, good: 35, under: 30 } : { elite: 32, good: 28, under: 24 };
  if (mus >= t.elite) return C.elite;
  if (mus >= t.good) return C.good;
  if (mus >= t.under) return C.under;
  return C.bad;
}

/** Visceral fat (1–30 scale) — LOWER is better. <10 normal, 10-14 high, ≥15 dangerous. */
export function visceralColor(vf: number | null): string {
  if (vf == null) return C.dim;
  if (vf <= 5) return C.elite;
  if (vf <= 9) return C.good;
  if (vf <= 14) return C.under;
  return C.bad;
}

/* ── Tier labels (for the bottom-of-metric chip) ── */

export function bfTier(bf: number | null, gender: 'M' | 'F'): { label: string; color: string } {
  if (bf == null) return { label: '—', color: C.dim };
  const t = gender === 'M' ? { elite: 12, good: 20, under: 26 } : { elite: 20, good: 28, under: 34 };
  if (bf < t.elite) return { label: 'Atletic', color: C.elite };
  if (bf <= t.good) return { label: 'Bun', color: C.good };
  if (bf <= t.under) return { label: 'Peste target', color: C.under };
  return { label: 'Ridicat', color: C.bad };
}

export function muscleTier(mus: number | null, gender: 'M' | 'F'): { label: string; color: string } {
  if (mus == null) return { label: '—', color: C.dim };
  const t = gender === 'M' ? { elite: 42, good: 35, under: 30 } : { elite: 32, good: 28, under: 24 };
  if (mus >= t.elite) return { label: 'Excelent', color: C.elite };
  if (mus >= t.good) return { label: 'Bun', color: C.good };
  if (mus >= t.under) return { label: 'Sub target', color: C.under };
  return { label: 'Slab', color: C.bad };
}

export function visceralTier(vf: number | null): { label: string; color: string } {
  if (vf == null) return { label: '—', color: C.dim };
  if (vf <= 5) return { label: 'Excelent', color: C.elite };
  if (vf <= 9) return { label: 'Normal', color: C.good };
  if (vf <= 14) return { label: 'Ridicat', color: C.under };
  return { label: 'Periculos', color: C.bad };
}

/** Generic "+N peste / -N sub target" indicator */
export interface MetricStatus {
  arrow: '↑' | '↓' | '→';
  label: string;
  color: string;
}

export function metricStatus(
  value: number | null,
  target: number,
  lowerBetter = false,
  unit = '',
): MetricStatus {
  if (value == null) return { arrow: '→', label: '—', color: C.dim };
  const delta = lowerBetter ? target - value : value - target;
  const onTarget = delta >= 0;
  const color = onTarget ? C.good : C.bad;
  if (Math.abs(delta) < 0.5) {
    return { arrow: '→', label: 'aproape de target', color };
  }
  const sign = delta > 0 ? '+' : '';
  const direction = delta > 0 ? '↑' : '↓';
  const word = onTarget ? 'peste target' : 'sub target';
  return { arrow: direction, label: `${sign}${delta.toFixed(1)}${unit} ${word}`, color };
}

/* ── Range filter — last N months from today ── */

export function lastNMonths(entries: Entry[], n: number, from: Date = new Date()): Entry[] {
  const cutoff = new Date(from);
  cutoff.setMonth(cutoff.getMonth() - n);
  const cutStr = cutoff.toISOString().slice(0, 10);
  return entries.filter((e) => e.date >= cutStr);
}

/* ── Aggregate per person within an entry slice (Leaderboard) ── */

export interface AggRow {
  name: string;
  gender: 'M' | 'F';
  kg: number | null;
  bodyFat: number | null;
  muscle: number | null;
  visceralFat: number | null;
  entries: number;
}

export function aggregateShape(entries: Entry[]): AggRow[] {
  const byName = new Map<
    string,
    { gender: 'M' | 'F'; kgSum: number; kgN: number; bfSum: number; bfN: number; mSum: number; mN: number; vSum: number; vN: number; n: number }
  >();
  for (const e of entries) {
    const cur =
      byName.get(e.name) ?? { gender: e.gender, kgSum: 0, kgN: 0, bfSum: 0, bfN: 0, mSum: 0, mN: 0, vSum: 0, vN: 0, n: 0 };
    cur.gender = e.gender;
    if (e.kg != null) { cur.kgSum += e.kg; cur.kgN++; }
    if (e.bodyFat != null) { cur.bfSum += e.bodyFat; cur.bfN++; }
    if (e.muscle != null) { cur.mSum += e.muscle; cur.mN++; }
    if (e.visceralFat != null) { cur.vSum += e.visceralFat; cur.vN++; }
    cur.n++;
    byName.set(e.name, cur);
  }
  const rows: AggRow[] = [];
  for (const [name, v] of byName) {
    rows.push({
      name,
      gender: v.gender,
      kg: v.kgN ? Math.round((v.kgSum / v.kgN) * 10) / 10 : null,
      bodyFat: v.bfN ? Math.round((v.bfSum / v.bfN) * 10) / 10 : null,
      muscle: v.mN ? Math.round((v.mSum / v.mN) * 10) / 10 : null,
      visceralFat: v.vN ? Math.round(v.vSum / v.vN) : null,
      entries: v.n,
    });
  }
  return rows;
}

/* ── Personal pattern observation (deterministic, no AI) ───────────────
 *
 * Sleep tracker exposes `personalTrendNote(entries, user)` returning a
 * short Romanian one-liner with tone (good/warn/neutral). We do the same
 * here based on BF / muscle / weight movement across recent measurements.
 */
export interface TrendNote {
  text: string;
  tone: 'good' | 'neutral' | 'warn';
}

export function personalTrendNote(p: Person): TrendNote | null {
  const mine = [...p.entries].sort((a, b) => a.date.localeCompare(b.date));
  if (mine.length < 2) return null;

  const last = mine[mine.length - 1];
  const prev = mine[mine.length - 2];

  // 1. Multi-entry BF trend (strongest signal)
  const bfList = mine.filter((e) => e.bodyFat != null).map((e) => e.bodyFat!);
  if (bfList.length >= 3) {
    const first = bfList[0];
    const lastBf = bfList[bfList.length - 1];
    const drop = first - lastBf;
    if (drop >= 2) return { text: `BF −${drop.toFixed(1)}% de la start · momentum solid`, tone: 'good' };
    if (drop <= -2) return { text: `BF +${Math.abs(drop).toFixed(1)}% de la start · recalibrare`, tone: 'warn' };
  }

  // 2. Recomposition — BF stable/down + muscle up
  if (last.muscle != null && prev.muscle != null) {
    const m = last.muscle - prev.muscle;
    const bDelta = last.bodyFat != null && prev.bodyFat != null ? last.bodyFat - prev.bodyFat : 0;
    if (m >= 0.5 && bDelta <= 0.3) return { text: `+${m.toFixed(1)}% masă musculară · recompoziție`, tone: 'good' };
    if (m <= -0.5) return { text: `${m.toFixed(1)}% masă musculară · atenție la macros`, tone: 'warn' };
  }

  // 3. Recent BF jump
  if (last.bodyFat != null && prev.bodyFat != null) {
    const bd = last.bodyFat - prev.bodyFat;
    if (bd <= -1) return { text: `−${Math.abs(bd).toFixed(1)}% BF vs ultima · keep going`, tone: 'good' };
    if (bd >= 1.5) return { text: `+${bd.toFixed(1)}% BF vs ultima · weekend gras?`, tone: 'warn' };
  }

  // 4. Visceral fat alarm
  if (last.visceralFat != null && last.visceralFat >= 15) {
    return { text: `visceral ${last.visceralFat} · zona periculoasă, consult medical`, tone: 'warn' };
  }

  // 5. Weight stable hint
  if (last.kg != null && prev.kg != null) {
    const w = last.kg - prev.kg;
    if (Math.abs(w) <= 0.3) return { text: `greutate stabilă · ${last.kg.toFixed(1)}kg`, tone: 'neutral' };
  }

  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// PERSONAL TREND HELPERS — no cross-user comparison, just direction vs self.
// ════════════════════════════════════════════════════════════════════════════

/** Δ vs the previous entry; null if < 2 entries or the field is missing. */
export function monthlyDelta(p: Person, key: MetricKey): number | null {
  const sorted = [...p.entries].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 2) return null;
  const last = sorted[sorted.length - 1][key];
  const prev = sorted[sorted.length - 2][key];
  if (last == null || prev == null) return null;
  return Math.round((last - prev) * 10) / 10;
}

export type ProgressStatus = 'progres' | 'stabil' | 'recalibrare';

/** Per-row status: did THIS entry move in the right direction vs the one before? */
export function rowProgressStatus(p: Person, entryIdx: number): ProgressStatus {
  const sorted = [...p.entries].sort((a, b) => a.date.localeCompare(b.date));
  if (entryIdx <= 0) return 'stabil';
  const curr = sorted[entryIdx];
  const prev = sorted[entryIdx - 1];
  return compareEntries(curr, prev);
}

/** Most recent move direction for the person — used in header summaries. */
export function progressStatus(p: Person): ProgressStatus {
  const sorted = [...p.entries].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 2) return 'stabil';
  return compareEntries(sorted[sorted.length - 1], sorted[sorted.length - 2]);
}

function compareEntries(curr: Entry, prev: Entry): ProgressStatus {
  let score = 0; // positive = better, negative = worse
  if (curr.bodyFat != null && prev.bodyFat != null) {
    const d = curr.bodyFat - prev.bodyFat;
    if (d <= -0.3) score++;
    else if (d >= 0.3) score--;
  }
  if (curr.muscle != null && prev.muscle != null) {
    const d = curr.muscle - prev.muscle;
    if (d >= 0.3) score++;
    else if (d <= -0.3) score--;
  }
  if (curr.visceralFat != null && prev.visceralFat != null) {
    const d = curr.visceralFat - prev.visceralFat;
    if (d <= -1) score++;
    else if (d >= 1) score--;
  }
  if (score > 0) return 'progres';
  if (score < 0) return 'recalibrare';
  return 'stabil';
}

/** Color a delta vs your own past — green for good direction, red otherwise. */
export function personalDeltaColor(delta: number | null, lowerBetter: boolean): string {
  if (delta == null) return '#52525b';
  if (Math.abs(delta) < 0.15) return 'var(--color-fg-muted)';
  const good = lowerBetter ? delta < 0 : delta > 0;
  return good ? 'var(--color-good)' : 'var(--color-bad)';
}

/** True if the person logged any entry whose date is in YYYY-MM. */
export function loggedInMonth(p: Person, monthKey: string): boolean {
  return p.entries.some((e) => e.date.startsWith(monthKey));
}

// ── Demo Data ──────────────────────────────────────────
const DEMO_DATA: Entry[] = [
  { name: 'Adina', date: '2025-08-20', kg: 56, bodyFat: 25.1, visceralFat: 6, muscle: null, water: null, gender: 'F', biceps: 26, spate: 82, piept: 88, talie: 70, fesieri: 96 },
  { name: 'Adina', date: '2025-11-27', kg: 55.6, bodyFat: 24.5, visceralFat: 5, muscle: null, water: null, gender: 'F', biceps: 25.5, spate: 81, piept: 87, talie: 69, fesieri: 95 },
  { name: 'Adina', date: '2026-01-21', kg: 56.9, bodyFat: 24.5, visceralFat: 5, muscle: 71.2, water: 59.6, gender: 'F', biceps: 26, spate: 82, piept: 88, talie: 69.5, fesieri: 96 },
  { name: 'Cosmin', date: '2025-08-20', kg: 80, bodyFat: 20.2, visceralFat: 8, muscle: null, water: null, gender: 'M', biceps: 34, spate: 106, piept: 100, talie: 86, fesieri: 102 },
  { name: 'Cosmin', date: '2025-11-27', kg: 79, bodyFat: 19.5, visceralFat: 7, muscle: null, water: null, gender: 'M', biceps: 34.5, spate: 105, piept: 99, talie: 84, fesieri: 101 },
  { name: 'Cosmin', date: '2026-01-21', kg: 79.8, bodyFat: 19.8, visceralFat: 7, muscle: 74.6, water: 60.0, gender: 'M', biceps: 35, spate: 106, piept: 100, talie: 85, fesieri: 101 },
];
