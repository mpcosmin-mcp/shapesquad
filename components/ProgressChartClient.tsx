'use client';

import { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Person, MetricKey, densifyTimeSeries } from '@/lib/shape';

const METRICS_META: Record<string, { label: string; unit: string; color: string }> = {
  kg: { label: 'Greutate', unit: 'kg', color: 'var(--bronze)' },
  bodyFat: { label: 'Body Fat', unit: '%', color: 'var(--rose)' },
  talie: { label: 'Talie', unit: 'cm', color: 'var(--cyan)' },
  muscle: { label: 'Muscle', unit: '%', color: 'var(--emerald)' },
};

export default function ProgressChartClient({ person, color }: { person: Person; color: string }) {
  const [metric, setMetric] = useState<MetricKey>('kg');
  const meta = { ...METRICS_META[metric], color: metric === 'kg' ? color : METRICS_META[metric].color };

  const raw = person.entries
    .filter((e) => e[metric] != null)
    .map((e) => ({ date: e.date as string, val: e[metric] as number }));
  const data = useMemo(() => densifyTimeSeries(raw), [JSON.stringify(raw)]);

  return (
    <div className="h-full panel p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2 shrink-0">
        <div>
          <div className="label">📈 Progres în timp</div>
          <div className="font-display text-base font-bold mt-0.5">{meta.label}</div>
        </div>
        <div className="flex gap-1 flex-wrap">
          {(['kg', 'bodyFat', 'talie', 'muscle'] as MetricKey[]).map((k) => {
            const m = METRICS_META[k];
            const active = metric === k;
            return (
              <button
                key={k}
                onClick={() => setMetric(k)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                style={
                  active
                    ? { background: `${m.color}22`, color: m.color, boxShadow: `inset 0 0 0 1px ${m.color}44` }
                    : { background: 'var(--card)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }
                }
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {data.length < 2 ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
          <p className="font-display italic text-fg-muted text-sm">
            Ai nevoie de minim 2 check-in-uri pentru trend.
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id={`g-${metric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={meta.color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={meta.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--fg-muted)', fontSize: 10, fontWeight: 600 }}
                interval="preserveStartEnd"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--fg-muted)', fontSize: 10, fontWeight: 600 }}
                domain={['auto', 'auto']}
                width={32}
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
                labelStyle={{ color: 'var(--fg-muted)', fontWeight: 600, marginBottom: 4 }}
                itemStyle={{ color: 'var(--fg)' }}
                formatter={(v: any) => [`${Number(v).toFixed(1)} ${meta.unit}`, meta.label]}
              />
              <Area
                type="monotone"
                dataKey="val"
                stroke={meta.color}
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
                      fill={meta.color}
                      stroke="var(--bg)"
                      strokeWidth={2}
                    />
                  );
                }}
                activeDot={{ r: 6, stroke: 'var(--bg)', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
