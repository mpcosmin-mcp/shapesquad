export interface Activity {
  id: string;
  name: string;
  emoji: string;
  day: number; // 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri
  startTime: string;
  endTime: string;
  capacity: number;
  color: string;
}

export const ARIA_SCHEDULE: Activity[] = [
  { id: 'trx-mon',     name: 'TRX',             emoji: '🏋️', day: 0, startTime: '17:00', endTime: '18:00', capacity: 22, color: '#f59e0b' },
  { id: 'trx-thu',     name: 'TRX',             emoji: '🏋️', day: 3, startTime: '17:00', endTime: '18:00', capacity: 22, color: '#f59e0b' },
  { id: 'cycling-mon', name: 'Indoor Cycling',  emoji: '🚴', day: 0, startTime: '17:00', endTime: '18:00', capacity: 22, color: '#3b82f6' },
  { id: 'cycling-wed', name: 'Indoor Cycling',  emoji: '🚴', day: 2, startTime: '17:00', endTime: '18:00', capacity: 22, color: '#3b82f6' },
  { id: 'aqua-wed',    name: 'Aqua Gym',        emoji: '🏊', day: 2, startTime: '07:00', endTime: '08:00', capacity: 22, color: '#06b6d4' },
  { id: 'cross-tue',   name: 'Cross Training',  emoji: '⚡', day: 1, startTime: '17:00', endTime: '18:00', capacity: 25, color: '#22c55e' },
  { id: 'cross-fri',   name: 'Cross Training',  emoji: '⚡', day: 4, startTime: '16:00', endTime: '17:00', capacity: 25, color: '#22c55e' },
];

export const RO_DAYS = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri'] as const;
export const RO_DAYS_SHORT = ['Lun', 'Mar', 'Mie', 'Joi', 'Vin'] as const;
const RO_MONTHS = [
  'Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie',
  'Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie',
] as const;

export function bookingKey(activityId: string, date: string): string {
  return `${activityId}:${date}`;
}

export function getActivitiesForDay(dayIndex: number): Activity[] {
  return ARIA_SCHEDULE.filter((a) => a.day === dayIndex);
}

export function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return fmt(d);
}

export function getWeekDates(mondayStr: string): string[] {
  const mon = parse(mondayStr);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return fmt(d);
  });
}

export function addWeeks(mondayStr: string, n: number): string {
  const d = parse(mondayStr);
  d.setDate(d.getDate() + n * 7);
  return fmt(d);
}

export function formatWeekRange(mondayStr: string): string {
  const mon = parse(mondayStr);
  const fri = new Date(mon);
  fri.setDate(mon.getDate() + 4);
  const mMonth = RO_MONTHS[mon.getMonth()];
  const fMonth = RO_MONTHS[fri.getMonth()];
  const year = fri.getFullYear();
  if (mon.getMonth() === fri.getMonth()) {
    return `${mon.getDate()}-${fri.getDate()} ${mMonth} ${year}`;
  }
  return `${mon.getDate()} ${mMonth.slice(0, 3)} - ${fri.getDate()} ${fMonth.slice(0, 3)} ${year}`;
}

export function isToday(dateStr: string): boolean {
  return dateStr === fmt(new Date());
}

export function isPast(dateStr: string): boolean {
  return dateStr < fmt(new Date());
}

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parse(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
