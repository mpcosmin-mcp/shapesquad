'use client';

import { Entry } from '@/lib/shape';

interface Props {
  entries: Entry[];
  /** Number of weeks to display, ending at this week. Default 12. */
  weeks?: number;
}

/**
 * GitHub-contributions-style strip of weekly activity.
 * Each cell = 1 week. Brighter = more logs that week.
 */
export default function ActivityStrip({ entries, weeks = 12 }: Props) {
  const now = new Date();
  // Start of this week (Monday at 00:00)
  const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Monday
  const thisMondayMs = now.setHours(0, 0, 0, 0) - dayOfWeek * 86400000;

  const buckets: { weekStart: number; count: number; label: string }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = thisMondayMs - i * 7 * 86400000;
    const we = ws + 7 * 86400000;
    const count = entries.filter((e) => {
      const t = new Date(e.date).getTime();
      return t >= ws && t < we;
    }).length;
    const labelDate = new Date(ws);
    const label = labelDate.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
    buckets.push({ weekStart: ws, count, label });
  }

  const maxCount = Math.max(1, ...buckets.map((b) => b.count));
  const totalLogs = buckets.reduce((s, b) => s + b.count, 0);
  const activeWeeks = buckets.filter((b) => b.count > 0).length;

  function intensity(count: number): { bg: string; opacity: number } {
    if (count === 0) return { bg: 'var(--border)', opacity: 1 };
    const ratio = count / maxCount;
    if (ratio >= 0.75) return { bg: 'var(--good)', opacity: 1 };
    if (ratio >= 0.5) return { bg: 'var(--good)', opacity: 0.7 };
    if (ratio >= 0.25) return { bg: 'var(--good)', opacity: 0.45 };
    return { bg: 'var(--good)', opacity: 0.25 };
  }

  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between mb-3">
        <span className="label">Activitate · ultimele {weeks} săptămâni</span>
        <span className="text-[10px] text-fg-muted font-mono tabular-nums">
          {totalLogs} log{totalLogs !== 1 ? 's' : ''} · {activeWeeks}/{weeks} săptămâni active
        </span>
      </div>
      <div className="flex items-end gap-1">
        {buckets.map((b, i) => {
          const { bg, opacity } = intensity(b.count);
          return (
            <div
              key={i}
              className="flex-1 rounded-sm transition-all hover:scale-110"
              style={{
                height: 24,
                background: bg,
                opacity,
                minWidth: 6,
              }}
              title={`${b.label}: ${b.count} log${b.count !== 1 ? 's' : ''}`}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-2 text-[9px] text-fg-faint font-mono">
        <span>{buckets[0].label}</span>
        <div className="flex items-center gap-1">
          <span>mai puțin</span>
          {[0.25, 0.45, 0.7, 1].map((op) => (
            <div
              key={op}
              className="rounded-sm"
              style={{ width: 8, height: 8, background: 'var(--good)', opacity: op }}
            />
          ))}
          <span>mai mult</span>
        </div>
        <span>azi</span>
      </div>
    </div>
  );
}
