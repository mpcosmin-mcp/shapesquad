import { useMemo } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Person, METRICS, MetricKey, delta, deltaColor, fmt, PERSON_COLORS } from '../../lib/shape';
import { getAdjective } from '../../App';
import BodySilhouette from './BodySilhouette';

interface Props { person: Person | null; people: Person[]; onSelect?: (name: string) => void; }

export default function MyProfilePage({ person: p, people, onSelect }: Props) {
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
  const months = p.entries.length > 1
    ? Math.max(1, Math.round((new Date(last.date).getTime() - new Date(first.date).getTime()) / (30*24*3600*1000)))
    : 0;

  const bfRank = useMemo(() => {
    const ranked = people.filter(x => x.latest.bodyFat != null).sort((a, b) => (a.latest.bodyFat ?? 99) - (b.latest.bodyFat ?? 99));
    return ranked.findIndex(x => x.name === p.name) + 1;
  }, [people, p]);

  const keyStats = [
    { label: 'Weight', val: last.kg, first: first.kg, unit: 'kg', lower: true },
    { label: 'Body Fat', val: last.bodyFat, first: first.bodyFat, unit: '%', lower: true },
    { label: 'Visceral', val: last.visceralFat, first: first.visceralFat, unit: '', lower: true },
    { label: 'Muscle', val: last.muscle, first: first.muscle, unit: '%' },
    { label: 'Water', val: last.water, first: first.water, unit: '%' },
  ];

  const measurements = [
    { label: 'Biceps', key: 'biceps' as MetricKey },
    { label: 'Spate', key: 'spate' as MetricKey },
    { label: 'Piept', key: 'piept' as MetricKey },
    { label: 'Talie', key: 'talie' as MetricKey },
    { label: 'Fesieri', key: 'fesieri' as MetricKey },
  ];

  return (
    <div className="space-y-5">
      {/* ═══ HERO TRADING CARD ═══ */}
      <div className="glass rounded-[var(--r-lg)] p-6 relative overflow-hidden anim-fade glow-blue">
        <div className="accent-strip" style={{ background: color, height: 4 }} />
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full opacity-[0.05]" style={{ background: color }} />
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white float"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}>{p.name[0]}</div>
          <div className="flex-1">
            <h1 className="font-black text-2xl tracking-tight text-white">{p.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="chip text-[10px]" style={{ background: `${color}20`, color }}>{adj}</span>
              <span className="chip bg-white/5 text-slate-400 text-[10px]">{p.gender === 'F' ? '♀ Female' : '♂ Male'}</span>
              <span className="chip bg-white/5 text-slate-400 text-[10px]">{p.entries.length} measurements</span>
              {months > 0 && <span className="chip bg-white/5 text-slate-400 text-[10px]">{months} months</span>}
              {bfRank > 0 && <span className="chip text-[10px]" style={{ background: 'rgba(0,255,136,0.1)', color: 'var(--neon-green)' }}>#{bfRank} in Squad</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ KEY STATS ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {keyStats.map((m, i) => {
          const d = delta(m.val, m.first);
          const good = d != null ? (m.lower ? d < 0 : d > 0) : null;
          return (
            <div key={m.label} className={`glass rounded-[var(--r)] p-4 trading-card anim-fade d${i+1}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{m.label}</span>
                {d != null && (
                  <span className={`chip text-[10px] ${good ? 'bg-[rgba(0,255,136,0.1)] text-[var(--neon-green)]' : 'bg-[rgba(255,59,59,0.1)] text-[var(--neon-red)]'}`}>
                    {d > 0 ? '+' : ''}{d.toFixed(1)}{m.unit}
                  </span>
                )}
              </div>
              <div className="font-mono text-2xl font-black" style={{ color: d != null ? (good ? 'var(--neon-green)' : 'var(--neon-red)') : 'white' }}>
                {fmt(m.val, 1)}<span className="text-sm font-normal text-slate-500 ml-1">{m.unit}</span>
              </div>
              {m.first != null && m.val != null && (
                <div className="mt-2">
                  <div className="flex justify-between text-[9px] font-mono text-slate-600 mb-1">
                    <span>Start: {fmt(m.first)}</span><span>Now: {fmt(m.val)}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{
                      width: `${Math.min(100, Math.abs(d!) * 4 + 10)}%`,
                      background: good ? 'var(--neon-green)' : 'var(--neon-red)',
                    }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ═══ CHARTS ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MiniChart entries={p.entries} metricKey="kg" label="Weight" unit="kg" color={color} />
        <MiniChart entries={p.entries} metricKey="bodyFat" label="Body Fat %" unit="%" color="#ff3b3b" />
      </div>

      {/* ═══ BODY COMPOSITION ═══ */}
      {last.bodyFat != null && last.kg != null && (
        <div className="glass rounded-[var(--r-lg)] p-5 anim-fade d4">
          <h3 className="font-black text-sm mb-4">🧬 Body Composition</h3>

          {/* Full body composition = 100% */}
          {(() => {
            const bf = last.bodyFat!;
            const mus = last.muscle;
            const wat = last.water;
            const totalKg = last.kg!;

            // 100% model: Fat + Muscle + Bone/Organs = 100%
            const musPct = mus ?? 0;
            const bonePct = Math.max(0, 100 - bf - musPct);
            const fatKg = (bf / 100) * totalKg;
            const musKg = mus != null ? (musPct / 100) * totalKg : null;
            const boneKg = mus != null ? (bonePct / 100) * totalKg : null;

            return (
              <>
                {/* Primary bar: 100% composition */}
                <div className="mb-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Full Body = 100%</div>
                  <div className="flex h-10 rounded-xl overflow-hidden gap-0.5">
                    <div className="flex items-center justify-center font-mono text-[10px] font-bold text-white"
                      style={{ width: `${bf}%`, minWidth: bf > 8 ? 'auto' : 0, background: 'linear-gradient(135deg, #ff3b3b, #ff6b6b)' }}>
                      {bf > 8 ? `${bf.toFixed(1)}%` : ''}
                    </div>
                    {mus != null && (
                      <div className="flex items-center justify-center font-mono text-[10px] font-bold"
                        style={{ width: `${musPct}%`, background: 'linear-gradient(135deg, #22d3ee, #06b6d4)', color: '#0f172a' }}>
                        {musPct > 12 ? `${musPct.toFixed(1)}%` : ''}
                      </div>
                    )}
                    {mus != null && (
                      <div className="flex items-center justify-center font-mono text-[10px] font-bold text-slate-300"
                        style={{ width: `${bonePct}%`, background: 'rgba(255,255,255,0.08)' }}>
                        {bonePct > 5 ? `${bonePct.toFixed(1)}%` : ''}
                      </div>
                    )}
                    {mus == null && (
                      <div className="flex items-center justify-center font-mono text-[10px] font-bold"
                        style={{ flex: 1, background: 'linear-gradient(135deg, #00cc6a, #00ff88)', color: '#0f172a' }}>
                        {(100 - bf).toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <Leg c="#ff3b3b" l={`Fat ${bf.toFixed(1)}%`} />
                    {mus != null ? (
                      <>
                        <Leg c="#22d3ee" l={`Muscle ${musPct.toFixed(1)}%`} />
                        <Leg c="rgba(255,255,255,0.2)" l={`Bone/Organs ${bonePct.toFixed(1)}%`} />
                      </>
                    ) : (
                      <Leg c="#00ff88" l={`Lean ${(100 - bf).toFixed(1)}%`} />
                    )}
                  </div>
                </div>

                {/* Weight cards */}
                <div className={`grid ${mus != null ? 'grid-cols-3' : 'grid-cols-2'} gap-3 mt-4 mb-4`}>
                  <div className="rounded-xl p-3" style={{ background: 'rgba(255,59,59,0.08)' }}>
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#ff3b3b' }}>Fat</div>
                    <div className="font-mono text-lg font-black text-white">{fatKg.toFixed(1)} <span className="text-xs text-slate-500">kg</span></div>
                  </div>
                  {musKg != null ? (
                    <>
                      <div className="rounded-xl p-3" style={{ background: 'rgba(34,211,238,0.06)' }}>
                        <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#22d3ee' }}>Muscle</div>
                        <div className="font-mono text-lg font-black text-white">{musKg.toFixed(1)} <span className="text-xs text-slate-500">kg</span></div>
                      </div>
                      <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <div className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">Bone/Organs</div>
                        <div className="font-mono text-lg font-black text-white">{boneKg!.toFixed(1)} <span className="text-xs text-slate-500">kg</span></div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl p-3" style={{ background: 'rgba(0,255,136,0.06)' }}>
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#00ff88' }}>Lean</div>
                      <div className="font-mono text-lg font-black text-white">{(totalKg - fatKg).toFixed(1)} <span className="text-xs text-slate-500">kg</span></div>
                    </div>
                  )}
                </div>

                {/* Water — shown separately as it's distributed across all tissues */}
                {wat != null && (
                  <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.1)' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#3b82f6' }}>Total Body Water</div>
                        <div className="text-[9px] text-slate-500">Distributed across muscle, organs & fat</div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-xl font-black text-white">{wat.toFixed(1)}<span className="text-sm text-slate-500">%</span></span>
                        <div className="font-mono text-[10px] text-slate-400">{((wat / 100) * totalKg).toFixed(1)} kg</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Info */}
                <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="text-[10px] text-slate-500 font-medium leading-relaxed">
                    💡 1 kg of fat ≈ 1.1L volume vs 1 kg of muscle ≈ 0.9L — that's why
                    body composition matters more than scale weight. Water is distributed
                    across all tissues (~75% of muscle is water).
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ═══ BODY SILHOUETTE ═══ */}
      <BodySilhouette entries={p.entries} gender={p.gender} />

      {/* ═══ MEASUREMENTS ═══ */}
      {measurements.some(m => last[m.key] != null) && (
        <div className="glass rounded-[var(--r-lg)] p-5 anim-fade d5">
          <h3 className="font-black text-sm mb-4">📐 Measurements (cm)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {measurements.map(m => {
              const val = last[m.key] as number | null;
              const fv = first[m.key] as number | null;
              const d = delta(val, fv);
              if (val == null) return null;
              return (
                <div key={m.key} className="text-center">
                  <div className="font-mono text-xl font-black">{fmt(val, 1)}</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5 font-bold">{m.label}</div>
                  {d != null && (
                    <span className="font-mono text-[10px] font-bold" style={{ color: deltaColor(d, m.key === 'talie') }}>
                      {d > 0 ? '+' : ''}{d.toFixed(1)} cm
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ LOG TABLE ═══ */}
      <div className="glass rounded-[var(--r-lg)] p-4 anim-fade d6">
        <h3 className="font-black text-sm mb-3">📋 Measurement History</h3>
        <div className="overflow-x-auto">
          <table className="lb-table">
            <thead>
              <tr><th>Date</th><th>Kg</th><th>BF%</th><th>Visc.</th><th>Muscle</th><th>Water</th></tr>
            </thead>
            <tbody>
              {[...p.entries].reverse().map((e, i) => (
                <tr key={i}>
                  <td className="text-xs font-medium" style={{ fontFamily: 'Montserrat', color: 'var(--text2)' }}>
                    {new Date(e.date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </td>
                  <td>{fmt(e.kg)}</td><td>{fmt(e.bodyFat)}</td>
                  <td>{fmt(e.visceralFat, 0)}</td><td>{fmt(e.muscle)}</td><td>{fmt(e.water)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MiniChart({ entries, metricKey, label, unit, color }: {
  entries: any[]; metricKey: MetricKey; label: string; unit: string; color: string;
}) {
  const data = entries.filter(e => e[metricKey] != null).map(e => ({
    date: new Date(e.date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }),
    val: e[metricKey] as number,
  }));
  if (data.length < 2) return null;
  return (
    <div className="glass rounded-[var(--r-lg)] p-5 anim-fade d3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-sm">{label}</h3>
        <span className="chip bg-white/5 text-slate-400 font-mono text-[10px]">{unit}</span>
      </div>
      <div className="chart-fluid" style={{ height: 180, ['--chart-accent' as any]: `${color}66` }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`g-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}>
                  <animate attributeName="stop-opacity" values="0.3;0.12;0.3" dur="4s" repeatCount="indefinite" />
                </stop>
                <stop offset="50%" stopColor={color} stopOpacity={0.08}>
                  <animate attributeName="stop-opacity" values="0.08;0.2;0.08" dur="4s" begin="1s" repeatCount="indefinite" />
                </stop>
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
              <filter id={`glow-${metricKey}`}>
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 12, fontSize: 12, fontFamily: 'JetBrains Mono' }}
              formatter={(v: any) => [`${v.toFixed(1)} ${unit}`, label]} />
            <Area type="monotone" dataKey="val" stroke={color} strokeWidth={2.5} fill={`url(#g-${metricKey})`}
              activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, filter: `url(#glow-${metricKey})` }} />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Seg({ val, label, bg, dark }: { val: number; label: string; bg: string; dark?: boolean }) {
  return (
    <div className="flex items-center justify-center font-mono text-[10px] font-bold"
      style={{ width: `${val}%`, background: bg, color: dark ? '#0f172a' : '#fff' }}>
      {val > 10 ? `${val.toFixed(1)}%` : ''}
    </div>
  );
}

function Leg({ c, l }: { c: string; l: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
      <span className="text-xs font-mono text-slate-400">{l}</span>
    </div>
  );
}