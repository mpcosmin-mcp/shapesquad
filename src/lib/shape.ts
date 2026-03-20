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

// ── API ────────────────────────────────────────────────
export const API = 'https://script.google.com/macros/s/AKfycbxqEkxY93XwuKtu1daSqSj_4EsILuaLGVJzoLpPEaBIKcqsLIcgSoCzk5_VeTsDNOAg/exec';

export async function fetchAllData(): Promise<Entry[]> {
  if (!API) return DEMO_DATA;
  return new Promise((resolve) => {
    const cb = `__ss_${Date.now()}`;
    (window as any)[cb] = (data: any) => {
      delete (window as any)[cb];
      document.getElementById(cb)?.remove();
      resolve(parseRows(data));
    };
    const s = document.createElement('script');
    s.id = cb;
    s.src = `${API}?callback=${cb}`;
    s.onerror = () => resolve(DEMO_DATA);
    document.body.appendChild(s);
    setTimeout(() => { if ((window as any)[cb]) { delete (window as any)[cb]; resolve(DEMO_DATA); } }, 8000);
  });
}

export async function submitEntry(entry: Record<string, any>): Promise<boolean> {
  if (!API) return false;
  try {
    await fetch(API, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
    return true;
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

// ── Demo Data ──────────────────────────────────────────
const DEMO_DATA: Entry[] = [
  { name: 'Adina', date: '2025-08-20', kg: 56, bodyFat: 25.1, visceralFat: 6, muscle: null, water: null, gender: 'F', biceps: 26, spate: 82, piept: 88, talie: 70, fesieri: 96 },
  { name: 'Adina', date: '2025-11-27', kg: 55.6, bodyFat: 24.5, visceralFat: 5, muscle: null, water: null, gender: 'F', biceps: 25.5, spate: 81, piept: 87, talie: 69, fesieri: 95 },
  { name: 'Adina', date: '2026-01-21', kg: 56.9, bodyFat: 24.5, visceralFat: 5, muscle: 71.2, water: 59.6, gender: 'F', biceps: 26, spate: 82, piept: 88, talie: 69.5, fesieri: 96 },
  { name: 'Cosmin', date: '2025-08-20', kg: 80, bodyFat: 20.2, visceralFat: 8, muscle: null, water: null, gender: 'M', biceps: 34, spate: 106, piept: 100, talie: 86, fesieri: 102 },
  { name: 'Cosmin', date: '2025-11-27', kg: 79, bodyFat: 19.5, visceralFat: 7, muscle: null, water: null, gender: 'M', biceps: 34.5, spate: 105, piept: 99, talie: 84, fesieri: 101 },
  { name: 'Cosmin', date: '2026-01-21', kg: 79.8, bodyFat: 19.8, visceralFat: 7, muscle: 74.6, water: 60.0, gender: 'M', biceps: 35, spate: 106, piept: 100, talie: 85, fesieri: 101 },
];
