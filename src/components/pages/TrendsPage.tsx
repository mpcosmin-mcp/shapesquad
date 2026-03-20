import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Person, METRICS, MetricKey, PERSON_COLORS } from '../../lib/shape';

interface Props { people: Person[]; allPeople: Person[]; activePerson: string; }

export default function TrendsPage({ people, allPeople, activePerson }: Props) {
  const [metric, setMetric] = useState<MetricKey>('kg');
  const [mode, setMode] = useState<'me' | 'all'>('me');
  const meta = METRICS.find(m => m.key === metric)!;

  const shown = mode === 'me' ? allPeople.filter(p => p.name === activePerson) : people;

  const chartData = useMemo(() => {
    const dateSet = new Set<string>();
    shown.forEach(p => p.entries.forEach(e => dateSet.add(e.date)));
    const dates = Array.from(dateSet).sort();
    const result = dates.map(d => {
      const row: any = { date: new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }) };
      shown.forEach(p => {
        const e = p.entries.find(e => e.date === d);
        row[p.name] = e ? (e[metric] as number | null) : null;
      });
      return row;
    });
    return result;
  }, [shown, metric]);

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center gap-3">
        <div className="gender-toggle">
          <button className={`gender-btn ${mode === 'me' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400'}`}
            onClick={() => setMode('me')}>My Trends</button>
          <button className={`gender-btn ${mode === 'all' ? 'bg-white/10 text-white' : 'text-slate-400'}`}
            onClick={() => setMode('all')}>Everyone</button>
        </div>
        {mode === 'me' && <span className="chip bg-blue-600/20 text-blue-300 text-xs font-bold">{activePerson}</span>}
      </div>

      {/* Metric pills */}
      <div className="flex flex-wrap gap-1.5">
        {METRICS.map(m => (
          <button key={m.key} onClick={() => setMetric(m.key)}
            className={`chip cursor-pointer transition-all text-[11px] font-bold ${
              metric === m.key ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}>
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="glass rounded-[var(--r-lg)] p-6 anim-fade">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-lg">{meta.icon}</span>
          <h2 className="font-black text-lg">{meta.label}</h2>
          {meta.unit && <span className="chip bg-white/5 text-slate-400 font-mono text-[10px]">{meta.unit}</span>}
        </div>
        <div className="chart-fluid" style={{ height: 360 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <LineChart data={chartData}>
              <defs>
                <filter id="lineGlow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 16, fontFamily: 'JetBrains Mono', fontSize: 12 }} />
              {mode === 'all' && <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Montserrat', fontWeight: 700 }} />}
              <XAxis dataKey="date" axisLine={false} tickLine={false}
                tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} />
              <YAxis axisLine={false} tickLine={false}
                tick={{ fill: '#475569', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
              {shown.map((p) => {
                const ci = allPeople.indexOf(p);
                const color = PERSON_COLORS[ci % PERSON_COLORS.length];
                return (
                  <Line key={p.name} type="monotone" dataKey={p.name}
                    stroke={color} strokeWidth={mode === 'me' ? 3 : 2}
                    dot={{ fill: color, r: mode === 'me' ? 5 : 3 }}
                    activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2, filter: 'url(#lineGlow)' }}
                    connectNulls />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick stats if me mode */}
      {mode === 'me' && (() => {
        const p = allPeople.find(x => x.name === activePerson);
        if (!p || p.entries.length < 2) return null;
        const vals = p.entries.map(e => e[metric] as number | null).filter((v): v is number => v != null);
        if (vals.length < 2) return null;
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { l: 'Start', v: vals[0] }, { l: 'Current', v: vals[vals.length-1], accent: true },
              { l: 'Min', v: Math.min(...vals) }, { l: 'Max', v: Math.max(...vals) },
            ].map(s => (
              <div key={s.l} className="glass rounded-[var(--r)] p-3 text-center">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">{s.l}</div>
                <div className={`font-mono text-lg font-black ${s.accent ? 'text-[var(--neon-green)]' : 'text-white'}`}>{s.v.toFixed(1)}</div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
