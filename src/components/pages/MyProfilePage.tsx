import { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Person, MetricKey, delta, deltaColor, fmt, PERSON_COLORS, getPersonInsight, densifyTimeSeries, calcStreak, getLikeCount } from '../../lib/shape';
import { CrosshairCursor, FloatingTooltip, TimeframeBar as TFBar, monthTicks } from '../ChartCrosshair';
import { getAdjective } from '../../App';
import { Heart, ChevronDown, ChevronUp } from 'lucide-react';

interface Props { person: Person | null; people: Person[]; onSelect?: (name: string) => void; likes: Record<string, string[]>; }

export default function MyProfilePage({ person: p, people, onSelect, likes }: Props) {
  const [showDetails, setShowDetails] = useState(false);

  // Welcome picker if no person selected
  if (!p) {
    return (
      <div className="anim-fade">
        <div className="text-center mb-8 mt-4">
          <span className="text-5xl block mb-3">👋</span>
          <h1 className="font-black text-3xl tracking-tight text-white mb-2">Who are you?</h1>
          <p className="text-slate-500 font-medium text-sm">Pick your name to see your profile</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-3xl mx-auto">
          {people.map((person, i) => {
            const color = PERSON_COLORS[i % PERSON_COLORS.length];
            const adj = getAdjective(person.name, people);
            const bf = person.latest.bodyFat;
            return (
              <button key={person.name}
                onClick={() => onSelect?.(person.name)}
                className="glass rounded-[var(--r-lg)] p-5 text-left trading-card relative overflow-hidden anim-fade"
                style={{ animationDelay: `${i * 50}ms` }}>
                <div className="accent-strip" style={{ background: color }} />
                <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-[0.06]" style={{ background: color }} />
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black text-white mb-3"
                  style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}>
                  {person.name[0]}
                </div>
                <div className="font-black text-base text-white mb-1">{person.name}</div>
                <div className="text-[10px] font-bold text-slate-500 mb-2">{person.gender === 'F' ? '♀' : '♂'} · {person.entries.length} measurements</div>
                <span className="chip text-[9px]" style={{ background: `${color}15`, color }}>{adj}</span>
                {bf != null && (
                  <div className="mt-2 font-mono text-xs text-slate-400">BF: {bf.toFixed(1)}%</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const ci = people.indexOf(p);
  const color = PERSON_COLORS[ci % PERSON_COLORS.length];
  const adj = getAdjective(p.name, people);
  const first = p.entries[0];
  const last = p.latest;
  const prev = p.previous;
  const months = p.entries.length > 1
    ? Math.max(1, Math.round((new Date(last.date).getTime() - new Date(first.date).getTime()) / (30 * 24 * 3600 * 1000)))
    : 0;

  const streak = calcStreak(p);
  const likeCount = getLikeCount(likes, p.name);

  // Core 3 metrics — what matters at a glance
  const coreStats = [
    { key: 'kg' as MetricKey, label: 'Greutate', unit: 'kg', icon: '⚖️', lower: false },
    { key: 'bodyFat' as MetricKey, label: 'Body Fat', unit: '%', icon: '🔥', lower: true },
    { key: 'talie' as MetricKey, label: 'Talie', unit: 'cm', icon: '📏', lower: true },
  ];

  // Optional metrics — shown only in "Detalii"
  const optionalStats: { key: MetricKey; label: string; unit: string; lower?: boolean }[] = [
    { key: 'muscle', label: 'Muscle', unit: '%' },
    { key: 'water', label: 'Water', unit: '%' },
    { key: 'visceralFat', label: 'Visceral', unit: '', lower: true },
    { key: 'biceps', label: 'Biceps', unit: 'cm' },
    { key: 'spate', label: 'Spate', unit: 'cm' },
    { key: 'piept', label: 'Piept', unit: 'cm' },
    { key: 'fesieri', label: 'Fesieri', unit: 'cm' },
  ];

  return (
    <div className="space-y-5">
      {/* ═══ HERO CARD — name, adjective, streak, likes ═══ */}
      <div className="glass rounded-[var(--r-lg)] p-6 relative overflow-hidden anim-fade glow-blue">
        <div className="accent-strip" style={{ background: color, height: 4 }} />
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full opacity-[0.05]" style={{ background: color }} />
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white float shrink-0"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}>{p.name[0]}</div>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-2xl tracking-tight text-white">{p.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="chip text-[10px]" style={{ background: `${color}20`, color }}>{adj}</span>
              <span className="chip bg-white/5 text-slate-400 text-[10px]">{p.gender === 'F' ? '♀ Female' : '♂ Male'}</span>
              <span className="chip bg-white/5 text-slate-400 text-[10px]">{p.entries.length} check-in-uri</span>
              {months > 0 && <span className="chip bg-white/5 text-slate-400 text-[10px]">{months} luni</span>}
              {streak.current > 0 && <span className="streak-badge text-[10px]">🔥 {streak.current} luni streak</span>}
              {likeCount > 0 && (
                <span className="chip text-[10px]" style={{ background: 'rgba(236,72,153,0.1)', color: '#ec4899' }}>
                  <Heart className="w-3 h-3 inline" fill="currentColor" /> {likeCount} {likeCount === 1 ? 'like' : 'likes'}
                </span>
              )}
            </div>
            {/* AI Insight */}
            {(() => {
              const insight = getPersonInsight(p);
              return (
                <div className="mt-3 rounded-xl px-3 py-2" style={{
                  background: insight.tone === 'good' ? 'rgba(0,255,136,0.06)' : insight.tone === 'warn' ? 'rgba(249,115,22,0.06)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${insight.tone === 'good' ? 'rgba(0,255,136,0.12)' : insight.tone === 'warn' ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.06)'}`,
                }}>
                  <div className="text-[11px] font-bold" style={{ color: insight.tone === 'good' ? '#00ff88' : insight.tone === 'warn' ? '#f97316' : '#94a3b8' }}>
                    {insight.emoji} {insight.text}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ═══ CORE 3 STATS — Weight, BF%, Waist ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {coreStats.map((m, i) => (
          <StatCard key={m.key} person={p} metricKey={m.key} label={m.label} unit={m.unit} icon={m.icon} lower={m.lower} color={color} index={i} />
        ))}
      </div>

      {/* ═══ PROGRESS CHART — Weight + BF% overlay ═══ */}
      <ProgressChart person={p} color={color} />

      {/* ═══ ISTORIC — full log table ═══ */}
      <div className="glass rounded-[var(--r-lg)] p-4 anim-fade d4">
        <h3 className="font-black text-sm mb-3 flex items-center gap-2">
          📋 Istoric complet
          <span className="text-[10px] font-bold text-slate-500">({p.entries.length})</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="lb-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Kg</th>
                <th>BF%</th>
                <th>Talie</th>
                <th>Muscle</th>
                <th>Water</th>
              </tr>
            </thead>
            <tbody>
              {[...p.entries].reverse().map((e, i) => {
                // Calculate delta vs previous entry (the one before in chronological order)
                const chronoIdx = p.entries.length - 1 - i;
                const prevEntry = chronoIdx > 0 ? p.entries[chronoIdx - 1] : null;
                const dKg = prevEntry ? delta(e.kg, prevEntry.kg) : null;
                const dBf = prevEntry ? delta(e.bodyFat, prevEntry.bodyFat) : null;
                const dTalie = prevEntry ? delta(e.talie, prevEntry.talie) : null;
                return (
                  <tr key={i}>
                    <td className="text-xs font-medium" style={{ fontFamily: 'Montserrat', color: 'var(--text2)' }}>
                      {new Date(e.date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td>
                      {fmt(e.kg)}
                      {dKg != null && dKg !== 0 && (
                        <span className="ml-1 text-[9px] font-mono" style={{ color: deltaColor(dKg, false) }}>
                          {dKg > 0 ? '+' : ''}{dKg.toFixed(1)}
                        </span>
                      )}
                    </td>
                    <td>
                      {fmt(e.bodyFat)}
                      {dBf != null && dBf !== 0 && (
                        <span className="ml-1 text-[9px] font-mono" style={{ color: deltaColor(dBf, true) }}>
                          {dBf > 0 ? '+' : ''}{dBf.toFixed(1)}
                        </span>
                      )}
                    </td>
                    <td>
                      {fmt(e.talie)}
                      {dTalie != null && dTalie !== 0 && (
                        <span className="ml-1 text-[9px] font-mono" style={{ color: deltaColor(dTalie, true) }}>
                          {dTalie > 0 ? '+' : ''}{dTalie.toFixed(1)}
                        </span>
                      )}
                    </td>
                    <td>{fmt(e.muscle)}</td>
                    <td>{fmt(e.water)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ DETALII — collapsible extra metrics ═══ */}
      <div className="glass rounded-[var(--r-lg)] anim-fade d5">
        <button
          onClick={() => setShowDetails(v => !v)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors rounded-[var(--r-lg)]">
          <div>
            <h3 className="font-black text-sm">🔬 Detalii suplimentare</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Muscle, water, visceral, circumferințe</p>
          </div>
          {showDetails ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showDetails && (
          <div className="px-4 pb-4 anim-fade">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {optionalStats.map(m => {
                const val = last[m.key] as number | null;
                const firstVal = first[m.key] as number | null;
                const prevVal = prev ? (prev[m.key] as number | null) : null;
                if (val == null) return null;
                const dStart = delta(val, firstVal);
                const dRecent = delta(val, prevVal);
                return (
                  <div key={m.key} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">{m.label}</div>
                    <div className="font-mono text-lg font-black text-white">
                      {fmt(val, 1)}<span className="text-[10px] text-slate-500 ml-1">{m.unit}</span>
                    </div>
                    {dRecent != null && dRecent !== 0 && (
                      <div className="font-mono text-[9px] font-bold mt-1" style={{ color: deltaColor(dRecent, m.lower) }}>
                        ultim: {dRecent > 0 ? '+' : ''}{dRecent.toFixed(1)}
                      </div>
                    )}
                    {dStart != null && dStart !== 0 && (
                      <div className="font-mono text-[9px] text-slate-500 mt-0.5">
                        start: {dStart > 0 ? '+' : ''}{dStart.toFixed(1)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Core stat card — big value, delta vs previous check-in, sparkline */
function StatCard({ person, metricKey, label, unit, icon, lower, color, index }: {
  person: Person; metricKey: MetricKey; label: string; unit: string; icon: string; lower?: boolean; color: string; index: number;
}) {
  const val = person.latest[metricKey] as number | null;
  const prev = person.previous ? (person.previous[metricKey] as number | null) : null;
  const first = person.first[metricKey] as number | null;
  const dRecent = delta(val, prev);
  const dStart = delta(val, first);
  const goodRecent = dRecent != null ? (lower ? dRecent < 0 : dRecent > 0) : null;

  // Sparkline data
  const spark = useMemo(() => {
    return person.entries
      .map(e => e[metricKey] as number | null)
      .filter((v): v is number => v != null);
  }, [person, metricKey]);

  return (
    <div className={`glass rounded-[var(--r-lg)] p-4 trading-card relative overflow-hidden anim-fade d${index + 1}`}>
      <div className="accent-strip" style={{ background: color, height: 2 }} />
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{icon} {label}</span>
        {dRecent != null && dRecent !== 0 && (
          <span className={`chip text-[10px] ${goodRecent ? 'bg-[rgba(0,255,136,0.1)] text-[var(--neon-green)]' : 'bg-[rgba(255,59,59,0.1)] text-[var(--neon-red)]'}`}>
            {dRecent > 0 ? '+' : ''}{dRecent.toFixed(1)}{unit}
          </span>
        )}
      </div>

      <div className="font-mono text-3xl font-black text-white">
        {fmt(val, 1)}<span className="text-sm font-normal text-slate-500 ml-1">{unit}</span>
      </div>

      {dStart != null && dStart !== 0 && first != null && (
        <div className="text-[9px] font-mono text-slate-500 mt-1">
          de la start: <span style={{ color: deltaColor(dStart, lower) }} className="font-bold">{dStart > 0 ? '+' : ''}{dStart.toFixed(1)}{unit}</span>
        </div>
      )}

      {/* Sparkline */}
      {spark.length >= 2 && (
        <div className="mt-3 h-8 flex items-end gap-[2px]">
          {(() => {
            const min = Math.min(...spark);
            const max = Math.max(...spark);
            const range = max - min || 1;
            return spark.map((v, i) => {
              const h = 8 + ((v - min) / range) * 24;
              const isLast = i === spark.length - 1;
              return (
                <div key={i} className="flex-1 rounded-t-sm transition-all"
                  style={{
                    height: `${h}px`,
                    background: isLast ? color : `${color}66`,
                    minWidth: 3,
                  }} />
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}

/** Dual-line trend chart — weight + body fat over time */
function ProgressChart({ person, color }: { person: Person; color: string }) {
  const [metric, setMetric] = useState<MetricKey>('kg');
  const meta: Record<string, { label: string; unit: string; color: string }> = {
    kg: { label: 'Greutate', unit: 'kg', color },
    bodyFat: { label: 'Body Fat %', unit: '%', color: '#ff3b3b' },
    talie: { label: 'Talie', unit: 'cm', color: '#22d3ee' },
  };

  const raw = person.entries
    .filter(e => e[metric] != null)
    .map(e => ({ date: e.date as string, val: e[metric] as number }));
  const data = useMemo(() => densifyTimeSeries(raw), [JSON.stringify(raw)]);
  const mt = useMemo(() => monthTicks(data), [data]);
  const m = meta[metric];

  if (data.length < 2) {
    return (
      <div className="glass rounded-[var(--r-lg)] p-5 anim-fade d3">
        <h3 className="font-black text-sm mb-2">📈 Progres în timp</h3>
        <p className="text-[11px] text-slate-500">Ai nevoie de minim 2 check-in-uri ca să vezi trendul.</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-[var(--r-lg)] p-5 anim-fade d3">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-black text-sm">📈 Progres — {m.label}</h3>
        <div className="flex gap-1">
          {(['kg', 'bodyFat', 'talie'] as MetricKey[]).map(k => (
            <button key={k}
              onClick={() => setMetric(k)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${metric === k ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
              style={metric === k ? { background: `${meta[k].color}20`, color: meta[k].color } : { background: 'rgba(255,255,255,0.03)' }}>
              {meta[k].label}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-fluid" style={{ height: 200, ['--chart-accent' as any]: `${m.color}66` }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`g-prog-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={m.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={m.color} stopOpacity={0} />
              </linearGradient>
              <filter id={`glow-prog-${metric}`}>
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <Tooltip cursor={<CrosshairCursor />}
              content={<FloatingTooltip unit={m.unit} color={m.color} />}
              isAnimationActive={false} />
            <Area type="monotone" dataKey="val" stroke={m.color} strokeWidth={2.5} fill={`url(#g-prog-${metric})`}
              dot={(props: any) => {
                const pt = data[props.index];
                if (!pt?.isReal) return <circle key={props.index} r={0} />;
                return <circle key={props.index} cx={props.cx} cy={props.cy} r={4} fill={m.color} stroke="#0f172a" strokeWidth={2} />;
              }}
              activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, filter: `url(#glow-prog-${metric})` }} />
            <XAxis dataKey="date" axisLine={false} tickLine={false}
              tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }}
              ticks={mt.ticks} tickFormatter={mt.fmt} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {data.length >= 2 && <TFBar
        firstIso={data[0].isoDate} lastIso={data[data.length - 1].isoDate}
        days={Math.round((new Date(data[data.length - 1].isoDate).getTime() - new Date(data[0].isoDate).getTime()) / 86400000)}
        realCount={data.filter(d => d.isReal).length} color={m.color}
      />}
    </div>
  );
}
