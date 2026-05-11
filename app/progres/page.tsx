'use client';

import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useShapeData } from '@/lib/useShapeData';
import { PERSON_COLORS, densifyTimeSeries, MetricKey } from '@/lib/shape';

const METRICS: { key: MetricKey; label: string; unit: string }[] = [
  { key: 'kg', label: 'Greutate', unit: 'kg' },
  { key: 'bodyFat', label: 'Body Fat', unit: '%' },
  { key: 'talie', label: 'Talie', unit: 'cm' },
  { key: 'muscle', label: 'Masă musculară', unit: '%' },
];

export default function ProgresPage() {
  const { loading, people } = useShapeData();
  const [metric, setMetric] = useState<MetricKey>('bodyFat');
  const [visible, setVisible] = useState<Set<string>>(new Set());

  // Build per-person time series, then merge into single dataset by date
  const merged = useMemo(() => {
    if (people.length === 0) return [];
    const peoplePoints = people.map((p) => {
      const raw = p.entries.filter((e) => e[metric] != null).map((e) => ({ date: e.date, val: e[metric] as number }));
      return { name: p.name, points: densifyTimeSeries(raw) };
    });

    const allDates = Array.from(new Set(peoplePoints.flatMap((pp) => pp.points.map((p) => p.isoDate)))).sort();
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
      if (n.size === 0) {
        people.forEach((p) => n.add(p.name));
      }
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });
  }

  if (loading) return <div className="h-full flex items-center justify-center text-sm text-slate-400">Loading...</div>;

  return (
    <div className="h-full flex flex-col gap-3">
      {/* ═══ HEADER + METRIC TABS ═══ */}
      <div className="shrink-0 flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-black text-base">📈 Progres echipa</h1>
        <div className="flex gap-1 flex-wrap">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                metric === m.key ? 'bg-white/10 text-white' : 'bg-white/[0.02] text-slate-400 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ CHART ═══ */}
      <div className="flex-1 min-h-0 glass rounded-2xl p-3 flex flex-col">
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={merged} margin={{ top: 10, right: 12, left: 0, bottom: 10 }}>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }}
                tickFormatter={(d: string) =>
                  new Date(d).toLocaleDateString('ro-RO', { month: 'short', day: 'numeric' })
                }
                minTickGap={40}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }}
                domain={['auto', 'auto']}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,23,42,0.95)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  fontSize: '11px',
                }}
                labelStyle={{ color: '#94a3b8' }}
                labelFormatter={(d: any) => new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: '2-digit' })}
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
                    activeDot={{ r: 4, stroke: '#fff', strokeWidth: 1.5 }}
                    connectNulls
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Person toggles */}
        <div className="shrink-0 mt-2 flex gap-1 flex-wrap h-scroll pb-1">
          {people.map((p, i) => {
            const color = PERSON_COLORS[i % PERSON_COLORS.length];
            const on = activeVisible.has(p.name);
            return (
              <button
                key={p.name}
                onClick={() => toggle(p.name)}
                className={`chip text-[10px] font-black shrink-0 transition-all ${on ? '' : 'opacity-30'}`}
                style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
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
