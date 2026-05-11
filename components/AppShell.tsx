'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MessageSquare, Users, Activity, PlusCircle, LogOut, ChevronDown, Home } from 'lucide-react';
import ChatPanel from './ChatPanel';
import ThemeToggle from './ThemeToggle';
import OnboardingPicker from './OnboardingPicker';
import { useActiveUser } from '@/lib/useActiveUser';
import { useShapeData } from '@/lib/useShapeData';
import { PERSON_COLORS } from '@/lib/shape';

const PUBLIC_NAV = [
  { href: '/', label: 'Eu', icon: Home },
  { href: '/squad', label: 'Squad', icon: Users },
  { href: '/progres', label: 'Progres', icon: Activity },
];

const ADMIN_NAV = [{ href: '/log', label: 'Log', icon: PlusCircle }];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeUser, setActiveUser, mounted, isAdmin } = useActiveUser();
  const { people } = useShapeData();
  const [chatOpen, setChatOpen] = useState(false);
  const [isLarge, setIsLarge] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsLarge(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  // ═══ Onboarding gate ═══
  if (mounted && !activeUser) {
    return <OnboardingPicker />;
  }

  // Loading state before mounted
  if (!mounted) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="text-fg-muted font-display italic anim-pulse">Loading...</div>
      </div>
    );
  }

  const dockRight = chatOpen && isLarge;

  // Find active user's person record + color
  const me = people.find((p) => p.name === activeUser);
  const myColor = me ? PERSON_COLORS[people.indexOf(me) % PERSON_COLORS.length] : 'var(--bronze)';

  const navItems = isAdmin ? [...PUBLIC_NAV, ...ADMIN_NAV] : PUBLIC_NAV;

  return (
    <div
      className="h-screen flex flex-col relative"
      style={{
        paddingRight: dockRight ? '420px' : '0px',
        transition: 'padding-right 280ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* ═══ TOP NAV ═══ */}
      <header className="shrink-0 px-4 sm:px-5 py-3 flex items-center justify-between gap-2 relative z-20">
        <Link href="/" className="flex items-baseline gap-0.5 group shrink-0">
          <span className="text-lg sm:text-xl font-semibold tracking-tight text-fg leading-none">
            shape
          </span>
          <span className="text-lg sm:text-xl font-semibold tracking-tight text-fg-muted leading-none">
            squad
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 p-1 rounded-full bg-card border border-border shadow-panel">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={`nav-pill ${active ? 'active' : ''}`}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          {/* ═══ Squad AI — refined accent button ═══ */}
          <button
            onClick={() => setChatOpen((v) => !v)}
            className={`flex items-center gap-1.5 h-9 px-3 rounded-md text-xs font-medium transition-all border ${
              chatOpen
                ? 'bg-fg text-bg border-transparent'
                : 'bg-card border-border text-fg hover:border-border-strong hover:bg-card-hover'
            }`}
            aria-label="Squad AI Coach"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Squad AI</span>
          </button>

          <ThemeToggle />

          {/* ═══ Active user avatar / menu ═══ */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 h-9 pl-1 pr-2 rounded-md bg-card border border-border hover:border-border-strong transition-all"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                style={{ background: myColor }}
              >
                {activeUser[0]}
              </div>
              <span className="hidden sm:inline text-xs font-medium text-fg">{activeUser}</span>
              <ChevronDown className="w-3 h-3 text-fg-muted" />
            </button>

            {menuOpen && (
              <div className="absolute top-full right-0 mt-1.5 w-56 card card-lifted p-1 z-30 anim-scale">
                <div className="px-3 py-2 border-b border-[var(--border)]">
                  <div className="text-[9px] font-semibold text-fg-muted uppercase tracking-wider">
                    Logat ca
                  </div>
                  <div className="text-sm font-medium text-fg">{activeUser}</div>
                  {isAdmin && (
                    <div className="text-[9px] text-warn font-mono mt-0.5">⚡ admin</div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push(`/profile?name=${encodeURIComponent(activeUser)}`);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-fg hover:bg-[var(--card-hover)] rounded-md font-medium flex items-center gap-2"
                >
                  <span>👤 Profilul meu</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setActiveUser('');
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-fg-muted hover:text-fg hover:bg-[var(--card-hover)] rounded-md font-medium flex items-center gap-2"
                >
                  <LogOut className="w-3 h-3" /> Schimbă profil
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ═══ MAIN ═══ */}
      <main className="flex-1 min-h-0 overflow-hidden px-4 sm:px-5 pb-4 relative z-10">
        {children}
      </main>

      {/* ═══ MOBILE BOTTOM NAV ═══ */}
      <nav className="md:hidden shrink-0 flex items-center justify-around px-2 py-1.5 pb-safe bg-bg-elevated border-t border-border relative z-10">
        {navItems.map(({ href, label, icon: Icon }) => {
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

      {/* ═══ SQUAD AI CHAT ═══ */}
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} isLarge={isLarge} />
    </div>
  );
}
