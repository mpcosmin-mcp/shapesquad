import { useState, useMemo } from 'react';
import { Entry, Person, METRICS, MetricKey, fmt, PERSON_COLORS } from '../../lib/shape';

interface Props { entries: Entry[]; people: Person[]; }

export default function HistoryPage({ entries, people }: Props) {
  const [filter, setFilter] = useState('');
  const names = useMemo(() => [...new Set(entries.map(e => e.name))], [entries]);

  const filtered = useMemo(() => {
    let r = [...entries].sort((a, b) => b.date.localeCompare(a.date));
    if (filter) r = r.filter(e => e.name === filter);
    return r;
  }, [entries, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setFilter('')}
          className={`chip cursor-pointer text-[11px] font-bold ${!filter ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400'}`}>
          All ({entries.length})
        </button>
        {names.map((n, i) => (
          <button key={n} onClick={() => setFilter(n === filter ? '' : n)}
            className={`chip cursor-pointer text-[11px] font-bold flex items-center gap-1.5 ${
              filter === n ? 'bg-blue-600/20 text-blue-300' : 'bg-white/5 text-slate-400'
            }`}>
            <span className="w-4 h-4 rounded-md flex items-center justify-center text-[8px] text-white font-black"
              style={{ background: PERSON_COLORS[i % PERSON_COLORS.length] }}>{n[0]}</span>
            {n}
          </button>
        ))}
      </div>

      <div className="glass rounded-[var(--r-lg)] p-4 overflow-x-auto">
        <table className="lb-table">
          <thead>
            <tr>
              <th>Name</th><th>Date</th>
              {METRICS.map(m => <th key={m.key}>{m.icon} {m.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, idx) => (
              <tr key={`${e.name}-${e.date}-${idx}`}>
                <td>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] text-white font-black"
                      style={{ background: PERSON_COLORS[names.indexOf(e.name) % PERSON_COLORS.length] }}>{e.name[0]}</div>
                    <span className="text-xs font-bold" style={{ fontFamily: 'Montserrat' }}>{e.name}</span>
                  </div>
                </td>
                <td className="text-xs font-medium" style={{ fontFamily: 'Montserrat', color: 'var(--text2)' }}>
                  {new Date(e.date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: '2-digit' })}
                </td>
                {METRICS.map(m => {
                  const val = e[m.key as MetricKey] as number | null;
                  return <td key={m.key}>{fmt(val)}{val != null && m.unit ? <span className="text-[10px] text-slate-600 ml-0.5">{m.unit}</span> : null}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-slate-600 text-sm font-bold">No data.</div>}
      </div>
    </div>
  );
}
