import { useMemo } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy, Pizza, Coffee, TrendingUp, Star, Zap, Target, Flame } from 'lucide-react';
import { Person, MetricKey, delta, fmt, PERSON_COLORS } from '../../lib/shape';
import { getAdjective } from '../../App';

interface Props { people: Person[]; allPeople: Person[]; gender: string; }

export default function SquadPage({ people, allPeople, gender }: Props) {
  const stats = useMemo(() => {
    const bfs = people.map(p => p.latest.bodyFat).filter((v): v is number => v != null);
    const kgs = people.map(p => p.latest.kg).filter((v): v is number => v != null);
    const total = people.reduce((s, p) => s + p.entries.length, 0);
    return {
      avgBf: bfs.length ? (bfs.reduce((a, b) => a + b, 0) / bfs.length) : null,
      avgKg: kgs.length ? (kgs.reduce((a, b) => a + b, 0) / kgs.length) : null,
      count: people.length, total,
    };
  }, [people]);

  // Awards
  const awards = useMemo(() => {
    const withBf = people.filter(p => p.latest.bodyFat != null);
    const byBf = [...withBf].sort((a, b) => (a.latest.bodyFat ?? 99) - (b.latest.bodyFat ?? 99));
    const byCount = [...people].sort((a, b) => b.entries.length - a.entries.length);

    let progressive: Person | null = null, bestDrop = 0;
    people.filter(p => p.entries.length > 1).forEach(p => {
      const f = p.entries[0].bodyFat, l = p.latest.bodyFat;
      if (f != null && l != null && f - l > bestDrop) { bestDrop = f - l; progressive = p; }
    });

    return [
      { title: 'Belly Boss', sub: 'Enjoys life to the fullest', icon: Pizza, color: 'var(--neon-orange)',
        person: byBf.length ? byBf[byBf.length - 1] : null, stat: byBf.length ? `${byBf[byBf.length-1].latest.bodyFat?.toFixed(1)}% BF` : '' },
      { title: 'Pure Talent', sub: 'Born fit, stays fit', icon: Star, color: 'var(--neon-yellow)',
        person: byBf[0] || null, stat: byBf.length ? `${byBf[0].latest.bodyFat?.toFixed(1)}% BF` : '' },
      { title: 'The Progressive', sub: 'Biggest transformation', icon: TrendingUp, color: 'var(--neon-green)',
        person: progressive, stat: progressive ? `-${bestDrop.toFixed(1)}% BF` : '' },
      { title: 'Streak Master', sub: 'Never misses a weigh-in', icon: Flame, color: 'var(--neon-purple)',
        person: byCount[0] || null, stat: byCount.length ? `${byCount[0].entries.length} measurements` : '' },
    ];
  }, [people]);

  // Trend data (group entries by date)
  const trendData = useMemo(() => {
    const dateMap = new Map<string, number[]>();
    people.forEach(p => p.entries.forEach(e => {
      if (e.bodyFat != null) {
        const arr = dateMap.get(e.date) || [];
        arr.push(e.bodyFat);
        dateMap.set(e.date, arr);
      }
    }));
    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({
        date: new Date(date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }),
        avgBf: vals.reduce((a, b) => a + b, 0) / vals.length,
        count: vals.length,
      }));
  }, [people]);

  // BF ranking
  const ranking = useMemo(() =>
    [...people].filter(p => p.latest.bodyFat != null)
      .sort((a, b) => (a.latest.bodyFat ?? 99) - (b.latest.bodyFat ?? 99)),
  [people]);

  const genderColor = gender === 'F' ? 'var(--neon-pink)' : 'var(--neon-blue)';

  return (
    <div className="space-y-6">
      {/* ═══ AWARDS ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {awards.map((a, i) => (
          <div key={a.title} className={`glass rounded-[var(--r-lg)] p-5 relative overflow-hidden trading-card anim-fade d${i+1}`}>
            <div className="accent-strip" style={{ background: a.color }} />
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full opacity-[0.06]" style={{ background: a.color }} />
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${a.color}20` }}>
                <a.icon className="w-5 h-5" style={{ color: a.color }} />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">🏆 {a.title}</span>
            </div>
            {a.person ? (
              <>
                <div className="text-xl font-black text-white mb-0.5">{a.person.name}</div>
                <div className="text-xs font-bold" style={{ color: a.color }}>{a.stat}</div>
                <div className="text-[10px] text-slate-500 mt-1">{a.sub}</div>
              </>
            ) : (
              <div className="text-sm text-slate-500">No data yet</div>
            )}
          </div>
        ))}
      </div>

      {/* ═══ CHART + STATS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Chart */}
        <div className="lg:col-span-8 glass rounded-[var(--r-lg)] p-6 anim-fade d5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-white">Squad Body Fat Trend</h3>
              <p className="text-xs text-slate-500 font-medium">Average BF% over time</p>
            </div>
            <span className="chip font-mono text-[10px]" style={{ background: `${genderColor}15`, color: genderColor }}>
              {gender === 'all' ? 'Everyone' : gender === 'M' ? 'Bărbați' : 'Femei'}
            </span>
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="bfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={gender === 'F' ? '#ec4899' : '#3b82f6'} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={gender === 'F' ? '#ec4899' : '#3b82f6'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 16, color: '#fff', fontFamily: 'JetBrains Mono', fontSize: 12 }}
                  formatter={(v: number) => [`${v.toFixed(1)}%`, 'Avg BF']}
                />
                <Area type="monotone" dataKey="avgBf"
                  stroke={gender === 'F' ? '#ec4899' : '#3b82f6'} strokeWidth={3}
                  fill="url(#bfGrad)" activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} />
                <XAxis dataKey="date" axisLine={false} tickLine={false}
                  tick={{ fill: '#475569', fontSize: 10, fontWeight: 700, fontFamily: 'Montserrat' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick stats */}
        <div className="lg:col-span-4 glass rounded-[var(--r-lg)] p-6 anim-fade d6 flex flex-col justify-between">
          <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-400" /> Squad Stats
          </h3>
          <div className="space-y-4 flex-1">
            <QuickStat label="Members" value={String(stats.count)} color="var(--neon-blue)" />
            <QuickStat label="Avg Weight" value={`${fmt(stats.avgKg, 0)} kg`} color="var(--neon-green)" />
            <QuickStat label="Avg Body Fat" value={`${fmt(stats.avgBf, 1)}%`} color="var(--neon-orange)" />
            <QuickStat label="Total Measurements" value={String(stats.total)} color="var(--neon-purple)" />
          </div>
        </div>
      </div>

      {/* ═══ LEADERBOARD TABLE ═══ */}
      <div className="anim-fade d7">
        <h2 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" /> Clasament Body Fat
        </h2>
        <div className="glass rounded-[var(--r-lg)] overflow-hidden">
          <table className="lb-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Legendă</th>
                <th>Titlu Onorific</th>
                <th>BF%</th>
                <th>Greutate</th>
                <th>Evoluție</th>
                <th>Măsurători</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((p, i) => {
                const ci = allPeople.indexOf(p);
                const color = PERSON_COLORS[ci % PERSON_COLORS.length];
                const bf = p.latest.bodyFat!;
                const firstBf = p.entries[0].bodyFat;
                const d = firstBf != null ? bf - firstBf : null;
                const adj = getAdjective(p.name, allPeople);
                return (
                  <tr key={p.name} className={`anim-slide d${Math.min(i+1, 9)}`}>
                    <td>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${
                        i === 0 ? 'bg-yellow-400/20 text-yellow-400' :
                        i === 1 ? 'bg-slate-300/10 text-slate-300' :
                        i === 2 ? 'bg-orange-400/10 text-orange-400' :
                        'bg-white/5 text-slate-500'
                      }`}>
                        {i === 0 ? '👑' : i + 1}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-black text-white"
                          style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}>
                          {p.name[0]}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{p.name}</div>
                          <div className="text-[10px] text-slate-500 font-medium">{p.gender === 'F' ? '♀' : '♂'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="chip text-[10px]" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text2)' }}>
                        {adj}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-24">
                          <div className="progress-track">
                            <div className="progress-fill" style={{
                              width: `${Math.min(100, (bf / 40) * 100)}%`,
                              background: bf < 22 ? 'var(--neon-green)' : bf < 30 ? 'var(--neon-orange)' : 'var(--neon-red)',
                            }} />
                          </div>
                        </div>
                        <span className="font-mono text-sm font-black">{bf.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td>
                      <span className="font-mono text-sm">{fmt(p.latest.kg)} kg</span>
                    </td>
                    <td>
                      {d != null ? (
                        <span className={`font-mono font-black text-sm flex items-center gap-1 ${d < 0 ? 'text-[var(--neon-green)]' : d > 0 ? 'text-[var(--neon-red)]' : 'text-slate-500'}`}>
                          {d < 0 ? '↓' : d > 0 ? '↑' : '—'} {Math.abs(d).toFixed(1)}%
                        </span>
                      ) : <span className="text-slate-600 text-xs">—</span>}
                    </td>
                    <td>
                      <span className="font-mono text-xs text-slate-400">{p.entries.length}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function QuickStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      <span className="font-mono text-lg font-black" style={{ color }}>{value}</span>
    </div>
  );
}
