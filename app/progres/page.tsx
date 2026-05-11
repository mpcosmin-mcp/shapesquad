'use client';

import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useShapeData } from '@/lib/useShapeData';
import { PERSON_COLORS, densifyTimeSeries, MetricKey } from '@/lib/shape';

const METRICS: { key: MetricKey; label: string; unit: string }[] = [
  { key: 'kg', label: 'Greutate', unit: 'kg' },
  { key: 'bodyFat', label: 'Body Fat', unit: '%' },
  { key: 'talie', label: 'Talie', unit: 'cm' },
  { key: 'muscle', label: 'Muscle', unit: '%' },
];

export default function ProgresPage() {
  const { loading, people } = useShapeData();
  const [metric, setMetric] = useState<MetricKey>('bodyFat');
  const [visible, setVisible] = useState<Set<string>>(new Set());

  const merged = useMemo(() => {
    if (people.length === 0) return [];
    const peoplePoints = people.map((p) => {
      const raw = p.entries
        .filter((e) => e[metric] != null)
        .map((e) => ({ date: e.date, val: e[metric] as number }));
      return { name: p.name, points: densifyTimeSeries(raw) };
    });

    const allDates = Array.from(
      new Set(peoplePoints.flatMap((pp) => pp.points.map((p) => p.isoDate)))
    ).sort();
    return allDates.map((iso) => {
      const row: Record<string, any> = { date: iso };
      peoplePoints.forEach(({ name, points }) => {
        const found = points.find((p) => p.isoDate === iso);
        if (found) row[name] = found.val;
      });
      return row;
    });
  }, [people, metric]);

  const activeVisible = useMemo(() => {
    if (visible.size === 0) return new Set(people.map((p) => p.name));
    return visible;
  }, [visible, people]);

  function toggle(name: string) {
    setVisible((s) => {
      const n = new Set(s);
      if (n.size === 0) people.forEach((p) => n.add(p.name));
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-fg-dim font-display italic">
        Citesc...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="shrink-0 flex items-center justify-between flex-wrap gap-2 anim-fade">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-bold tracking-tight text-fg">
            Progres echipa
          </h1>
          <p className="text-[11px] text-fg-muted mt-0.5">
            Click pe nume jos ca să filtrezi · click pe chart pentru detalii
          </p>
        </div>
        <div className="flex gap-1 flex-wrap">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                metric === m.key
                  ? 'bg-bronze text-white shadow-glow-bronze'
                  : 'bg-card border border-border text-fg-muted hover:text-fg hover:border-border-strong'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 panel p-4 flex flex-col anim-fade d1">
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={merged} margin={{ top: 10, right: 12, left: 0, bottom: 10 }}>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--fg-muted)', fontSize: 10, fontWeight: 600 }}
                tickFormatter={(d: string) =>
                  new Date(d).toLocaleDateString('ro-RO', { month: 'short', day: 'numeric' })
                }
                minTickGap={40}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--fg-muted)', fontSize: 10, fontWeight: 600 }}
                domain={['auto', 'auto']}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  fontSize: '11px',
                  padding: '8px 12px',
                  boxShadow: 'var(--shadow-panel-lifted)',
                }}
                labelStyle={{ color: 'var(--fg-muted)' }}
                itemStyle={{ color: 'var(--fg)' }}
                labelFormatter={(d: any) =>
                  new Date(d).toLocaleDateString('ro-RO', {
                    day: 'numeric',
                    month: 'short',
                    year: '2-digit',
                  })
                }
              />
              {people.map((p, i) => {
                const color = PERSON_COLORS[i % PERSON_COLORS.length];
                if (!activeVisible.has(p.name)) return null;
                return (
                  <Line
                    key={p.name}
                    type="monotone"
                    dataKey={p.name}
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5, stroke: 'var(--bg)', strokeWidth: 2 }}
                    connectNulls
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="shrink-0 mt-3 flex gap-1.5 flex-wrap h-scroll pb-1">
          {people.map((p, i) => {
            const color = PERSON_COLORS[i % PERSON_COLORS.length];
            const on = activeVisible.has(p.name);
            return (
              <button
                key={p.name}
                onClick={() => toggle(p.name)}
                className={`chip shrink-0 transition-all ${on ? '' : 'opacity-30 grayscale'}`}
                style={{
                  background: `${color}1f`,
                  color,
                  border: `1px solid ${color}44`,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                {p.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
