/* Shared utilities — class merger + date helpers. */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind-aware className merger. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Local YYYY-MM-DD without timezone shenanigans */
export function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Current month key YYYY-MM */
export function thisMonthKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Extract YYYY-MM from an ISO date */
export function monthOf(iso: string): string {
  return (iso || '').slice(0, 7);
}

const MONTHS_RO = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec'];
const MONTHS_RO_LOW = MONTHS_RO.map((m) => m.toLowerCase());
const DAYS_RO_SHORT = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];

/** "21 Apr 2026" */
export function fmtDate(d: string): string {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${parseInt(day)} ${MONTHS_RO[parseInt(m) - 1]} ${y}`;
}

/** "luni · 21 apr" — short, lowercase, IT vibe */
export function fmtDateShort(d: string): string {
  if (!d) return '';
  const date = new Date(d + 'T12:00:00');
  const days = ['dum', 'lun', 'mar', 'mie', 'joi', 'vin', 'sâm'];
  return `${days[date.getDay()]} · ${date.getDate()} ${MONTHS_RO_LOW[date.getMonth()]}`;
}

/** "Apr 2026" — month-year display (for monthly cadence) */
export function fmtMonth(monthKey: string): string {
  if (!monthKey || monthKey.length < 7) return '';
  const [y, m] = monthKey.split('-');
  return `${MONTHS_RO[parseInt(m) - 1]} ${y}`;
}

/**
 * Romanian-correct count label for measurements.
 * 1 → "1 măsurătoare", 2–19 → "N măsurători", 20+ → "N de măsurători".
 */
export function masuratori(n: number): string {
  if (n === 1) return '1 măsurătoare';
  if (n >= 20) return `${n} de măsurători`;
  return `${n} măsurători`;
}

/** Re-export for legibility in components */
export { MONTHS_RO, MONTHS_RO_LOW, DAYS_RO_SHORT };
