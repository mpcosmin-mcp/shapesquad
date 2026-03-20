import { useState, useEffect, useCallback } from 'react';
import { Zap, User, Users, TrendingUp, Swords, ClipboardList, Plus } from 'lucide-react';
import { fetchAllData, groupByPerson, Entry, Person, PERSON_COLORS } from './lib/shape';
import MyProfilePage from './components/pages/MyProfilePage';
import SquadPage from './components/pages/SquadPage';
import TrendsPage from './components/pages/TrendsPage';
import ComparePage from './components/pages/ComparePage';
import HistoryPage from './components/pages/HistoryPage';
import InputPage from './components/pages/InputPage';

type View = 'profile' | 'squad' | 'trends' | 'compare' | 'history' | 'log';

const VIEWS: { id: View; label: string; Icon: any }[] = [
  { id: 'profile', label: 'Profile', Icon: User },
  { id: 'squad', label: 'Squad', Icon: Users },
  { id: 'trends', label: 'Trends', Icon: TrendingUp },
  { id: 'compare', label: 'Compare', Icon: Swords },
  { id: 'history', label: 'History', Icon: ClipboardList },
  { id: 'log', label: 'Log', Icon: Plus },
];

const ADJECTIVES = [
  '🍕 Belly Boss', '🦥 Lazy Legend', '⚡ The Progressive', '✨ Pure Talent',
  '🔥 Streak Master', '🧘 Zen Master', '🚀 Rocket', '🎯 The Sniper',
  '💎 Diamond Hands', '🌊 Surfer', '🦁 Beast Mode', '🎪 Showoff',
];

export function getAdjective(name: string, people: Person[]): string {
  const sorted = [...people].filter(p => p.latest.bodyFat != null);
  const byBf = sorted.sort((a, b) => (a.latest.bodyFat ?? 99) - (b.latest.bodyFat ?? 99));
  const byCount = [...people].sort((a, b) => b.entries.length - a.entries.length);

  let bestImproved = '', bestDrop = 0;
  people.filter(p => p.entries.length > 1).forEach(p => {
    const f = p.entries[0].bodyFat, l = p.latest.bodyFat;
    if (f != null && l != null && f - l > bestDrop) { bestDrop = f - l; bestImproved = p.name; }
  });

  if (name === bestImproved) return '⚡ The Progressive';
  if (byBf.length && byBf[0].name === name) return '✨ Pure Talent';
  if (byBf.length && byBf[byBf.length - 1].name === name) return '🍕 Belly Boss';
  if (byCount.length && byCount[0].name === name) return '🔥 Streak Master';
  if (byCount.length && byCount[byCount.length - 1].name === name) return '🦥 Lazy Legend';

  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return ADJECTIVES[hash % ADJECTIVES.length];
}

export default function App() {
  const [view, setView] = useState<View>('squad');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePerson, setActivePerson] = useState('');
  const [gender, setGender] = useState<'all' | 'M' | 'F'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchAllData();
    setEntries(data);
    const ppl = groupByPerson(data);
    setPeople(ppl);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, []);

  const filtered = gender === 'all' ? people : people.filter(p => p.gender === gender);
  const active = activePerson ? (people.find(p => p.name === activePerson) || null) : null;

  const selectPerson = (name: string) => { setActivePerson(name); setView('profile'); };
  const resetHome = () => { setView('squad'); setActivePerson(''); setGender('all'); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const page = () => {
    if (loading) return <Loader />;
    switch (view) {
      case 'profile': return <MyProfilePage person={active} people={people} onSelect={selectPerson} />;
      case 'squad': return <SquadPage people={filtered} allPeople={people} gender={gender} onSelectPerson={selectPerson} />;
      case 'trends': return <TrendsPage people={filtered} allPeople={people} activePerson={activePerson || (people[0]?.name ?? '')} />;
      case 'compare': return <ComparePage people={filtered} allPeople={people} />;
      case 'history': return <HistoryPage entries={entries} people={people} />;
      case 'log': return <InputPage people={people} onSubmitted={load} />;
    }
  };

  return (
    <div className="min-h-screen relative" style={{ zIndex: 1 }}>
      {/* ═══ HEADER ═══ */}
      <header className="sticky top-0 z-50" style={{ background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-3 md:px-4 h-14 flex items-center justify-between gap-2">
          {/* Logo = hard reset */}
          <button onClick={resetHome} className="flex items-center gap-2 shrink-0 active:scale-95 transition-transform">
            <Zap className="w-6 h-6 text-yellow-400 fill-yellow-400" />
            <span className="font-black text-lg tracking-tight">
              SHAPE<span className="text-[var(--neon-blue)] tracking-widest">SQUAD</span>
            </span>
          </button>

          {/* Gender toggle */}
          <div className="gender-toggle shrink-0">
            {(['all', 'M', 'F'] as const).map(g => (
              <button key={g} onClick={() => { setGender(g); if (view === 'profile') setView('squad'); }}
                className={`gender-btn ${gender === g
                  ? g === 'F' ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/20'
                    : g === 'M' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-white/10 text-white'
                  : 'text-slate-400'
                }`}>
                {g === 'all' ? 'ALL' : g === 'M' ? '♂' : '♀'}
              </button>
            ))}
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 shrink-0">
            {VIEWS.map(v => (
              <button key={v.id} onClick={() => setView(v.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  view === v.id ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}>
                <v.Icon className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">{v.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ═══ CONTENT ═══ */}
      <main className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-6 content-safe relative" style={{ zIndex: 1 }}>
        {page()}
      </main>

      {/* ═══ MOBILE NAV ═══ */}
      <nav className="mob-nav">
        {VIEWS.map(v => (
          <button key={v.id} onClick={() => setView(v.id)}
            className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xl min-w-[44px] active:scale-90 transition-transform ${
              view === v.id ? 'text-blue-400' : 'text-slate-500'
            }`}>
            <v.Icon className="w-5 h-5" />
            <span className="text-[8px] font-bold leading-none">{v.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer - hidden on mobile (nav covers it) */}
      <footer className="hidden md:block max-w-7xl mx-auto py-6 text-center text-slate-600 text-xs font-medium">
        Creat pentru cei care transpiră la sală și cei care transpiră căutând telecomanda. 🍕✨
      </footer>
    </div>
  );
}

function Loader() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <Zap className="w-10 h-10 text-yellow-400 fill-yellow-400 float" />
      <p className="text-slate-500 text-sm font-bold">Loading squad data…</p>
    </div>
  );
}