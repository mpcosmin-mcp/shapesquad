'use client';

import { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Person, MetricKey, densifyTimeSeries } from '@/lib/shape';

export default function ProgressChartClient({ person, color }: { person: Person; color: string }) {
  const [metric, setMetric] = useState<MetricKey>('kg');
  const meta: Record<string, { label: string; unit: string; color: string }> = {
    kg: { label: 'Greutate', unit: 'kg', color },
    bodyFat: { label: 'Body Fat %', unit: '%', color: '#ff3b3b' },
    talie: { label: 'Talie', unit: 'cm', color: '#22d3ee' },
    muscle: { label: 'Masă musculară', unit: '%', color: '#00ff88' },
  };

  const raw = person.entries
    .filter((e) => e[metric] != null)
    .map((e) => ({ date: e.date as string, val: e[metric] as number }));
  const data = useMemo(() => densifyTimeSeries(raw), [JSON.stringify(raw)]);
  const m = meta[metric];

  return (
    <div className="h-full glass rounded-2xl p-4 flex flex-col anim-fade">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2 shrink-0">
        <h3 className="font-black text-sm">📈 Progres — {m.label}</h3>
        <div className="flex gap-1 flex-wrap">
          {(['kg', 'bodyFat', 'talie', 'muscle'] as MetricKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setMetric(k)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all`}
              style={metric === k ? { background: `${meta[k].color}20`, color: meta[k].color } : { background: 'rgba(255,255,255,0.03)', color: '#94a3b8' }}
            >
              {meta[k].label}
            </button>
          ))}
        </div>
      </div>

      {data.length < 2 ? (
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <p className="text-[11px] text-slate-500">Ai nevoie de minim 2 check-in-uri pentru trend.</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id={`g-${metric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={m.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={m.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }}
                interval="preserveStartEnd"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }}
                domain={['auto', 'auto']}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,23,42,0.95)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  fontSize: '11px',
                }}
                labelStyle={{ color: '#94a3b8', fontWeight: 700 }}
                formatter={(v: any) => [`${Number(v).toFixed(1)} ${m.unit}`, m.label]}
              />
              <Area
                type="monotone"
                dataKey="val"
                stroke={m.color}
                strokeWidth={2.5}
                fill={`url(#g-${metric})`}
                dot={(props: any) => {
                  const pt = data[props.index];
                  if (!pt?.isReal) return <circle key={props.index} r={0} />;
                  return (
                    <circle
                      key={props.index}
                      cx={props.cx}
                      cy={props.cy}
                      r={4}
                      fill={m.color}
                      stroke="#0f172a"
                      strokeWidth={2}
                    />
                  );
                }}
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
