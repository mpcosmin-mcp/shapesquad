import { useMemo, useRef, useState } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy, Target } from 'lucide-react';
import { Person, MetricKey, delta, fmt, PERSON_COLORS, calcOverallScore, ScoreBreakdown, f, getPersonInsight, densifyTimeSeries } from '../../lib/shape';
import { CrosshairCursor, SquadTooltip, TimeframeBar, monthTicks } from '../ChartCrosshair';
import { getAdjective } from '../../App';

interface Props { people: Person[]; allPeople: Person[]; gender: string; onSelectPerson: (name: string) => void; }

/** Color for 6.0–10.0 grade: 9+ green, 7.5+ blue, 6.5+ orange, below red */
function gradeColor(g: number): string {
  if (g >= 9) return 'var(--neon-green)';
  if (g >= 8) return '#4ecdc4';
  if (g >= 7) return 'var(--neon-blue)';
  if (g >= 6.5) return 'var(--neon-orange)';
  return 'var(--neon-red)';
}

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
    const raw = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({
        date,
        val: +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1),
      }));
    return densifyTimeSeries(raw).map(p => ({ ...p, avgBf: p.val }));
  }, [people]);

  const mt = useMemo(() => monthTicks(trendData), [trendData]);

  const maxEntries = useMemo(() => Math.max(...people.map(p => p.entries.length), 1), [people]);

  const scored = useMemo(() =>
    people.map(p => ({ person: p, score: calcOverallScore(p, maxEntries) }))
      .sort((a, b) => b.score.total - a.score.total),
  [people, maxEntries]);

  const ranking = useMemo(() => scored.map(s => s.person), [scored]);
  const scoreMap = useMemo(() => {
    const m = new Map<string, ScoreBreakdown>();
    scored.forEach(s => m.set(s.person.name, s.score));
    return m;
  }, [scored]);

  // ── Fun Facts + Personality Lines ──
  const funFacts = useMemo(() => {
    const f: string[] = [];
    const totalKg = people.reduce((s, p) => s + (p.latest.kg ?? 0), 0);
    f.push(`⚖️ Squad total: ${totalKg.toFixed(0)} kg — that's ${(totalKg / 80).toFixed(1)} average humans`);
    const heaviest = [...people].sort((a, b) => (b.latest.kg ?? 0) - (a.latest.kg ?? 0))[0];
    if (heaviest?.latest.kg) f.push(`🏋️ ${heaviest.name} leads with ${heaviest.latest.kg.toFixed(1)} kg`);
    const most = [...people].sort((a, b) => b.entries.length - a.entries.length)[0];
    if (most) f.push(`📊 ${most.name} = data nerd (${most.entries.length} measurements)`);
    if (stats.avgBf != null) f.push(`🔥 Squad avg BF: ${stats.avgBf.toFixed(1)}% — ${stats.avgBf < 25 ? 'athletic!' : 'room to grow!'}`);
    people.forEach(p => {
      if (p.entries.length > 1 && p.latest.kg != null && p.entries[0].kg != null) {
        const d = p.latest.kg - p.entries[0].kg;
        if (Math.abs(d) > 2) f.push(`${d < 0 ? '📉' : '📈'} ${p.name} ${d < 0 ? 'lost' : 'gained'} ${Math.abs(d).toFixed(1)} kg`);
      }
    });

    // ── Personality roasts & vibes ──
    const vibes: Record<string, string[]> = {
      Gaby: [
        '🏍️ Gaby: half gym bro, half Lego architect, 100% Raspberry Pi nerd',
        '🧱 Gaby builds Lego sets heavier than his deadlifts',
        '🏍️ Gaby\'s motorcycle weighs less than his Lego collection',
      ],
      Cata: [
        '🎮 Cata: SELECT * FROM gains WHERE player = \'CS legend\'',
        '💾 Cata\'s YT channel loading… buffering… still buffering…',
        '🎯 Cata headshots in CS and in database optimization',
      ],
      Clara: [
        '😴 Clara sleeps 9h and still outruns you',
        '🏃‍♀️ Clara: runs, sleeps, repeats. Living her best life',
        '🧘‍♀️ Clara discovered the gym and chose peace anyway',
      ],
      Bogdan: [
        '🇮🇹 Bogdan: Italian soul trapped in a Romanian body with a printing empire',
        '🖨️ Bogdan can print your excuses on a t-shirt, a mug, AND a flag',
        '🍕 Bogdan\'s heart rate spikes near pizza AND printers',
      ],
      Lavinia: [
        '🐕 Lavinia: philosopher by day, Ari\'s personal servant by night',
        '📚 Lavinia will question the meaning of your PR while petting Ari',
        '🤔 Lavinia\'s deep convos burn more calories than cardio',
      ],
      Cristi: [
        '🚗 Cristi: team leader, perfectionist, "mizerie" enthusiast',
        '🗣️ If Cristi says "mizerie" — just nod and walk away',
        '👔 Cristi\'s car is cleaner than your code',
      ],
      Adina: [
        '🌹 Adina: 20+ parfumes, 0 skipped gym days. Smells like victory',
        '💐 Adina\'s perfume collection costs more than your car',
        '👗 Adina goes to the gym dressed better than you go to weddings',
      ],
      Petrica: [
        '🤖 Petrica built this app instead of doing actual reps',
        '💻 Petrica: tracking everyone\'s gains while ignoring his own',
        '📱 Petrica spends more time on charts than on the treadmill',
      ],
      Stefi: [
        '🐍 Stefi has a snake. That\'s it. That\'s the warning.',
        '🍔 Stefi: small, unpredictable, hungry. Approach with food.',
        '🎲 Never bet against Stefi. She\'s chaotic neutral with a snake.',
      ],
      Varamea: [
        '📺 Varamea: Survivor expert, TikTok scholar, zero stress ambassador',
        '🏝️ Varamea watches Survivor for "strategic research"',
        '👫 Varamea & Buicu: the couple that TikToks together stays together',
      ],
    };
    // Pick one random line per person present
    const seed = new Date().getDate(); // changes daily
    people.forEach((p, i) => {
      const lines = vibes[p.name];
      if (lines) f.push(lines[(seed + i) % lines.length]);
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
                <Tooltip cursor={<CrosshairCursor />}
                  content={<SquadTooltip color={gender === 'F' ? '#ec4899' : '#3b82f6'} />}
                  isAnimationActive={false} />
                <Area type="monotone" dataKey="avgBf" stroke={gender === 'F' ? '#ec4899' : '#3b82f6'} strokeWidth={2.5}
                  fill="url(#bfGrad)"
                  dot={(props: any) => {
                    const pt = trendData[props.index];
                    if (!pt?.isReal) return <circle key={props.index} r={0} />;
                    return <circle key={props.index} cx={props.cx} cy={props.cy} r={3} fill={gender === 'F' ? '#ec4899' : '#3b82f6'} stroke="#0f172a" strokeWidth={2} />;
                  }}
                  activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, filter: 'url(#bfGlow)' }} />
                <XAxis dataKey="date" axisLine={false} tickLine={false}
                  tick={{ fill: '#475569', fontSize: 9, fontWeight: 700, fontFamily: 'Montserrat' }}
                  ticks={mt.ticks} tickFormatter={mt.fmt} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {trendData.length >= 2 && <TimeframeBar
            firstIso={trendData[0].isoDate} lastIso={trendData[trendData.length - 1].isoDate}
            days={Math.round((new Date(trendData[trendData.length-1].isoDate).getTime() - new Date(trendData[0].isoDate).getTime()) / 86400000)}
            realCount={trendData.filter(d => d.isReal).length}
            color={gender === 'F' ? '#ec4899' : '#3b82f6'}
          />}
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
          <Trophy className="w-5 h-5 text-yellow-400" /> Clasament Overall
        </h2>

        {/* Score legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
          <span className="text-[9px] text-slate-600 font-medium">Nota 6–10 pe categorie:</span>
          {[
            { l: 'Body Fat', w: '25%', c: '#ff3b3b' },
            { l: 'Progres', w: '20%', c: '#00ff88' },
            { l: 'BMI', w: '15%', c: '#3b82f6' },
            { l: 'Dedicare', w: '25%', c: '#a855f7' },
            { l: 'Masă Musculară', w: '15%', c: '#22d3ee' },
          ].map(s => (
            <span key={s.l} className="text-[9px] font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: s.c }} />
              <span className="text-slate-500">{s.l}</span>
              <span className="text-slate-600">{s.w}</span>
            </span>
          ))}
        </div>

        {/* Mobile: stacked cards */}
        <div className="md:hidden space-y-2">
          {ranking.map((p, i) => {
            const ci = allPeople.indexOf(p);
            const color = PERSON_COLORS[ci % PERSON_COLORS.length];
            const sc = scoreMap.get(p.name)!;
            const insight = getPersonInsight(p);
            return (
              <button key={p.name} onClick={() => onSelectPerson(p.name)}
                className={`w-full glass p-3 text-left active:scale-[0.98] transition-transform anim-slide d${Math.min(i+1,9)} ${i === 0 ? 'glow-blue' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                    i === 0 ? 'bg-yellow-400/20 text-yellow-400' : i === 1 ? 'bg-slate-300/10 text-slate-300' : i === 2 ? 'bg-orange-400/10 text-orange-400' : 'bg-white/5 text-slate-500'
                  }`}>{i === 0 ? '👑' : i + 1}</div>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black text-white"
                    style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}>{p.name[0]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">{p.name}</div>
                    <div className="text-[9px] text-slate-500">{p.gender === 'F' ? '♀' : '♂'} · {getAdjective(p.name, allPeople)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-xl font-black" style={{ color: gradeColor(sc.total) }}>
                      {sc.total.toFixed(1)}
                    </div>
                    <div className="text-[9px] text-slate-500 font-bold">/ 10</div>
                  </div>
                </div>
                {/* Score breakdown mini-bar */}
                <div className="flex h-1.5 rounded-full overflow-hidden mt-2 gap-px">
                  {[
                    { val: sc.bf, w: 25, c: '#ff3b3b' },
                    { val: sc.progress, w: 20, c: '#00ff88' },
                    { val: sc.bmi, w: 15, c: '#3b82f6' },
                    { val: sc.consistency, w: 25, c: '#a855f7' },
                    { val: sc.muscle, w: 15, c: '#22d3ee' },
                  ].map((s, j) => (
                    <div key={j} style={{ width: `${((s.val - 6) / 4) * s.w}%`, background: s.c }} />
                  ))}
                </div>
                {/* Actual values row */}
                <div className="flex gap-2 mt-1.5 text-[8px] font-mono text-slate-600">
                  <span>BF {p.latest.bodyFat != null ? `${p.latest.bodyFat.toFixed(1)}%` : '—'}</span>
                  <span>·</span>
                  <span>{p.latest.kg != null ? `${(p.latest.kg / ((p.gender === 'M' ? 1.75 : 1.62) ** 2)).toFixed(1)} BMI` : ''}</span>
                  <span>·</span>
                  <span>{p.entries.length} măs.</span>
                </div>
                {/* Insight */}
                <div className="mt-1.5 text-[9px] font-medium" style={{ color: insight.tone === 'good' ? '#00ff88' : insight.tone === 'warn' ? '#f97316' : '#64748b' }}>
                  {insight.emoji} {insight.text}
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
                  <th>#</th><th>Legendă</th><th>Nota</th>
                  <th style={{ color: '#ff3b3b' }}>Body Fat</th>
                  <th style={{ color: '#00ff88' }}>Progres</th>
                  <th style={{ color: '#3b82f6' }}>BMI</th>
                  <th style={{ color: '#a855f7' }}>Dedicare</th>
                  <th style={{ color: '#22d3ee' }}>Masă Musc.</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((p, i) => {
                  const ci = allPeople.indexOf(p);
                  const color = PERSON_COLORS[ci % PERSON_COLORS.length];
                  const sc = scoreMap.get(p.name)!;
                  const insight = getPersonInsight(p);
                  const refH = p.gender === 'M' ? 1.75 : 1.62;
                  const actualBmi = p.latest.kg != null ? (p.latest.kg / (refH * refH)).toFixed(1) : '—';
                  const bfDrop = (p.entries.length > 1 && p.first.bodyFat != null && p.latest.bodyFat != null)
                    ? (p.first.bodyFat - p.latest.bodyFat).toFixed(1) : null;
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
                            <div className="text-[9px] text-slate-500">{p.gender==='F'?'♀':'♂'} · {getAdjective(p.name, allPeople)}</div>
                            <div className="text-[9px] mt-0.5" style={{ color: insight.tone === 'good' ? '#00ff88' : insight.tone === 'warn' ? '#f97316' : '#64748b' }}>
                              {insight.emoji} {insight.text}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16"><div className="progress-track"><div className="progress-fill" style={{ width:`${((sc.total - 6) / 4) * 100}%`, background: gradeColor(sc.total) }}/></div></div>
                          <span className="font-mono text-lg font-black" style={{ color: gradeColor(sc.total) }}>{sc.total.toFixed(1)}</span>
                        </div>
                      </td>
                      <td>
                        <div><span className="font-mono text-xs" style={{ color: gradeColor(sc.bf) }}>{sc.bf.toFixed(1)}</span></div>
                        <div className="text-[9px] text-slate-500 font-mono">{p.latest.bodyFat != null ? `${p.latest.bodyFat.toFixed(1)}%` : '—'}</div>
                      </td>
                      <td>
                        <div><span className="font-mono text-xs" style={{ color: gradeColor(sc.progress) }}>{sc.progress.toFixed(1)}</span></div>
                        <div className="text-[9px] text-slate-500 font-mono">{bfDrop != null ? `${Number(bfDrop) >= 0 ? '-' : '+'}${Math.abs(Number(bfDrop))}% BF` : '—'}</div>
                      </td>
                      <td>
                        <div><span className="font-mono text-xs" style={{ color: gradeColor(sc.bmi) }}>{sc.bmi.toFixed(1)}</span></div>
                        <div className="text-[9px] text-slate-500 font-mono">BMI {actualBmi}</div>
                      </td>
                      <td>
                        <div><span className="font-mono text-xs" style={{ color: gradeColor(sc.consistency) }}>{sc.consistency.toFixed(1)}</span></div>
                        <div className="text-[9px] text-slate-500 font-mono">{p.entries.length} măsurători</div>
                      </td>
                      <td>
                        <div><span className="font-mono text-xs" style={{ color: gradeColor(sc.muscle) }}>{sc.muscle.toFixed(1)}</span></div>
                        <div className="text-[9px] text-slate-500 font-mono">{p.latest.muscle != null ? `${p.latest.muscle.toFixed(1)}%` : '—'}</div>
                      </td>
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