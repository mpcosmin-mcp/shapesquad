import { useMemo, useRef, useState } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy, Target } from 'lucide-react';
import { Person, MetricKey, delta, fmt, PERSON_COLORS } from '../../lib/shape';
import { getAdjective } from '../../App';

interface Props { people: Person[]; allPeople: Person[]; gender: string; onSelectPerson: (name: string) => void; }

export default function SquadPage({ people, allPeople, gender, onSelectPerson }: Props) {
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
        avgBf: +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1),
      }));
  }, [people]);

  const ranking = useMemo(() =>
    [...people].filter(p => p.latest.bodyFat != null)
      .sort((a, b) => (a.latest.bodyFat ?? 99) - (b.latest.bodyFat ?? 99)),
  [people]);

  // ── Fun Facts ──
  const funFacts = useMemo(() => {
    const f: string[] = [];
    const totalKg = people.reduce((s, p) => s + (p.latest.kg ?? 0), 0);
    f.push(`⚖️ Squad total: ${totalKg.toFixed(0)} kg — that's ${(totalKg / 80).toFixed(1)} average humans`);
    const heaviest = [...people].sort((a, b) => (b.latest.kg ?? 0) - (a.latest.kg ?? 0))[0];
    if (heaviest?.latest.kg) f.push(`🏋️ ${heaviest.name} leads with ${heaviest.latest.kg.toFixed(1)} kg`);
    const most = [...people].sort((a, b) => b.entries.length - a.entries.length)[0];
    if (most) f.push(`📊 ${most.name} = data nerd (${most.entries.length} measurements)`);
    const least = [...people].sort((a, b) => a.entries.length - b.entries.length)[0];
    if (least?.entries.length <= 2) f.push(`🦥 ${least.name}: ${least.entries.length} weigh-in(s). Legend.`);
    if (stats.avgBf != null) f.push(`🔥 Squad avg BF: ${stats.avgBf.toFixed(1)}% — ${stats.avgBf < 25 ? 'athletic!' : 'room to grow!'}`);
    people.forEach(p => {
      if (p.entries.length > 1 && p.latest.kg != null && p.entries[0].kg != null) {
        const d = p.latest.kg - p.entries[0].kg;
        if (Math.abs(d) > 2) f.push(`${d < 0 ? '📉' : '📈'} ${p.name} ${d < 0 ? 'lost' : 'gained'} ${Math.abs(d).toFixed(1)} kg`);
      }
    });
    f.push(`👥 Ratio: ${people.filter(p => p.gender === 'M').length}♂ vs ${people.filter(p => p.gender === 'F').length}♀`);
    return f;
  }, [people, stats]);

  // ── Per-person Awards ──
  const personAwards = useMemo(() => {
    const result: { person: Person; title: string; emoji: string; color: string; stat: string }[] = [];
    const sorted = [...people].sort((a, b) => (a.latest.bodyFat ?? 99) - (b.latest.bodyFat ?? 99));
    const byCount = [...people].sort((a, b) => b.entries.length - a.entries.length);
    const assigned = new Set<string>();

    if (sorted.length && sorted[0].latest.bodyFat != null) {
      result.push({ person: sorted[0], title: 'Pure Talent', emoji: '✨', color: 'var(--neon-yellow)', stat: `${sorted[0].latest.bodyFat.toFixed(1)}% BF` });
      assigned.add(sorted[0].name);
    }
    let bestDrop = 0, prog: Person | null = null;
    people.filter(p => p.entries.length > 1 && !assigned.has(p.name)).forEach(p => {
      const f = p.entries[0].bodyFat, l = p.latest.bodyFat;
      if (f != null && l != null && f - l > bestDrop) { bestDrop = f - l; prog = p; }
    });
    if (prog) { result.push({ person: prog, title: 'The Progressive', emoji: '⚡', color: 'var(--neon-green)', stat: `-${bestDrop.toFixed(1)}% BF` }); assigned.add((prog as Person).name); }

    const bb = sorted.filter(p => !assigned.has(p.name) && p.latest.bodyFat != null).pop();
    if (bb) { result.push({ person: bb, title: 'Belly Boss', emoji: '🍕', color: 'var(--neon-orange)', stat: `${bb.latest.bodyFat!.toFixed(1)}% BF` }); assigned.add(bb.name); }

    const st = byCount.find(p => !assigned.has(p.name));
    if (st) { result.push({ person: st, title: 'Streak Master', emoji: '🔥', color: 'var(--neon-purple)', stat: `${st.entries.length} weigh-ins` }); assigned.add(st.name); }

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
      const e = extras[ei++ % extras.length];
      result.push({ person: p, title: e.title, emoji: e.emoji, color: e.color, stat: p.latest.kg != null ? `${p.latest.kg.toFixed(1)} kg` : `${p.entries.length} entries` });
    });
    return result;
  }, [people]);

  // ── Drag scroll ──
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragState = useRef({ startX: 0, scrollLeft: 0, moved: false });

  const onPointerDown = (e: React.PointerEvent) => {
    if (!scrollRef.current) return;
    setDragging(true);
    dragState.current = { startX: e.clientX, scrollLeft: scrollRef.current.scrollLeft, moved: false };
    scrollRef.current.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !scrollRef.current) return;
    const dx = e.clientX - dragState.current.startX;
    if (Math.abs(dx) > 5) dragState.current.moved = true;
    scrollRef.current.scrollLeft = dragState.current.scrollLeft - dx;
  };
  const onPointerUp = () => setDragging(false);

  const genderColor = gender === 'F' ? 'var(--neon-pink)' : 'var(--neon-blue)';

  return (
    <div className="space-y-5">
      {/* ═══ TICKER ═══ */}
      <div className="overflow-hidden rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex animate-ticker whitespace-nowrap py-2.5">
          {[...funFacts, ...funFacts].map((f, i) => (
            <span key={i} className="inline-block mx-6 text-[11px] font-bold text-slate-400 shrink-0">{f}</span>
          ))}
        </div>
      </div>

      {/* ═══ AWARDS CAROUSEL ═══ */}
      <div>
        <h3 className="font-black text-sm mb-3 flex items-center gap-2">🏆 Squad Awards</h3>
        <div ref={scrollRef}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove}
          onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          className={`drag-scroll flex gap-3 pb-2 ${dragging ? 'grabbing' : ''}`}>
          {personAwards.map((a, i) => (
            <div key={a.person.name}
              onClick={() => { if (!dragState.current.moved) onSelectPerson(a.person.name); }}
              className={`glass p-4 relative overflow-hidden trading-card anim-fade d${Math.min(i+1, 9)} shrink-0`}
              style={{ width: 200, minWidth: 200 }}>
              <div className="accent-strip" style={{ background: a.color }} />
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-[0.06]" style={{ background: a.color }} />
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{a.emoji}</span>
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{a.title}</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white"
                  style={{ background: PERSON_COLORS[allPeople.indexOf(a.person) % PERSON_COLORS.length] }}>
                  {a.person.name[0]}
                </div>
                <div className="text-sm font-black text-white truncate">{a.person.name}</div>
              </div>
              <div className="text-[11px] font-bold" style={{ color: a.color }}>{a.stat}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ CHART + STATS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 glass p-4 md:p-6 anim-fade d5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base md:text-lg font-black text-white">Squad Body Fat Trend</h3>
              <p className="text-[10px] text-slate-500 font-medium">Average BF% over time</p>
            </div>
            <span className="chip font-mono text-[9px]" style={{ background: `${genderColor}15`, color: genderColor }}>
              {gender === 'all' ? 'Everyone' : gender === 'M' ? 'Bărbați' : 'Femei'}
            </span>
          </div>
          <div className="chart-fluid" style={{ height: 220, ['--chart-accent' as any]: gender === 'F' ? '#ec489966' : '#3b82f666' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="bfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={gender === 'F' ? '#ec4899' : '#3b82f6'} stopOpacity={0.3}>
                      <animate attributeName="stop-opacity" values="0.3;0.12;0.3" dur="4s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="50%" stopColor={gender === 'F' ? '#ec4899' : '#3b82f6'} stopOpacity={0.08}>
                      <animate attributeName="stop-opacity" values="0.08;0.22;0.08" dur="4s" begin="1s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="95%" stopColor={gender === 'F' ? '#ec4899' : '#3b82f6'} stopOpacity={0} />
                  </linearGradient>
                  <filter id="bfGlow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 12, color: '#fff', fontFamily: 'JetBrains Mono', fontSize: 11 }}
                  formatter={(v: any) => [`${Number(v).toFixed(1)}%`, 'Avg BF']} />
                <Area type="monotone" dataKey="avgBf" stroke={gender === 'F' ? '#ec4899' : '#3b82f6'} strokeWidth={2.5}
                  fill="url(#bfGrad)" activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, filter: 'url(#bfGlow)' }} />
                <XAxis dataKey="date" axisLine={false} tickLine={false}
                  tick={{ fill: '#475569', fontSize: 9, fontWeight: 700, fontFamily: 'Montserrat' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 glass p-4 md:p-6 anim-fade d6">
          <h3 className="text-base font-black text-white mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-400" /> Squad Stats
          </h3>
          <div className="space-y-3">
            <QS label="Members" value={String(stats.count)} color="var(--neon-blue)" />
            <QS label="Avg Weight" value={`${fmt(stats.avgKg, 0)} kg`} color="var(--neon-green)" />
            <QS label="Avg Body Fat" value={`${fmt(stats.avgBf, 1)}%`} color="var(--neon-orange)" />
            <QS label="Measurements" value={String(stats.total)} color="var(--neon-purple)" />
          </div>
        </div>
      </div>

      {/* ═══ LEADERBOARD ═══ */}
      <div className="anim-fade d7">
        <h2 className="text-base md:text-xl font-black text-white uppercase tracking-tight mb-3 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" /> Clasament Body Fat
        </h2>

        {/* Mobile: stacked cards */}
        <div className="md:hidden space-y-2">
          {ranking.map((p, i) => {
            const ci = allPeople.indexOf(p);
            const color = PERSON_COLORS[ci % PERSON_COLORS.length];
            const bf = p.latest.bodyFat!;
            const firstBf = p.entries[0].bodyFat;
            const d = firstBf != null ? bf - firstBf : null;
            return (
              <button key={p.name} onClick={() => onSelectPerson(p.name)}
                className={`w-full glass p-3 flex items-center gap-3 text-left active:scale-[0.98] transition-transform anim-slide d${Math.min(i+1,9)} ${i === 0 ? 'glow-blue' : ''}`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                  i === 0 ? 'bg-yellow-400/20 text-yellow-400' : i === 1 ? 'bg-slate-300/10 text-slate-300' : i === 2 ? 'bg-orange-400/10 text-orange-400' : 'bg-white/5 text-slate-500'
                }`}>{i === 0 ? '👑' : i + 1}</div>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black text-white"
                  style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}>{p.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">{p.name}</div>
                  <div className="text-[9px] text-slate-500">{getAdjective(p.name, allPeople)}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-sm font-black">{bf.toFixed(1)}%</div>
                  {d != null && d !== 0 && (
                    <div className={`font-mono text-[10px] font-bold ${d < 0 ? 'text-[var(--neon-green)]' : 'text-[var(--neon-red)]'}`}>
                      {d < 0 ? '↓' : '↑'}{Math.abs(d).toFixed(1)}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Desktop: full table */}
        <div className="hidden md:block glass overflow-hidden">
          <div className="table-wrap">
            <table className="lb-table">
              <thead>
                <tr>
                  <th>#</th><th>Legendă</th><th>Titlu</th><th>BF%</th><th>Kg</th><th>Evoluție</th><th>Nr.</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((p, i) => {
                  const ci = allPeople.indexOf(p);
                  const color = PERSON_COLORS[ci % PERSON_COLORS.length];
                  const bf = p.latest.bodyFat!;
                  const firstBf = p.entries[0].bodyFat;
                  const d = firstBf != null ? bf - firstBf : null;
                  return (
                    <tr key={p.name} onClick={() => onSelectPerson(p.name)} className={`cursor-pointer anim-slide d${Math.min(i+1,9)}`}>
                      <td>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                          i===0?'bg-yellow-400/20 text-yellow-400':i===1?'bg-slate-300/10 text-slate-300':i===2?'bg-orange-400/10 text-orange-400':'bg-white/5 text-slate-500'
                        }`}>{i===0?'👑':i+1}</div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black text-white"
                            style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}>{p.name[0]}</div>
                          <div>
                            <div className="text-sm font-bold text-white">{p.name}</div>
                            <div className="text-[9px] text-slate-500">{p.gender==='F'?'♀':'♂'}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="chip text-[9px]" style={{ background:'rgba(255,255,255,.05)', color:'var(--text2)' }}>{getAdjective(p.name, allPeople)}</span></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-20"><div className="progress-track"><div className="progress-fill" style={{ width:`${Math.min(100,(bf/40)*100)}%`, background: bf<22?'var(--neon-green)':bf<30?'var(--neon-orange)':'var(--neon-red)' }}/></div></div>
                          <span className="font-mono text-sm font-black">{bf.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td><span className="font-mono text-sm">{fmt(p.latest.kg)} kg</span></td>
                      <td>
                        {d!=null&&d!==0?(
                          <span className={`font-mono font-black text-sm ${d<0?'text-[var(--neon-green)]':d>0?'text-[var(--neon-red)]':'text-slate-500'}`}>
                            {d<0?'↓':'↑'}{Math.abs(d).toFixed(1)}%
                          </span>
                        ):<span className="text-slate-600 text-xs">—</span>}
                      </td>
                      <td><span className="font-mono text-xs text-slate-400">{p.entries.length}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function QS({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      <span className="font-mono text-base font-black" style={{ color }}>{value}</span>
    </div>
  );
}