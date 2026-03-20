import { useState, useMemo } from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Person, METRICS, MetricKey, delta, deltaColor, fmt, PERSON_COLORS } from '../../lib/shape';
import { getAdjective } from '../../App';

interface Props { people: Person[]; allPeople: Person[]; }

export default function ComparePage({ people, allPeople }: Props) {
  const [sel, setSel] = useState<string[]>(people.slice(0, 2).map(p => p.name));
  const compared = people.filter(p => sel.includes(p.name));

  const toggle = (name: string) => {
    setSel(s => s.includes(name) ? (s.length > 1 ? s.filter(n => n !== name) : s) : [...s, name]);
  };

  // Radar data
  const radarData = useMemo(() => {
    const keys: MetricKey[] = ['bodyFat', 'muscle', 'water', 'biceps', 'piept', 'talie', 'fesieri'];
    const ranges = keys.map(k => {
      const vals = allPeople.flatMap(p => { const v = p.latest[k] as number | null; return v != null ? [v] : []; });
      return vals.length ? { min: Math.min(...vals), max: Math.max(...vals) } : { min: 0, max: 100 };
    });
    return keys.map((k, i) => {
      const row: any = { metric: METRICS.find(m => m.key === k)!.label };
      compared.forEach(p => {
        const v = p.latest[k] as number | null;
        if (v == null) { row[p.name] = 0; return; }
        const { min, max } = ranges[i];
        row[p.name] = max === min ? 50 : ((v - min) / (max - min)) * 100;
      });
      return row;
    });
  }, [allPeople, compared]);

  return (
    <div className="space-y-4">
      {/* Person selector */}
      <div className="flex flex-wrap gap-1.5">
        {people.map((p, i) => {
          const active = sel.includes(p.name);
          const ci = allPeople.indexOf(p);
          return (
            <button key={p.name} onClick={() => toggle(p.name)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                active ? 'border-blue-500/40 bg-blue-600/20 text-blue-300' : 'border-transparent bg-white/5 text-slate-500 hover:bg-white/10'
              }`}>
              <span className="w-5 h-5 rounded-lg flex items-center justify-center text-[9px] text-white font-black"
                style={{ background: PERSON_COLORS[ci % PERSON_COLORS.length] }}>{p.name[0]}</span>
              {p.name}
            </button>
          );
        })}
      </div>

      {/* Radar */}
      <div className="glass rounded-[var(--r-lg)] p-6 anim-fade">
        <h3 className="font-black text-sm mb-4">⚔️ Body Profile Radar</h3>
        <div className="chart-fluid" style={{ height: 350 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <RadarChart data={radarData}>
              <defs>
                <filter id="radarGlow">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <PolarGrid stroke="rgba(255,255,255,0.06)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 12, fontFamily: 'JetBrains Mono', fontSize: 11 }} />
              {compared.map(p => {
                const ci = allPeople.indexOf(p);
                const color = PERSON_COLORS[ci % PERSON_COLORS.length];
                return <Radar key={p.name} name={p.name} dataKey={p.name}
                  stroke={color} fill={color} fillOpacity={0.12} strokeWidth={2}
                  style={{ filter: 'url(#radarGlow)' }} />;
              })}
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3 mt-3 justify-center">
          {compared.map(p => (
            <div key={p.name} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: PERSON_COLORS[allPeople.indexOf(p) % PERSON_COLORS.length] }} />
              <span className="text-xs text-slate-400 font-bold">{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Head to head */}
      <div className="glass rounded-[var(--r-lg)] p-4 overflow-x-auto anim-fade d2">
        <h3 className="font-black text-sm mb-3">📊 Head to Head</h3>
        <table className="lb-table">
          <thead>
            <tr>
              <th>Metric</th>
              {compared.map(p => {
                const ci = allPeople.indexOf(p);
                return (
                  <th key={p.name}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-lg flex items-center justify-center text-[8px] text-white font-black"
                        style={{ background: PERSON_COLORS[ci % PERSON_COLORS.length] }}>{p.name[0]}</div>
                      {p.name}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {METRICS.map(m => {
              const vals = compared.map(p => p.latest[m.key as MetricKey] as number | null);
              const valid = vals.filter((v): v is number => v != null);
              const best = valid.length > 1 ? (m.lowerBetter ? Math.min(...valid) : Math.max(...valid)) : null;
              return (
                <tr key={m.key}>
                  <td>
                    <span className="mr-1.5">{m.icon}</span>
                    <span className="text-xs font-bold" style={{ fontFamily: 'Montserrat' }}>{m.label}</span>
                  </td>
                  {compared.map(p => {
                    const val = p.latest[m.key as MetricKey] as number | null;
                    const prev = p.previous?.[m.key as MetricKey] as number | null;
                    const d = delta(val, prev);
                    const isBest = val != null && val === best;
                    return (
                      <td key={p.name}>
                        <span className={`font-mono text-sm ${isBest ? 'font-black' : ''}`}
                          style={{ color: isBest ? 'var(--neon-green)' : 'var(--text)' }}>
                          {fmt(val)}{m.unit && <span className="text-[10px] text-slate-500 ml-0.5">{m.unit}</span>}
                        </span>
                        {isBest && <span className="ml-1 text-[10px]">👑</span>}
                        {d != null && (
                          <span className="font-mono text-[10px] ml-1.5" style={{ color: deltaColor(d, m.lowerBetter) }}>
                            {d > 0 ? '+' : ''}{d.toFixed(1)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
