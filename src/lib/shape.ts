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

// ── Overall Score ─────────────────────────────────────
const REF_HEIGHT = { M: 175, F: 162 }; // cm, Romania avg

export interface ScoreBreakdown {
  total: number;
  bf: number;
  progress: number;
  bmi: number;
  consistency: number;
  muscle: number;
}

export function calcOverallScore(p: Person, maxEntries: number): ScoreBreakdown {
  const g = p.gender;
  const l = p.latest;

  // 1. BF Score (0-100) — how close to ideal range
  //    M ideal: 12-20%  F ideal: 20-28%  midpoint = perfect
  const bfIdeal = g === 'M' ? { lo: 12, hi: 20 } : { lo: 20, hi: 28 };
  const bfMid = (bfIdeal.lo + bfIdeal.hi) / 2;
  let bf = 0;
  if (l.bodyFat != null) {
    const dist = Math.abs(l.bodyFat - bfMid);
    const halfRange = (bfIdeal.hi - bfIdeal.lo) / 2;
    // Inside ideal range = 80-100, outside degrades
    bf = l.bodyFat >= bfIdeal.lo && l.bodyFat <= bfIdeal.hi
      ? 80 + 20 * (1 - dist / halfRange)
      : Math.max(0, 80 - (dist - halfRange) * 4);
  }

  // 2. Progress Score (0-100) — BF% improvement first → last
  let progress = 50; // neutral if no change or single entry
  if (p.entries.length > 1 && p.first.bodyFat != null && l.bodyFat != null) {
    const drop = p.first.bodyFat - l.bodyFat; // positive = good
    // +5% drop = 100, 0 = 50, -5% = 0
    progress = Math.max(0, Math.min(100, 50 + drop * 10));
  }

  // 3. BMI Score (0-100) — how close to ideal BMI (22)
  const h = REF_HEIGHT[g] / 100;
  let bmi = 50;
  if (l.kg != null) {
    const bmiVal = l.kg / (h * h);
    const bmiDist = Math.abs(bmiVal - 22);
    // 0 dist = 100, 8+ dist = 0
    bmi = Math.max(0, 100 - bmiDist * 12.5);
  }

  // 4. Consistency Score (0-100) — entries relative to max
  const consistency = maxEntries > 0
    ? Math.min(100, (p.entries.length / maxEntries) * 100)
    : 50;

  // 5. Muscle Score (0-100) — higher is better
  //    M ideal: 70-80%  F ideal: 60-70%
  const musIdeal = g === 'M' ? { lo: 70, hi: 80 } : { lo: 60, hi: 70 };
  let muscle = 50; // neutral if no data
  if (l.muscle != null) {
    if (l.muscle >= musIdeal.lo) {
      muscle = Math.min(100, 80 + ((l.muscle - musIdeal.lo) / (musIdeal.hi - musIdeal.lo)) * 20);
    } else {
      muscle = Math.max(0, 80 - (musIdeal.lo - l.muscle) * 5);
    }
  }

  // Weighted total
  const total = Math.round(
    bf * 0.30 + progress * 0.25 + bmi * 0.20 + consistency * 0.15 + muscle * 0.10
  );

  return {
    total: Math.max(0, Math.min(100, total)),
    bf: Math.round(bf),
    progress: Math.round(progress),
    bmi: Math.round(bmi),
    consistency: Math.round(consistency),
    muscle: Math.round(muscle),
  };
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
