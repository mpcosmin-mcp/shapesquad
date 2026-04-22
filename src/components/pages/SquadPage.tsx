import { useMemo, useState } from 'react';
import { Heart, Award } from 'lucide-react';
import { Person, PERSON_COLORS, calcStreak, getLikeCount, hasLiked, getPersonInsight } from '../../lib/shape';
import { getAdjective } from '../../App';

interface Props {
  people: Person[];
  allPeople: Person[];
  gender: string;
  onSelectPerson: (name: string) => void;
  likes: Record<string, string[]>;
  activePerson: string;
  onToggleLike: (target: string) => void;
}

function timeAgo(iso: string): string {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return 'azi';
  if (days === 1) return 'ieri';
  if (days < 7) return `acum ${days} zile`;
  if (days < 30) return `acum ${Math.round(days / 7)} săpt.`;
  return `acum ${Math.round(days / 30)} luni`;
}

function journeyMonths(p: Person): number {
  if (p.entries.length < 2) return 0;
  return Math.round((new Date(p.latest.date).getTime() - new Date(p.first.date).getTime()) / (86400000 * 30));
}

function activityDots(p: Person): boolean[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const m = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
    return p.entries.some(e => e.date.startsWith(key));
  });
}

/** Progress-based awards — reward IMPROVEMENT and EFFORT, not absolute values */
function getProgressAwards(people: Person[], likes: Record<string, string[]>) {
  const awards: { person: Person; title: string; emoji: string; color: string; detail: string }[] = [];
  const assigned = new Set<string>();

  // Best BF% improvement (first → latest) — rewarding the JOURNEY
  const byImprovement = [...people]
    .filter(p => p.entries.length >= 2 && p.first.bodyFat != null && p.latest.bodyFat != null)
    .map(p => ({ p, drop: p.first.bodyFat! - p.latest.bodyFat! }))
    .filter(x => x.drop > 0)
    .sort((a, b) => b.drop - a.drop);
  if (byImprovement[0]) {
    awards.push({ person: byImprovement[0].p, title: 'Cel mai bun progres', emoji: '🏆', color: '#ffd700', detail: `A îmbunătățit BF% cu ${byImprovement[0].drop.toFixed(1)} puncte` });
    assigned.add(byImprovement[0].p.name);
  }

  // Recent momentum — improved at last check-in
  const byRecent = [...people]
    .filter(p => p.previous && !assigned.has(p.name) && p.previous.bodyFat != null && p.latest.bodyFat != null)
    .map(p => ({ p, drop: p.previous!.bodyFat! - p.latest.bodyFat! }))
    .filter(x => x.drop > 0)
    .sort((a, b) => b.drop - a.drop);
  if (byRecent[0]) {
    awards.push({ person: byRecent[0].p, title: 'Pe val', emoji: '🔥', color: 'var(--neon-orange)', detail: 'Progres la ultimul check-in' });
    assigned.add(byRecent[0].p.name);
  }

  // Most dedicated — most check-ins (rewarding CONSISTENCY)
  const byDedication = [...people].filter(p => !assigned.has(p.name)).sort((a, b) => b.entries.length - a.entries.length);
  if (byDedication[0] && byDedication[0].entries.length >= 3) {
    awards.push({ person: byDedication[0], title: 'Cel mai dedicat', emoji: '💎', color: 'var(--neon-blue)', detail: `${byDedication[0].entries.length} check-in-uri` });
    assigned.add(byDedication[0].name);
  }

  // Longest streak — rewarding HABIT
  const byStreak = [...people].filter(p => !assigned.has(p.name))
    .map(p => ({ p, streak: calcStreak(p) }))
    .filter(x => x.streak.current > 0)
    .sort((a, b) => b.streak.current - a.streak.current);
  if (byStreak[0]) {
    awards.push({ person: byStreak[0].p, title: 'Streak master', emoji: '🔥', color: 'var(--neon-orange)', detail: `${byStreak[0].streak.current} luni consecutive` });
    assigned.add(byStreak[0].p.name);
  }

  // Squad favorite — most liked (rewarding COMMUNITY)
  const byLikes = [...people].filter(p => !assigned.has(p.name) && getLikeCount(likes, p.name) > 0)
    .sort((a, b) => getLikeCount(likes, b.name) - getLikeCount(likes, a.name));
  if (byLikes[0]) {
    awards.push({ person: byLikes[0], title: 'Squad favorite', emoji: '💕', color: '#ec4899', detail: `${getLikeCount(likes, byLikes[0].name)} like-uri` });
    assigned.add(byLikes[0].name);
  }

  return awards;
}

export default function SquadPage({ people, allPeople, gender, onSelectPerson, likes, activePerson, onToggleLike }: Props) {
  const [popTarget, setPopTarget] = useState('');

  // ── Ticker — progress stories, not comparisons ──
  const funFacts = useMemo(() => {
    const f: string[] = [];
    const total = people.reduce((s, p) => s + p.entries.length, 0);
    f.push(`📋 ${total} check-in-uri totale — every step counts!`);

    // Progress stories
    people.forEach(p => {
      if (p.entries.length >= 2 && p.first.bodyFat != null && p.latest.bodyFat != null) {
        const drop = p.first.bodyFat - p.latest.bodyFat;
        if (drop > 0.5) f.push(`💪 ${p.name} a îmbunătățit BF% cu ${drop.toFixed(1)} puncte de la start!`);
      }
    });

    const streaks = people.map(p => ({ name: p.name, streak: calcStreak(p) })).filter(x => x.streak.current > 0).sort((a, b) => b.streak.current - a.streak.current);
    streaks.slice(0, 2).forEach(s => f.push(`🔥 ${s.name}: ${s.streak.current} luni consecutive de check-in!`));

    const totalLikes = Object.values(likes).reduce((s, arr) => s + arr.length, 0);
    if (totalLikes > 0) f.push(`❤️ ${totalLikes} like-uri — echipa se susține!`);

    // Personality vibes
    const vibes: Record<string, string[]> = {
      Gaby: ['🏍️ Gaby: half gym bro, half Lego architect', '🧱 Gaby builds Lego sets heavier than his deadlifts'],
      Cata: ['🎮 Cata: SELECT * FROM gains WHERE player = \'CS legend\'', '🎯 Cata headshots in CS and in database optimization'],
      Clara: ['😴 Clara sleeps 9h and still outruns you', '🏃‍♀️ Clara: runs, sleeps, repeats'],
      Bogdan: ['🇮🇹 Bogdan: Italian soul trapped in a Romanian body', '🍕 Bogdan\'s heart rate spikes near pizza AND printers'],
      Lavinia: ['🐕 Lavinia: philosopher by day, Ari\'s servant by night', '🤔 Lavinia\'s deep convos burn more calories than cardio'],
      Cristi: ['🚗 Cristi: team leader, perfectionist', '👔 Cristi\'s car is cleaner than your code'],
      Adina: ['🌹 Adina: 20+ parfumes, 0 skipped gym days', '👗 Adina goes to the gym dressed better than you go to weddings'],
      Petrica: ['🤖 Petrica built this app instead of doing actual reps', '📱 Petrica spends more time on charts than on the treadmill', '💜 Petrica: vizionar digital, sportiv discutabil, prieten de nădejde', '🧠 Petrica nu scrie cod. Petrica are idei. AI-ul le transformă în pixeli.'],
      Stefi: ['🐍 Stefi has a snake. That\'s the warning.', '🍔 Stefi: small, unpredictable, hungry. Approach with food.'],
      Varamea: ['📺 Varamea: Survivor expert, TikTok scholar', '👫 Varamea & Buicu: the couple that TikToks together'],
    };
    const seed = new Date().getDate();
    people.forEach((p, i) => { const lines = vibes[p.name]; if (lines) f.push(lines[(seed + i) % lines.length]); });

    // AI fun facts — warm, not defensive
    const aiGems = [
      '🤖 Fun fact: acest dashboard e construit cu AI. Viziunea? A echipei. Tehnologia? Un instrument.',
      '🧠 O idee + instrumentele potrivite = progres. La sală și în tech.',
      '💜 ShapeSquad e locul nostru digital. Abia începe.',
      '⚡ 1% daily. La sală, la nutriție, la somn. Fiecare pas contează.',
      '🤝 Nu contează cum ajungi acolo. Contează că te miști.',
    ];
    f.push(aiGems[seed % aiGems.length]);
    return f;
  }, [people, likes]);

  // ── Progress awards ──
  const awards = useMemo(() => getProgressAwards(people, likes), [people, likes]);

  // ── Sorted alphabetically — everyone is equal ──
  const sorted = useMemo(() => [...people].sort((a, b) => a.name.localeCompare(b.name)), [people]);

  return (
    <div className="space-y-6">
      {/* ═══ MANIFEST — scurt, jmecher ═══ */}
      <div className="glass rounded-[var(--r-lg)] p-6 relative overflow-hidden anim-fade">
        <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full opacity-[0.05]" style={{ background: 'var(--neon-blue)' }} />
        <div className="absolute -left-8 -bottom-8 w-28 h-28 rounded-full opacity-[0.03]" style={{ background: 'var(--neon-green)' }} />
        <div className="relative">
          <h2 className="font-black text-xl md:text-2xl tracking-tight leading-tight">
            <span className="text-white">Nu ne comparăm. </span>
            <span className="bg-gradient-to-r from-[var(--neon-blue)] to-[var(--neon-green)] bg-clip-text text-transparent">Ne construim.</span>
            <span className="text-white"> Ne susținem.</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">
            Aici nu câștigă cine are cel mai mic BF%. Câștigă cine se prezintă. <strong className="text-slate-300">1% daily.</strong> 💪
          </p>
        </div>
      </div>

      {/* ═══ TICKER ═══ */}
      <div className="overflow-hidden rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex animate-ticker whitespace-nowrap py-2.5">
          {[...funFacts, ...funFacts].map((f, i) => (
            <span key={i} className="inline-block mx-6 text-[11px] font-bold text-slate-400 shrink-0">{f}</span>
          ))}
        </div>
      </div>

      {/* ═══ PROGRESS AWARDS — Celebrating effort & improvement ═══ */}
      {awards.length > 0 && (
        <div className="anim-fade">
          <h2 className="text-base font-black text-white uppercase tracking-tight mb-3 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" /> Premii Progres
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {awards.map((a, i) => {
              const ci = allPeople.indexOf(a.person);
              const color = PERSON_COLORS[ci % PERSON_COLORS.length];
              return (
                <button key={a.title}
                  onClick={() => onSelectPerson(a.person.name)}
                  className={`glass p-4 relative overflow-hidden trading-card anim-fade d${i+1} text-left`}>
                  <div className="accent-strip" style={{ background: a.color }} />
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{a.emoji}</span>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-tight">{a.title}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white"
                      style={{ background: color }}>{a.person.name[0]}</div>
                    <div className="text-sm font-black text-white truncate">{a.person.name}</div>
                  </div>
                  <div className="text-[10px] font-bold" style={{ color: a.color }}>{a.detail}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ ECHIPA — Each person's journey, no comparisons ═══ */}
      <div className="anim-fade d2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black text-white uppercase tracking-tight">Echipa</h2>
          {!activePerson && (
            <span className="text-[9px] text-slate-500 font-bold">💡 Alege profilul tau din Profile ca sa dai like-uri</span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((p, i) => {
            const ci = allPeople.indexOf(p);
            const color = PERSON_COLORS[ci % PERSON_COLORS.length];
            const adj = getAdjective(p.name, allPeople);
            const dots = activityDots(p);
            const streak = calcStreak(p);
            const likeCount = getLikeCount(likes, p.name);
            const iLiked = activePerson ? hasLiked(likes, activePerson, p.name) : false;
            const insight = getPersonInsight(p);
            const months = journeyMonths(p);

            // Mini progress — last check-in delta vs previous
            const prevEntry = p.previous;
            const bfDelta = (prevEntry?.bodyFat != null && p.latest.bodyFat != null)
              ? p.latest.bodyFat - prevEntry.bodyFat : null;
            const kgDelta = (prevEntry?.kg != null && p.latest.kg != null)
              ? p.latest.kg - prevEntry.kg : null;

            return (
              <div key={p.name}
                className={`glass rounded-[var(--r-lg)] p-5 relative overflow-hidden anim-slide d${Math.min(i+1,9)}`}>
                <div className="accent-strip" style={{ background: color, height: 3 }} />

                {/* ── Header: avatar + name + like ── */}
                <div className="flex items-start justify-between mb-3">
                  <button onClick={() => onSelectPerson(p.name)} className="flex items-center gap-3 text-left active:scale-[0.98] transition-transform">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black text-white shrink-0"
                      style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}>
                      {p.name[0]}
                    </div>
                    <div>
                      <div className="text-base font-black text-white">{p.name}</div>
                      <div className="text-[9px] text-slate-500">{adj}</div>
                    </div>
                  </button>

                  {/* Like button */}
                  {activePerson && activePerson !== p.name && (
                    <button
                      onClick={() => {
                        onToggleLike(p.name);
                        setPopTarget(p.name);
                        setTimeout(() => setPopTarget(''), 350);
                      }}
                      className={`like-btn ${iLiked ? 'liked' : ''} ${popTarget === p.name ? 'pop' : ''}`}>
                      <Heart className="w-3.5 h-3.5" fill={iLiked ? 'currentColor' : 'none'} />
                      {likeCount > 0 ? <span>{likeCount}</span> : <span className="text-[9px]">Like</span>}
                    </button>
                  )}
                  {(!activePerson || activePerson === p.name) && likeCount > 0 && (
                    <span className="text-[10px] font-bold text-pink-400 flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5" fill="currentColor" /> {likeCount}
                    </span>
                  )}
                </div>

                {/* ── Chips: streak, check-ins, months, deltas ── */}
                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  {streak.current > 0 && <span className="streak-badge">🔥 {streak.current}</span>}
                  <span className="chip text-[9px] bg-white/5 text-slate-500">
                    {p.entries.length} check-in{p.entries.length !== 1 ? '-uri' : ''}
                  </span>
                  {months > 0 && <span className="chip text-[9px] bg-white/5 text-slate-500">{months} luni</span>}
                  {bfDelta != null && bfDelta !== 0 && (
                    <span className="chip text-[9px]" style={{
                      background: bfDelta < 0 ? 'rgba(0,255,136,0.1)' : 'rgba(255,59,59,0.1)',
                      color: bfDelta < 0 ? 'var(--neon-green)' : 'var(--neon-red)',
                    }}>
                      BF {bfDelta > 0 ? '+' : ''}{bfDelta.toFixed(1)}%
                    </span>
                  )}
                  {kgDelta != null && kgDelta !== 0 && (
                    <span className="chip text-[9px] bg-white/5 text-slate-400">
                      {kgDelta > 0 ? '+' : ''}{kgDelta.toFixed(1)}kg
                    </span>
                  )}
                </div>

                {/* ── AI Insight — the story, not the numbers ── */}
                <div className="rounded-xl px-3 py-2.5 mb-3" style={{
                  background: insight.tone === 'good' ? 'rgba(0,255,136,0.05)' : insight.tone === 'warn' ? 'rgba(249,115,22,0.05)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${insight.tone === 'good' ? 'rgba(0,255,136,0.1)' : insight.tone === 'warn' ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.04)'}`,
                }}>
                  <div className="text-[10px] font-bold leading-relaxed" style={{ color: insight.tone === 'good' ? '#00ff88' : insight.tone === 'warn' ? '#f97316' : '#94a3b8' }}>
                    {insight.emoji} {insight.text}
                  </div>
                </div>

                {/* ── Activity dots — showing up is what matters ── */}
                <div className="flex items-center gap-1">
                  {dots.map((active, j) => (
                    <div key={j} className="flex-1 h-1 rounded-full"
                      style={{ background: active ? color : 'rgba(255,255,255,0.04)' }} />
                  ))}
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[8px] text-slate-600 font-mono">activitate ultimele 6 luni</span>
                  <span className="text-[9px] text-slate-500 font-mono">Ultimul log: {timeAgo(p.latest.date)}</span>
                </div>

                {/* ── View profile ── */}
                <button onClick={() => onSelectPerson(p.name)}
                  className="w-full mt-3 py-2 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  Vezi profilul complet →
                </button>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
