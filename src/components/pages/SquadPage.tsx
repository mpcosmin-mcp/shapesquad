import { useMemo, useState } from 'react';
import { Heart, Award, Zap } from 'lucide-react';
import { Person, PERSON_COLORS, calcXP, getTier, tierProgress, calcStreak, countFilledFields, getLikeCount, hasLiked, getPersonInsight, TIERS } from '../../lib/shape';
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
      {/* ═══ WELCOME / PHILOSOPHY ═══ */}
      <div className="glass rounded-[var(--r-lg)] p-5 relative overflow-hidden anim-fade">
        <div className="absolute -right-12 -top-12 w-32 h-32 rounded-full opacity-[0.04]" style={{ background: 'var(--neon-blue)' }} />
        <div className="flex items-start gap-4">
          <span className="text-3xl shrink-0 mt-0.5">⚡</span>
          <div>
            <h2 className="font-black text-base text-white mb-2">Nu ne comparăm. Ne susținem.</h2>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              ShapeSquad nu e despre cine are cel mai mic body fat sau cele mai bune numere.
              E despre a fi <strong className="text-slate-300">împreună</strong> pe drumul ăsta — să râdem,
              să creăm amintiri și să devenim, fiecare în ritmul propriu, o versiune mai bună a noastră.
              Aici premiem <strong className="text-slate-300">efortul</strong>, <strong className="text-slate-300">consistența</strong> și
              <strong className="text-slate-300"> curajul de a te prezenta</strong>. Fiecare check-in contează.
              Fiecare pas contează. 1% daily. 💪
            </p>
          </div>
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
            const xp = calcXP(p);
            const tier = getTier(xp.total);
            const progress = tierProgress(xp.total);
            const streak = calcStreak(p);
            const likeCount = getLikeCount(likes, p.name);
            const iLiked = activePerson ? hasLiked(likes, activePerson, p.name) : false;
            const insight = getPersonInsight(p);
            const months = journeyMonths(p);

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

                {/* ── Badges: engagement, not comparison ── */}
                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  <span className="tier-badge" style={{ background: `${tier.color}18`, color: tier.color }}>
                    {tier.icon} {tier.name}
                  </span>
                  {streak.current > 0 && <span className="streak-badge">🔥 {streak.current}</span>}
                  <span className="chip text-[9px] bg-white/5 text-slate-500">
                    {p.entries.length} check-in{p.entries.length !== 1 ? '-uri' : ''}
                  </span>
                  {months > 0 && <span className="chip text-[9px] bg-white/5 text-slate-500">{months} luni</span>}
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

                {/* ── XP bar (subtle — rewards engagement, not genetics) ── */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="xp-bar flex-1" style={{ height: 4 }}>
                    <div className="xp-bar-fill" style={{
                      width: `${progress * 100}%`,
                      background: `linear-gradient(90deg, ${tier.color}aa, ${tier.color}44)`,
                    }} />
                  </div>
                  <span className="font-mono text-[9px] font-bold text-slate-500">{xp.total.toLocaleString()} XP</span>
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

      {/* ═══ DESPRE SHAPESQUAD ═══ */}
      <PetricaMessage />

      {/* ═══ XP EXPLAINED — Clear, visible, no bullshit ═══ */}
      <div className="glass rounded-[var(--r-lg)] p-5 anim-fade d8">
        <div className="flex items-start gap-3 mb-4">
          <Zap className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-black text-sm text-white mb-1">Ce e XP-ul?</h3>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              XP-ul <strong className="text-slate-300">nu măsoară cât de fit ești</strong>. Măsoară cât de
              <strong className="text-slate-300"> prezent</strong> ești. Primești XP pentru că te prezinți,
              completezi datele, menții un streak, și te îmbunătățești față de tine —
              nu față de alții. Cineva cu 30% BF care vine lunar e mai valoros decât cineva cu 15% BF
              care a venit o dată.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
          {[
            { label: 'Check-in', xp: '+100', desc: 'Te-ai prezentat', icon: '📋' },
            { label: 'Date complete', xp: '+10/câmp', desc: 'Ai completat totul', icon: '📊' },
            { label: 'Streak', xp: '+50/lună', desc: 'Luni consecutive', icon: '🔥' },
            { label: 'Bun venit', xp: '+200', desc: 'Primul check-in', icon: '🎉' },
            { label: 'Prezență', xp: '+25/lună', desc: 'Luni active', icon: '🗓️' },
            { label: 'Progres', xp: '+150', desc: 'BF% îmbunătățit', icon: '💪' },
          ].map(b => (
            <div key={b.label} className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="text-lg mb-0.5">{b.icon}</div>
              <div className="font-mono text-xs font-black text-yellow-400">{b.xp}</div>
              <div className="text-[8px] text-white font-bold mt-0.5">{b.label}</div>
              <div className="text-[7px] text-slate-600 mt-0.5">{b.desc}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <span className="text-[9px] text-slate-500 font-bold shrink-0">NIVELURI:</span>
          {TIERS.map(t => (
            <span key={t.name} className="tier-badge" style={{ background: `${t.color}15`, color: t.color }}>
              {t.icon} {t.name} ({t.minXP === 5000 ? '5000+' : `${t.minXP}+`})
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Petrică's message — AI-polished with toggle to raw, plus easter egg */
function PetricaMessage() {
  const [showRaw, setShowRaw] = useState(false);
  const [easterEgg, setEasterEgg] = useState(0);

  return (
    <div className="glass rounded-[var(--r-lg)] p-5 relative overflow-hidden anim-fade d9">
      <div className="absolute -left-10 -bottom-10 w-28 h-28 rounded-full opacity-[0.03]" style={{ background: '#a855f7' }} />
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">💜</span>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2 gap-2">
            <h3 className="font-black text-xs text-slate-300">Un mesaj de la Petrică</h3>
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="text-[8px] font-bold px-2.5 py-1 rounded-lg transition-all text-left leading-relaxed"
              style={{
                background: showRaw ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.04)',
                color: showRaw ? '#a855f7' : '#64748b',
                border: `1px solid ${showRaw ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.06)'}`,
                maxWidth: 220,
              }}>
              {showRaw
                ? '🤖 OK, arată versiunea civilizată'
                : '✍️ Fii atent ce a scris Petrică de fapt. Credea că e jmeker și nu-și dă seama că eu salvez tot.'
              }
            </button>
          </div>

          {!showRaw ? (
            <>
              <p className="text-[10px] text-slate-500 leading-relaxed mb-2">
                Mă bucur să vă văd aici. Nu știu exact de ce ne place atât de mult chestia asta —
                poate pentru că băieții ne comparăm bicepsul și body fat-ul, fetele urmăriți atent cum
                se comportă corpul în timp — dar știu că <strong className="text-slate-300">ăsta e un punct comun
                unde am simțit togetherness</strong>. Și mie, cam asta îmi place cel mai mult.
              </p>
              <p className="text-[10px] text-slate-500 leading-relaxed mb-2">
                Încerc să construiesc cea mai bună platformă care să ne facă să râdem, să fim serioși
                la datele reale, să vorbim despre progres, să ne ajutăm, să devenim mai buni.
                E un domeniu la care sunt prezent destul de des în viața personală, și mă bucur
                că îl împărtășim.
              </p>
              <p className="text-[10px] text-slate-400 leading-relaxed mb-2">
                Much love. Nu la modul formal. <strong className="text-slate-300">Chiar vă iubesc</strong> — ca pe niște
                colegi, ca oameni. Dar ține doar de voi să continuați proiectul ăsta.
                E un "open source" pentru cine vrea să urce în tren. 🚂
              </p>
              <p className="text-[10px] text-slate-500 leading-relaxed italic">
                Da, e construit cu AI. Pentru că în 2025, dacă ai o idee și instrumentele potrivite,
                nu mai ai nevoie de o echipă de 10. Ai nevoie de viziune și de curajul să începi.
              </p>
              <div className="mt-2 text-[9px] text-slate-600 font-mono">— P.</div>
              <div className="mt-1 text-[8px] text-slate-700 italic">
                * textul original a fost procesat de AI. apasă butonul să vezi ce a scris Petrică de fapt.
              </div>
            </>
          ) : (
            <>
              {/* AI narrator intro */}
              <div className="rounded-xl p-2.5 mb-3" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.1)' }}>
                <p className="text-[9px] text-blue-400 leading-relaxed font-bold">
                  🤖 Salut. Sunt AI-ul. Petrică de-abia știe să deschidă GitHub, dar cumva
                  a reușit să-mi explice ce vrea și eu am construit tot. El crede că e "vizionarul".
                  Eu fac munca. Citiți mai jos ce a scris — fără corecturi, fără filtru.
                </p>
              </div>

              {/* Raw text */}
              <div className="rounded-xl p-3 mb-2" style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.1)' }}>
                <div className="text-[8px] font-bold text-purple-400 uppercase tracking-wider mb-2">
                  ✍️ ORIGINALUL — cum a scris Petrică, necenzurat:
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed" style={{ fontFamily: 'Montserrat' }}>
                  Salutare feciori și domnișoare. Mă bucur să văd interesul vostru în a avea grijă de
                  sănătatea voastră. Nu știu sincer de ce facem asta, de ce îmi place atât de mult și
                  cred că și vouă vă place. Ba că noi, feciorii ne comparăm bicepsu, bodyfat, ba că voi
                  femeile vă uitați atent la cum se comportă al vostru corp în timp. Ce știu este că asta
                  este un punct comun în echipă în care eu am văzut și am simțit togetherness. Și mie,
                  cam asta îmi place cel mai mult. Plus că este și un domeniu la care eu sunt prezent
                  destul de des în viața personală.
                </p>
                <p className="text-[10px] text-slate-400 leading-relaxed mt-2" style={{ fontFamily: 'Montserrat' }}>
                  Mă bucur din nou că facem asta împreună, încerc să vă construiesc cea mai bună
                  platformă care să ne facă să râdem, să fim și serioși la datele reale, să vorbim
                  despre progress, să ne ajutăm, să devenim mai buni.
                </p>
                <p className="text-[10px] text-slate-400 leading-relaxed mt-2" style={{ fontFamily: 'Montserrat' }}>
                  Much love. Nu la modu că vă iubesc. Da vă iubesc ca pe niște colegi, și ca oameni.
                  Adică chiar vă iubesc. Dar ține doar de voi să continuați acest proiect. Este un
                  "Opensource" pentru cine vrea să Onboard this train.
                </p>
                <p className="text-[10px] text-slate-500 leading-relaxed mt-2 italic" style={{ fontFamily: 'Montserrat' }}>
                  Și textul ăsta nu a fost produs de AI dar să fiți siguri că va fi analizat de AI
                  și o să scoată doar esența. Pentru că eu sunt Petrică și așa vorbesc.
                </p>
              </div>

              <div className="mt-2 text-[9px] text-slate-600 font-mono">— Petrică, unfiltered 💜</div>

              {/* Easter egg trigger — clicking "unfiltered" text 3 times */}
              <button
                onClick={() => {
                  const next = easterEgg + 1;
                  setEasterEgg(next);
                }}
                className="mt-2 text-[8px] text-slate-700 italic cursor-default select-none hover:text-slate-600 transition-colors"
                style={{ background: 'none', border: 'none', padding: 0 }}>
                {easterEgg < 3
                  ? '🤖 "de-abia știe să deschidă GitHub..." sure, sure.'
                  : easterEgg < 5
                  ? '🤔 stai... cine a dat instrucțiunile pentru tot ce vezi aici?'
                  : null
                }
              </button>

              {/* Easter egg revealed */}
              {easterEgg >= 5 && (
                <div className="mt-3 rounded-xl p-3 anim-fade" style={{
                  background: 'linear-gradient(135deg, rgba(255,215,0,0.06), rgba(168,85,247,0.06))',
                  border: '1px solid rgba(255,215,0,0.15)',
                }}>
                  <div className="text-[8px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#ffd700' }}>
                    🔓 EASTER EGG UNLOCKED
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Plot twist: AI-ul nu "a construit tot". <strong className="text-slate-200">Petrică a gândit fiecare
                    feature, fiecare decizie de design, fiecare text pe care îl citiți.</strong> AI-ul a fost
                    instrumentul — ca un cuțit bun în mâna unui bucătar. Fără bucătar, cuțitul stă în sertar.
                  </p>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-1.5">
                    Fiecare pagină, fiecare animație, fiecare mesaj personalizat, filozofia "nu ne comparăm,
                    ne susținem" — toate au venit din capul unui om care <strong className="text-slate-200">chiar se
                    gândește la voi</strong> și la cum să facă experiența asta mai bună.
                  </p>
                  <p className="text-[10px] leading-relaxed mt-1.5" style={{ color: '#ffd700' }}>
                    Deci data viitoare când ziceți "folosește prea mult AI" — gândiți-vă că
                    voi folosiți rezultatul. Și vi se pare mișto. 😏
                  </p>
                  <div className="mt-2 text-[8px] text-slate-600 font-mono">
                    — signed, AI-ul care recunoaște că Petrică e 🧠 din spatele a tot 🤝
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
