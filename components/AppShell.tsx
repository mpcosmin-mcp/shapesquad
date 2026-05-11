'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, MessageSquare, Users, User, Activity, PlusCircle } from 'lucide-react';
import ChatPanel from './ChatPanel';

const NAV = [
  { href: '/', label: 'Squad', icon: Users },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/progres', label: 'Progres', icon: Activity },
  { href: '/log', label: 'Log', icon: PlusCircle },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [chatOpen, setChatOpen] = useState(false);
  const [isLarge, setIsLarge] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsLarge(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const dockRight = chatOpen && isLarge;

  return (
    <div
      className="h-screen flex flex-col relative"
      style={{
        paddingRight: dockRight ? '400px' : '0px',
        transition: 'padding-right 220ms cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* ═══ TOP NAV ═══ */}
      <header className="shrink-0 px-4 py-3 flex items-center justify-between relative z-10">
        <Link href="/" className="flex items-center gap-2 group">
          <Zap className="w-6 h-6 text-yellow-400 group-hover:scale-110 transition-transform" fill="currentColor" />
          <span className="font-black text-lg tracking-tight">
            <span className="text-white">SHAPE</span>
            <span className="bg-gradient-to-r from-[var(--neon-blue)] to-[var(--neon-green)] bg-clip-text text-transparent">SQUAD</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 glass px-1 py-1 rounded-full">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                  active ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => setChatOpen((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            chatOpen
              ? 'bg-gradient-to-r from-[var(--neon-blue)] to-[var(--neon-purple)] text-white'
              : 'glass text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">AI</span>
        </button>
      </header>

      {/* ═══ MAIN — flex-1, NO scroll ═══ */}
      <main className="flex-1 min-h-0 overflow-hidden px-4 pb-4 relative z-10">
        {children}
      </main>

      {/* ═══ MOBILE BOTTOM NAV ═══ */}
      <nav className="md:hidden shrink-0 flex items-center justify-around py-1.5 px-2 glass border-t border-white/[0.04]">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all ${
                active ? 'text-white' : 'text-slate-500'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[9px] font-bold">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ═══ CHAT PANEL ═══ */}
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} isLarge={isLarge} />
    </div>
  );
}
