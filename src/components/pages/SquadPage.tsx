import { useMemo, useRef, useState } from 'react';
import { Users } from 'lucide-react';
import { Person, PERSON_COLORS } from '../../lib/shape';
import { getAdjective } from '../../App';

interface Props { people: Person[]; allPeople: Person[]; gender: string; onSelectPerson: (name: string) => void; }

/** Relative time label */
function timeAgo(iso: string): string {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return 'azi';
  if (days === 1) return 'ieri';
  if (days < 7) return `acum ${days} zile`;
  if (days < 30) return `acum ${Math.round(days / 7)} săpt.`;
  return `acum ${Math.round(days / 30)} luni`;
}

/** Journey months span */
function journeyMonths(p: Person): number {
  if (p.entries.length < 2) return 0;
  return Math.round((new Date(p.latest.date).getTime() - new Date(p.first.date).getTime()) / (86400000 * 30));
}

/** Activity dots — last 6 months */
function activityDots(p: Person): boolean[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const m = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
    return p.entries.some(e => e.date.startsWith(key));
  });
}

export default function SquadPage({ people, allPeople, gender, onSelectPerson }: Props) {
  // ── Stats (engagement-focused) ──
  const stats = useMemo(() => {
    const total = people.reduce((s, p) => s + p.entries.length, 0);
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const activeThisMonth = people.filter(p => p.entries.some(e => e.date.startsWith(thisMonth))).length;
    const earliest = people.reduce((min, p) => p.first.date < min ? p.first.date : min, people[0]?.first.date || '');
    const latest = people.reduce((max, p) => p.latest.date > max ? p.latest.date : max, people[0]?.latest.date || '');
    return { count: people.length, total, activeThisMonth, earliest, latest };
  }, [people]);

  // ── Celebration ticker ──
  const funFacts = useMemo(() => {
    const f: string[] = [];
    f.push(`📋 ${stats.total} check-in-uri totale — echipa se mișcă!`);
    const most = [...people].sort((a, b) => b.entries.length - a.entries.length)[0];
    if (most) f.push(`📊 ${most.name} = data nerd (${most.entries.length} check-in-uri)`);
    if (stats.activeThisMonth > 0) f.push(`✅ ${stats.activeThisMonth} persoane active luna asta`);
    const longest = [...people].filter(p => p.entries.length >= 2)
      .sort((a, b) => journeyMonths(b) - journeyMonths(a))[0];
    if (longest) f.push(`🛡️ ${longest.name} — pe drum de ${journeyMonths(longest)} luni!`);
    const newest = [...people].sort((a, b) => b.first.date.localeCompare(a.first.date))[0];
    if (newest) f.push(`🌱 Cel mai nou membru: ${newest.name}. Bine ai venit!`);

    // Personality vibes
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
    const seed = new Date().getDate();
    people.forEach((p, i) => {
      const lines = vibes[p.name];
      if (lines) f.push(lines[(seed + i) % lines.length]);
    });

    f.push(`👥 Squad: ${people.filter(p => p.gender === 'M').length}♂ + ${people.filter(p => p.gender === 'F').length}♀ = ${people.length} oameni faini`);
    return f;
  }, [people, stats]);

  // ── Effort-based Awards ──
  const personAwards = useMemo(() => {
    const result: { person: Person; title: string; emoji: string; color: string; stat: string }[] = [];
    const assigned = new Set<string>();

    // Streak Machine — most check-ins
    const byCount = [...people].sort((a, b) => b.entries.length - a.entries.length);
    if (byCount[0]) {
      result.push({ person: byCount[0], title: 'Streak Machine', emoji: '🔥', color: 'var(--neon-orange)', stat: `${byCount[0].entries.length} check-in-uri` });
      assigned.add(byCount[0].name);
    }

    // The Veteran — longest journey
    const bySpan = [...people].filter(p => p.entries.length >= 2 && !assigned.has(p.name))
      .sort((a, b) => journeyMonths(b) - journeyMonths(a));
    if (bySpan[0]) {
      result.push({ person: bySpan[0], title: 'The Veteran', emoji: '🛡️', color: 'var(--neon-blue)', stat: `${journeyMonths(bySpan[0])} luni` });
      assigned.add(bySpan[0].name);
    }

    // Fresh Start — newest
    const byNew = [...people].filter(p => !assigned.has(p.name))
      .sort((a, b) => b.first.date.localeCompare(a.first.date));
    if (byNew[0]) {
      result.push({ person: byNew[0], title: 'Fresh Start', emoji: '🌱', color: 'var(--neon-green)', stat: `din ${new Date(byNew[0].first.date).toLocaleDateString('ro-RO', { month: 'short', year: '2-digit' })}` });
      assigned.add(byNew[0].name);
    }

    // All-In — most complete data per entry
    const completeness = people.filter(p => !assigned.has(p.name)).map(p => {
      const avg = p.entries.reduce((s, e) => {
        let c = 0;
        if (e.kg != null) c++; if (e.bodyFat != null) c++; if (e.muscle != null) c++;
        if (e.water != null) c++; if (e.visceralFat != null) c++;
        if (e.biceps != null) c++; if (e.spate != null) c++; if (e.piept != null) c++;
        if (e.talie != null) c++; if (e.fesieri != null) c++;
        return s + c;
      }, 0) / p.entries.length;
      return { p, avg };
    }).sort((a, b) => b.avg - a.avg);
    if (completeness[0]) {
      result.push({ person: completeness[0].p, title: 'All-In', emoji: '📊', color: 'var(--neon-purple)', stat: `${completeness[0].avg.toFixed(1)} câmpuri/log` });
      assigned.add(completeness[0].p.name);
    }

    // Steady Pulse — most regular cadence
    const cadence = people.filter(p => p.entries.length >= 3 && !assigned.has(p.name)).map(p => {
      const dates = p.entries.map(e => new Date(e.date).getTime()).sort((a, b) => a - b);
      const gaps = dates.slice(1).map((d, i) => (d - dates[i]) / 86400000);
      const avg = gaps.reduce((s, g) => s + g, 0) / gaps.length;
      const std = Math.sqrt(gaps.reduce((s, g) => s + (g - avg) ** 2, 0) / gaps.length);
      return { p, std, avg };
    }).sort((a, b) => a.std - b.std);
    if (cadence[0]) {
      result.push({ person: cadence[0].p, title: 'Steady Pulse', emoji: '💓', color: '#ec4899', stat: `~${Math.round(cadence[0].avg)}d între loguri` });
      assigned.add(cadence[0].p.name);
    }

    // Comeback Kid — biggest gap then returned
    const comebacks = people.filter(p => p.entries.length >= 2 && !assigned.has(p.name)).map(p => {
      const dates = p.entries.map(e => new Date(e.date).getTime()).sort((a, b) => a - b);
      let maxGap = 0;
      dates.slice(1).forEach((d, i) => { maxGap = Math.max(maxGap, (d - dates[i]) / 86400000); });
      return { p, maxGap };
    }).filter(x => x.maxGap > 30).sort((a, b) => b.maxGap - a.maxGap);
    if (comebacks[0]) {
      result.push({ person: comebacks[0].p, title: 'Comeback Kid', emoji: '⚡', color: '#facc15', stat: `a revenit după ${Math.round(comebacks[0].maxGap)}d` });
      assigned.add(comebacks[0].p.name);
    }

    // Remaining get Squad Member
    const extras = [
      { title: 'Squad Spirit', emoji: '⭐', color: '#06b6d4' },
      { title: 'On The Rise', emoji: '🚀', color: '#fb923c' },
      { title: 'Diamond Hands', emoji: '💎', color: '#818cf8' },
      { title: 'Zen Mode', emoji: '🧘', color: '#a78bfa' },
      { title: 'Rising Star', emoji: '🌟', color: '#eab308' },
    ];
    let ei = 0;
    people.filter(p => !assigned.has(p.name)).forEach(p => {
      const e = extras[ei++ % extras.length];
      result.push({ person: p, title: e.title, emoji: e.emoji, color: e.color, stat: `${p.entries.length} check-in-uri` });
    });
    return result;
  }, [people]);

  // ── Drag scroll for awards carousel ──
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

  // Sorted alphabetically — no ranking
  const sorted = useMemo(() => [...people].sort((a, b) => a.name.localeCompare(b.name)), [people]);

  return (
    <div className="space-y-5">
      {/* ═══ CELEBRATION TICKER ═══ */}
      <div className="overflow-hidden rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex animate-ticker whitespace-nowrap py-2.5">
          {[...funFacts, ...funFacts].map((f, i) => (
            <span key={i} className="inline-block mx-6 text-[11px] font-bold text-slate-400 shrink-0">{f}</span>
          ))}
        </div>
      </div>

      {/* ═══ AWARDS CAROUSEL ═══ */}
      <div>
        <h3 className="font-black text-sm mb-3 flex items-center gap-2">🏅 Squad Achievements</h3>
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

      {/* ═══ STATS ═══ */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 anim-fade d5">
        {[
          { l: 'Membri', v: String(stats.count), c: 'var(--neon-blue)' },
          { l: 'Check-ins', v: String(stats.total), c: 'var(--neon-green)' },
          { l: 'Activi luna asta', v: String(stats.activeThisMonth), c: 'var(--neon-orange)' },
          { l: 'Avg / pers.', v: (stats.total / Math.max(stats.count, 1)).toFixed(1), c: 'var(--neon-purple)' },
          { l: 'Tracking din', v: new Date(stats.earliest).toLocaleDateString('ro-RO', { month: 'short', year: '2-digit' }), c: '#64748b' },
          { l: 'Ultimul log', v: timeAgo(stats.latest), c: 'var(--neon-green)' },
        ].map(s => (
          <div key={s.l} className="glass rounded-[var(--r)] p-3 text-center">
            <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">{s.l}</div>
            <div className="font-mono text-lg font-black" style={{ color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* ═══ THE SQUAD ═══ */}
      <div className="anim-fade d7">
        <h2 className="text-base md:text-xl font-black text-white uppercase tracking-tight mb-3 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" /> The Squad
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {sorted.map((p, i) => {
            const ci = allPeople.indexOf(p);
            const color = PERSON_COLORS[ci % PERSON_COLORS.length];
            const adj = getAdjective(p.name, allPeople);
            const months = journeyMonths(p);
            const dots = activityDots(p);
            return (
              <button key={p.name} onClick={() => onSelectPerson(p.name)}
                className={`glass p-4 text-left active:scale-[0.98] transition-transform anim-slide d${Math.min(i+1,9)} relative overflow-hidden`}>
                <div className="accent-strip" style={{ background: color }} />
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black text-white shrink-0"
                    style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}>
                    {p.name[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">{p.name}</div>
                    <div className="text-[9px] text-slate-500 truncate">{adj}</div>
                  </div>
                </div>

                {/* Journey info */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-slate-500 font-bold">Check-ins</span>
                    <span className="text-[11px] font-mono font-black" style={{ color }}>{p.entries.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-slate-500 font-bold">Journey</span>
                    <span className="text-[11px] font-mono font-black text-slate-300">
                      {months > 0 ? `${months} luni` : 'nou'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-slate-500 font-bold">Ultimul log</span>
                    <span className="text-[10px] font-mono text-slate-400">{timeAgo(p.latest.date)}</span>
                  </div>
                </div>

                {/* Activity dots — last 6 months */}
                <div className="flex items-center gap-1">
                  {dots.map((active, j) => (
                    <div key={j} className="flex-1 h-1.5 rounded-full"
                      style={{ background: active ? color : 'rgba(255,255,255,0.06)' }} />
                  ))}
                </div>
                <div className="text-[7px] text-slate-600 mt-1 text-center font-mono">ultimele 6 luni</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
