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

  // Fun facts generated from real data
  const funFacts = useMemo(() => {
    const facts: string[] = [];
    const totalKg = people.reduce((s, p) => s + (p.latest.kg ?? 0), 0);
    facts.push(`⚖️ Squad total weight: ${totalKg.toFixed(0)} kg — that's ${(totalKg / 80).toFixed(1)} average humans`);

    const heaviest = [...people].sort((a, b) => (b.latest.kg ?? 0) - (a.latest.kg ?? 0))[0];
    if (heaviest) facts.push(`🏋️ ${heaviest.name} carries the most mass at ${heaviest.latest.kg?.toFixed(1)} kg`);

    const mostEntries = [...people].sort((a, b) => b.entries.length - a.entries.length)[0];
    if (mostEntries) facts.push(`📊 ${mostEntries.name} is the data nerd with ${mostEntries.entries.length} measurements`);

    const leastEntries = [...people].sort((a, b) => a.entries.length - b.entries.length)[0];
    if (leastEntries && leastEntries.entries.length <= 2) facts.push(`🦥 ${leastEntries.name} showed up ${leastEntries.entries.length} time(s). Respect the commitment.`);

    const avgBfVal = stats.avgBf;
    if (avgBfVal != null) facts.push(`🔥 Squad average body fat: ${avgBfVal.toFixed(1)}% — ${avgBfVal < 25 ? 'looking athletic!' : 'room to grow!'}`);

    people.forEach(p => {
      if (p.entries.length > 1 && p.latest.kg != null && p.entries[0].kg != null) {
        const diff = p.latest.kg - p.entries[0].kg;
        if (Math.abs(diff) > 2) facts.push(`${diff < 0 ? '📉' : '📈'} ${p.name} ${diff < 0 ? 'dropped' : 'gained'} ${Math.abs(diff).toFixed(1)} kg since joining`);
      }
    });

    const femaleCount = people.filter(p => p.gender === 'F').length;
    const maleCount = people.filter(p => p.gender === 'M').length;
    facts.push(`👥 Squad ratio: ${maleCount} men vs ${femaleCount} women`);

    return facts;
  }, [people, stats]);

  // Per-person awards (everyone gets one)
  const personAwards = useMemo(() => {
    const result: { person: Person; title: string; emoji: string; color: string; stat: string }[] = [];
    const sorted = [...people].sort((a, b) => (a.latest.bodyFat ?? 99) - (b.latest.bodyFat ?? 99));
    const byCount = [...people].sort((a, b) => b.entries.length - a.entries.length);
    const byKg = [...people].sort((a, b) => (b.latest.kg ?? 0) - (a.latest.kg ?? 0));

    // Track assigned
    const assigned = new Set<string>();

    // Best BF
    if (sorted.length && sorted[0].latest.bodyFat != null) {
      result.push({ person: sorted[0], title: 'Pure Talent', emoji: '✨', color: 'var(--neon-yellow)', stat: `${sorted[0].latest.bodyFat.toFixed(1)}% BF` });
      assigned.add(sorted[0].name);
    }

    // Most improved
    let bestDrop = 0, progressive: Person | null = null;
    people.filter(p => p.entries.length > 1 && !assigned.has(p.name)).forEach(p => {
      const f = p.entries[0].bodyFat, l = p.latest.bodyFat;
      if (f != null && l != null && f - l > bestDrop) { bestDrop = f - l; progressive = p; }
    });
    if (progressive) {
      result.push({ person: progressive, title: 'The Progressive', emoji: '⚡', color: 'var(--neon-green)', stat: `-${bestDrop.toFixed(1)}% BF` });
      assigned.add((progressive as Person).name);
    }

    // Highest BF (Belly Boss)
    const bellyBoss = sorted.filter(p => !assigned.has(p.name) && p.latest.bodyFat != null).pop();
    if (bellyBoss) {
      result.push({ person: bellyBoss, title: 'Belly Boss', emoji: '🍕', color: 'var(--neon-orange)', stat: `${bellyBoss.latest.bodyFat!.toFixed(1)}% BF` });
      assigned.add(bellyBoss.name);
    }

    // Most consistent
    const streaker = byCount.find(p => !assigned.has(p.name));
    if (streaker) {
      result.push({ person: streaker, title: 'Streak Master', emoji: '🔥', color: 'var(--neon-purple)', stat: `${streaker.entries.length} weigh-ins` });
      assigned.add(streaker.name);
    }

    // Assign remaining
    const extras = [
      { title: 'Zen Master', emoji: '🧘', color: '#06b6d4' },
      { title: 'The Sniper', emoji: '🎯', color: '#f43e5c' },
      { title: 'Diamond Hands', emoji: '💎', color: '#818cf8' },
      { title: 'Rocket', emoji: '🚀', color: '#fb923c' },
      { title: 'Beast Mode', emoji: '🦁', color: '#eab308' },
      { title: 'Night Owl', emoji: '🦉', color: '#a78bfa' },
      { title: 'Iron Will', emoji: '⚔️', color: '#64748b' },
      { title: 'Wildcard', emoji: '🃏', color: '#ec4899' },
    ];
    let ei = 0;
    people.filter(p => !assigned.has(p.name)).forEach(p => {
      const e = extras[ei % extras.length]; ei++;
      const kgStr = p.latest.kg != null ? `${p.latest.kg.toFixed(1)} kg` : `${p.entries.length} entries`;
      result.push({ person: p, title: e.title, emoji: e.emoji, color: e.color, stat: kgStr });
    });

    return result;
  }, [people]);

  const genderColor = gender === 'F' ? 'var(--neon-pink)' : 'var(--neon-blue)';

  return (
    <div className="space-y-6">
      {/* ═══ TICKER ═══ */}
      <div className="overflow-hidden rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex animate-ticker whitespace-nowrap py-2.5 px-4">
          {[...funFacts, ...funFacts].map((f, i) => (
            <span key={i} className="inline-block mx-8 text-xs font-bold text-slate-400 shrink-0">{f}</span>
          ))}
        </div>
      </div>

      {/* ═══ AWARDS CAROUSEL ═══ */}
      <div>
        <h3 className="font-black text-sm mb-3 flex items-center gap-2">
          <span>🏆</span> Squad Awards
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin', scrollBehavior: 'smooth' }}>
          {personAwards.map((a, i) => (
            <div key={a.person.name} className={`glass rounded-[var(--r-lg)] p-5 relative overflow-hidden trading-card anim-fade d${Math.min(i+1, 9)} shrink-0`}
              style={{ width: 220, minWidth: 220 }}>
              <div className="accent-strip" style={{ background: a.color }} />
              <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full opacity-[0.06]" style={{ background: a.color }} />
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{a.emoji}</span>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{a.title}</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black text-white"
                  style={{ background: PERSON_COLORS[allPeople.indexOf(a.person) % PERSON_COLORS.length] }}>
                  {a.person.name[0]}
                </div>
                <div>
                  <div className="text-base font-black text-white">{a.person.name}</div>
                  <div className="text-[10px] text-slate-500">{a.person.gender === 'F' ? '♀' : '♂'}</div>
                </div>
              </div>
              <div className="text-xs font-bold mt-1" style={{ color: a.color }}>{a.stat}</div>
            </div>
          ))}
        </div>
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
                  formatter={(v: any) => [`${v.toFixed(1)}%`, 'Avg BF']}
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