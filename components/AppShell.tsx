'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, Users, User, Activity, PlusCircle } from 'lucide-react';
import ChatPanel from './ChatPanel';
import ThemeToggle from './ThemeToggle';

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
        paddingRight: dockRight ? '420px' : '0px',
        transition: 'padding-right 280ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* ═══ TOP NAV ═══ */}
      <header className="shrink-0 px-5 py-3 flex items-center justify-between relative z-10">
        <Link href="/" className="flex items-baseline gap-1 group">
          <span className="font-display text-2xl font-black tracking-tight text-fg leading-none">
            Shape
          </span>
          <span className="font-display text-2xl font-black italic tracking-tight text-bronze leading-none">
            Squad
          </span>
          <span className="font-mono text-[9px] text-fg-faint ml-1 tracking-widest hidden sm:inline">
            v2
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 p-1 rounded-full bg-card border border-border shadow-panel">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={`nav-pill ${active ? 'active' : ''}`}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setChatOpen((v) => !v)}
            className={`flex items-center gap-2 px-3 h-9 rounded-full text-xs font-semibold transition-all ${
              chatOpen
                ? 'bg-bronze text-white shadow-glow-bronze'
                : 'bg-card border border-border text-fg-dim hover:text-fg hover:border-border-strong shadow-panel'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Coach</span>
          </button>
        </div>
      </header>

      {/* ═══ MAIN — flex-1, NO scroll ═══ */}
      <main className="flex-1 min-h-0 overflow-hidden px-4 sm:px-5 pb-4 relative z-10">
        {children}
      </main>

      {/* ═══ MOBILE BOTTOM NAV ═══ */}
      <nav className="md:hidden shrink-0 flex items-center justify-around px-2 py-1.5 pb-safe bg-bg-elevated border-t border-border relative z-10">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-colors ${
                active ? 'text-fg' : 'text-fg-faint'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[9px] font-bold tracking-wide">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ═══ CHAT PANEL ═══ */}
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} isLarge={isLarge} />
    </div>
  );
}
