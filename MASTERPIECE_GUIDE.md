# ShapeSquad — Masterpiece UI Migration Guide

> **For the next Claude / dev who opens this project:** redesign the ShapeSquad UI to match the somn masterpiece — Slate 950 + Indigo, no-scroll dashboard, glassmorphism login, chat-in-left-sidebar.
>
> This guide is **self-contained**. You don't need access to the somn codebase. All code patterns are inlined below — copy, adapt, ship.
>
> Reference deploy of the design: <https://somn-xi.vercel.app>

---

## 1. Design Philosophy (the brief)

Four rules govern every visual decision:

1. **Dark Mode First.** Background = **Slate 950 (`#020617`)**, never pure black. Reduces eye fatigue and feels premium.
2. **Data-Ink Ratio.** No grid lines, no decorative chrome. Sparklines live inline in KPI cards. Numbers are the hero.
3. **Flow Calmant.** Generous whitespace. Information breathes. Anxiety from cramped scores is eliminated.
4. **Progressive Disclosure.** Glance (KPIs) → Context (Squad) → Deep Dive (history/insights). Three layers, single screen.

**Typography & Spacing > everything else.** When the numbers are huge and the spacing is generous, the app looks instantly professional. No fancy effects can compensate for cramped layout.

---

## 2. Color Tokens — copy verbatim into `app/globals.css`

Replace the existing `:root { ... }` and `html.light { ... }` blocks with these. **Do not edit the values** — they're balanced together.

```css
:root {
  /* Surfaces — Slate-based dark, NOT pure black */
  --bg:               #020617;  /* slate-950 */
  --bg-elevated:      #0b1120;  /* lifted slate */
  --card:             #0f172a;  /* slate-900 */
  --card-hover:       #131c2e;
  --border:           #1e293b;  /* slate-800 */
  --border-strong:    #334155;  /* slate-700 */
  --border-subtle:    #131c2e;

  /* Text */
  --fg:        #f1f5f9;  /* slate-100 */
  --fg-dim:    #cbd5e1;  /* slate-300 */
  --fg-muted:  #94a3b8;  /* slate-400 */
  --fg-faint:  #64748b;  /* slate-500 */

  /* Accent — INDIGO (the masterpiece brand color) */
  --accent:        #818cf8;  /* indigo-400 */
  --accent-soft:   #6366f1;  /* indigo-500 */
  --accent-deep:   #4f46e5;  /* indigo-600 */
  --accent-glow:   rgba(129, 140, 248, 0.22);

  /* Status — binary semantic (above target = green, below = red) */
  --good:  #34d399;  /* emerald-400 */
  --warn:  #fbbf24;  /* amber-400 */
  --bad:   #f87171;  /* red-400 */

  /* Tier colors (keep existing — they encode level identity) */
  --tier-rookie:   #94a3b8;
  --tier-regular:  #818cf8;
  --tier-pro:      #fbbf24;
  --tier-veteran:  #a855f7;
  --tier-legend:   #fde047;

  /* Radii / shadows / etc — leave existing values */
}

html.light {
  --bg:               #f8fafc;  /* slate-50 */
  --bg-elevated:      #ffffff;
  --card:             #ffffff;
  --card-hover:       #f1f5f9;
  --border:           #e2e8f0;  /* slate-200 */
  --border-strong:    #cbd5e1;
  --border-subtle:    #f1f5f9;

  --fg:        #0f172a;
  --fg-dim:    #1e293b;
  --fg-muted:  #64748b;
  --fg-faint:  #94a3b8;

  --accent:        #6366f1;  /* deeper for light bg contrast */
  --accent-soft:   #818cf8;
  --accent-deep:   #4338ca;
  --accent-glow:   rgba(99, 102, 241, 0.18);
}
```

**Why this works:** slate has a cool, neutral undertone (vs zinc's warmer feel). Indigo on slate produces an instantly "modern SaaS" vibe that reads as premium without screaming for attention. The status triad (emerald/amber/red) handles all signal needs.

---

## 3. Utility Classes — append to `globals.css`

These four utilities power the entire visual system. Append them after the existing classes.

```css
/* ── Aurora background — soft indigo glow blobs.
   Used on the login page only. Set on a positioned parent. */
.aurora {
  position: relative;
  background: var(--bg);
  overflow: hidden;
}
.aurora::before,
.aurora::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.aurora::before {
  background:
    radial-gradient(60% 50% at 15% 25%, rgba(99,102,241,0.22), transparent 60%),
    radial-gradient(50% 40% at 85% 75%, rgba(129,140,248,0.18), transparent 65%);
  filter: blur(40px);
}
.aurora::after {
  background:
    radial-gradient(40% 30% at 75% 20%, rgba(168,85,247,0.15), transparent 60%),
    radial-gradient(35% 30% at 20% 85%, rgba(56,189,248,0.12), transparent 60%);
  filter: blur(60px);
}
.aurora > * { position: relative; z-index: 1; }

html.light .aurora::before {
  background:
    radial-gradient(60% 50% at 15% 25%, rgba(99,102,241,0.18), transparent 60%),
    radial-gradient(50% 40% at 85% 75%, rgba(129,140,248,0.12), transparent 65%);
}
html.light .aurora::after {
  background:
    radial-gradient(40% 30% at 75% 20%, rgba(168,85,247,0.10), transparent 60%),
    radial-gradient(35% 30% at 20% 85%, rgba(56,189,248,0.08), transparent 60%);
}

/* ── Glassmorphism — semitransparent surface with blur.
   Used for the login card. */
.glass {
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  border: 1px solid rgba(148, 163, 184, 0.12);
}
html.light .glass {
  background: rgba(255, 255, 255, 0.65);
  border-color: rgba(15, 23, 42, 0.08);
}

/* ── KPI card — colored glowing bottom-border accent.
   Set --kpi-accent inline (style={{ '--kpi-accent': '#818cf8' }}). */
.kpi {
  position: relative;
  overflow: hidden;
}
.kpi::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: var(--kpi-accent, var(--accent));
  box-shadow: 0 0 24px var(--kpi-accent, var(--accent));
  opacity: 0.9;
}

/* ── Status pill — OPTIM / AVERAGE / POOR badges.
   Use as <span className="pill optim">Optim</span>. */
.pill {
  display: inline-flex;
  align-items: center;
  font-family: var(--font-mono);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid currentColor;
}
.pill.optim    { color: var(--good); background: color-mix(in srgb, var(--good) 12%, transparent); }
.pill.average  { color: var(--warn); background: color-mix(in srgb, var(--warn) 14%, transparent); }
.pill.poor     { color: var(--bad);  background: color-mix(in srgb, var(--bad)  14%, transparent); }
```

---

## 4. Layout Shift — top nav becomes LEFT sidebar

The somn masterpiece uses a Twitter-style left sidebar (260–280px) with the main feed centered next to it, and a chat panel that slides in from the LEFT (not right). Migrate `AppShell.tsx` accordingly.

**Target shape:**

```
┌──────────────┬────────────────────────────────────────────┐
│              │                                            │
│  SIDEBAR     │  MAIN (no scroll on lg+)                  │
│  ─────────   │                                            │
│  brand       │  ┌──────┬──────┬──────┐  ← Row 1: KPIs    │
│  profile     │  │ KPI  │ KPI  │ KPI  │                   │
│  ┌─────────┐ │  └──────┴──────┴──────┘                   │
│  │ Chat AI │ │  ┌────────────────────┐  ← Row 2: Squad   │
│  │ CTA     │ │  │ Tu · Cosmin · ...  │                   │
│  └─────────┘ │  └────────────────────┘                   │
│  Dashboard   │  ┌──────────┬─────────┐  ← Row 3: split   │
│  Squad       │  │ History  │ Insights│                   │
│  Progres     │  └──────────┴─────────┘                   │
│              │                                            │
│  theme/logout│                                            │
└──────────────┴────────────────────────────────────────────┘
```

**Key changes to `components/AppShell.tsx`:**

1. Remove the top-nav rendering. Replace with a flex-row containing a fixed-width Sidebar component + the main content.
2. Remove `paddingRight` chat-aware shrinking. The chat now slides from the LEFT (next to sidebar) over a dimmed backdrop — the main content does NOT shrink.
3. On `lg+`, wrap the page in `h-dvh overflow-hidden flex flex-row`. On mobile, fall back to `min-h-dvh flex-col` with a top bar that opens a drawer for the sidebar.
4. The mobile bottom-nav can stay (or be removed). The drawer pattern is cleaner.

**Skeleton:**

```tsx
// components/AppShell.tsx
return (
  <>
    <div className="min-h-dvh lg:h-dvh flex flex-col lg:flex-row lg:overflow-hidden">
      {/* Mobile top bar — hamburger + brand */}
      <header className="lg:hidden sticky top-0 z-30 ...">
        <button onClick={() => setDrawerOpen(true)}>≡</button>
        <span>shape</span>
      </header>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-[260px] xl:w-[280px] shrink-0 border-r border-[var(--border)]">
        <Sidebar onChatOpen={() => setChatOpen(true)} />
      </div>

      {/* Mobile drawer */}
      <aside className={`lg:hidden fixed inset-y-0 left-0 w-[300px] ... ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onChatOpen={() => setChatOpen(true)} onCloseDrawer={() => setDrawerOpen(false)} />
      </aside>

      {/* Main content — no body scroll on lg+ */}
      <main className="flex-1 min-w-0 lg:overflow-hidden lg:flex lg:flex-col px-3 sm:px-4 lg:px-6 py-3 lg:py-5 pb-safe">
        {children}
      </main>
    </div>

    {/* Chat panel — slides from LEFT, dims everything else */}
    <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
  </>
);
```

---

## 5. Sidebar Component — chat is the star

Create `components/Sidebar.tsx`. It owns: brand, profile card, **prominent chat CTA**, nav links, footer (theme + switch user).

The chat CTA is the **most visually prominent** item — indigo gradient, pulsing live dot, takes 60+ pixels of vertical space. Nobody can miss it.

```tsx
// components/Sidebar.tsx — skeleton, adapt to your existing hooks
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useShapeData } from '@/lib/useShapeData';
import { useActiveUser } from '@/lib/useActiveUser';
import { calcXP, calcStreak, PERSON_COLORS } from '@/lib/shape';

export default function Sidebar({
  onChatOpen,
  onCloseDrawer,
}: {
  onChatOpen: () => void;
  onCloseDrawer?: () => void;
}) {
  const pathname = usePathname();
  const { activeUser, setActiveUser } = useActiveUser();
  const { people } = useShapeData();
  if (!activeUser) return null;

  const me = people.find(p => p.name === activeUser);
  const maxEntries = Math.max(1, ...people.map(p => p.entries.length));
  const xp = me ? calcXP(me, maxEntries) : null;
  const streak = me ? calcStreak(me) : null;
  const c = me ? PERSON_COLORS[people.indexOf(me) % PERSON_COLORS.length] : 'var(--accent)';

  return (
    <aside className="flex flex-col h-full px-3 py-4 gap-4 overflow-y-auto w-full">
      {/* Brand */}
      <div className="flex items-baseline gap-0.5 px-1">
        <span className="text-2xl font-bold text-[var(--fg)]">shape</span>
        <span className="text-2xl font-bold text-[var(--fg-muted)]">squad</span>
      </div>

      {/* Profile card */}
      <div
        className="rounded-2xl p-3"
        style={{
          background: `linear-gradient(135deg, ${c}1a, transparent 60%)`,
          border: `1px solid ${c}30`,
        }}
      >
        <div className="flex items-center gap-3 mb-2.5">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center font-semibold text-white"
            style={{ background: c }}
          >
            {activeUser[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate" style={{ color: c }}>{activeUser}</div>
            {xp && (
              <div className="text-[10px] text-[var(--fg-muted)] flex items-center gap-1">
                <span style={{ color: xp.tier.color }}>{xp.tier.icon}</span>
                <span className="num">Lv {xp.level}</span>
                {streak && streak.current > 0 && (
                  <>
                    <span className="text-[var(--fg-faint)]">·</span>
                    <span className="num font-bold text-[var(--accent)]">{streak.current}mo 🔥</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        {xp && (
          <>
            <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${xp.xpInLevel}%`,
                  background: 'linear-gradient(90deg, var(--accent-soft), var(--accent))',
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] num text-[var(--fg-muted)] mt-1">
              <span>{xp.total} XP</span>
              <span>{xp.xpInLevel}/100</span>
            </div>
          </>
        )}
      </div>

      {/* Chat CTA — the star */}
      <button
        onClick={() => { onChatOpen(); onCloseDrawer?.(); }}
        className="group relative w-full rounded-2xl px-4 py-3.5 text-left overflow-hidden transition-all hover:translate-y-[-1px]"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.20), rgba(168,85,247,0.14))',
          border: '1px solid rgba(129,140,248,0.35)',
          boxShadow: '0 10px 30px -12px var(--accent-glow)',
        }}
      >
        <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
        </span>
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{ background: 'linear-gradient(135deg, var(--accent-soft), var(--accent-deep))' }}
          >
            💬
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm">Squad AI Coach</div>
            <div className="text-[10px] text-[var(--fg-muted)] mt-0.5">vorbește live cu coach-ul</div>
          </div>
        </div>
      </button>

      {/* Nav */}
      <nav className="flex flex-col gap-1">
        <NavLink href="/"        icon="📊" label="Dashboard" active={pathname === '/'} onClick={onCloseDrawer} />
        <NavLink href="/squad"   icon="👥" label="Squad"     active={pathname.startsWith('/squad')} onClick={onCloseDrawer} />
        <NavLink href="/progres" icon="📈" label="Progres"   active={pathname.startsWith('/progres')} onClick={onCloseDrawer} />
      </nav>

      <div className="flex-1" />

      {/* Footer */}
      <div className="border-t border-[var(--border)] pt-3 flex flex-col gap-2">
        <button
          onClick={() => { setActiveUser(''); onCloseDrawer?.(); }}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--card-hover)]"
        >
          <span>↩</span> Schimbă utilizator
        </button>
        {/* ThemeToggle here */}
      </div>
    </aside>
  );
}

function NavLink({ href, icon, label, active, onClick }: {
  href: string; icon: string; label: string; active: boolean; onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      prefetch
      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
        active
          ? 'bg-[var(--accent)]/12 text-[var(--fg)] ring-1 ring-[var(--accent)]/30'
          : 'text-[var(--fg-muted)] hover:bg-[var(--card-hover)] hover:text-[var(--fg)]'
      }`}
    >
      <span className="text-base w-5 text-center">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
```

---

## 6. ChatPanel — slides from the LEFT, not right

Modify `components/ChatPanel.tsx`. Drop the `paddingRight` shrinking pattern. The panel is now a fixed left-side overlay with a backdrop dim.

```tsx
// Position styles only — keep the message rendering you have
<div
  className={`fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] transition-opacity duration-200 ${
    open ? 'opacity-100' : 'opacity-0 pointer-events-none'
  }`}
  onClick={onClose}
/>

<div
  className={`fixed z-50 flex flex-col bg-[var(--bg)] border-r border-[var(--border)] shadow-2xl shadow-black/40 overflow-hidden
    inset-0 sm:inset-y-3 sm:left-3 sm:right-auto sm:w-[420px] sm:max-w-[calc(100vw-1.5rem)] sm:rounded-2xl sm:border
    lg:inset-y-4 lg:left-[268px] lg:w-[380px] lg:rounded-2xl
    xl:left-[288px] xl:w-[460px]
    transform-gpu transition-all duration-250 ease-out origin-left
    ${open ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 -translate-x-4 pointer-events-none'}
  `}
  role="dialog"
>
  {/* existing chat content */}
</div>
```

Sidebar is 260px (lg) / 280px (xl) + 1px border = 261/281. Chat docks at `left-[268px]` / `xl:left-[288px]` for a clean 7px gap from the sidebar.

---

## 7. Login flow — combined picker + log on ONE page

Replace `OnboardingPicker.tsx` with a 2-step inline flow on one screen:

**Step 1.** User cards (sorted by XP). Pick one → state flips to step 2.
**Step 2.** Quick-log form for that user (kg / body fat / muscle / talie, etc.). Save → enter dashboard. Or skip → go straight in.

The whole screen sits on an `.aurora` background. The form lives inside a `.glass` card.

```tsx
// components/OnboardingPicker.tsx — skeleton
'use client';
import { useState } from 'react';
import { useActiveUser } from '@/lib/useActiveUser';
import { useShapeData } from '@/lib/useShapeData';
import { submitEntry } from '@/lib/shape';

const QUICK_FIELDS = [
  { key: 'kg',       label: 'Greutate', unit: 'kg', required: true,  placeholder: '78.2' },
  { key: 'bodyFat',  label: 'Body Fat', unit: '%',  required: true,  placeholder: '18.4' },
  { key: 'muscle',   label: 'Muscle',   unit: '%',  required: false, placeholder: '74.6' },
  { key: 'talie',    label: 'Talie',    unit: 'cm', required: false, placeholder: '85'   },
];

export default function OnboardingPicker() {
  const { people } = useShapeData();
  const { setActiveUser } = useActiveUser();
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <main className="aurora min-h-dvh flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-0.5">
            <span className="text-4xl font-bold tracking-tight">shape</span>
            <span className="text-4xl font-bold tracking-tight text-[var(--fg-muted)]">squad</span>
          </div>
          <div className="text-xs uppercase tracking-[0.22em] text-[var(--fg-muted)] mt-2">
            body · team · ai
          </div>
        </div>

        {!picked && (
          <div className="glass rounded-3xl p-5 space-y-3">
            <div className="text-center mb-2">
              <div className="text-lg font-bold">Welcome back</div>
              <div className="text-xs text-[var(--fg-muted)] mt-0.5">Alege-ți cardul</div>
            </div>
            {/* Map people to picker cards — adapt your existing picker UI */}
          </div>
        )}

        {picked && (
          <LogStep
            user={picked}
            onBack={() => setPicked(null)}
            onDone={() => setActiveUser(picked)}
          />
        )}
      </div>
    </main>
  );
}

function LogStep({ user, onBack, onDone }: { user: string; onBack: () => void; onDone: () => void }) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const canSave = !!vals.kg && !!vals.bodyFat;

  const save = async () => {
    setSaving(true);
    await submitEntry({
      Nume: user,
      Date: new Date().toLocaleDateString('en-US'),
      Kg: vals.kg,
      'Body Fat %': vals.bodyFat,
      Muscle: vals.muscle,
      Talie: vals.talie,
    });
    onDone();
  };

  return (
    <div className="glass rounded-3xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-bold">{user}</div>
        <button onClick={onBack} className="text-xs text-[var(--fg-muted)]">← schimbă</button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {QUICK_FIELDS.map(f => (
          <GlassInput
            key={f.key}
            label={f.label}
            unit={f.unit}
            placeholder={f.placeholder}
            required={f.required}
            value={vals[f.key] ?? ''}
            onChange={v => setVals(s => ({ ...s, [f.key]: v }))}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={!canSave || saving}
          className="flex-1 rounded-xl py-3 font-bold text-sm disabled:opacity-40"
          style={{
            background: 'linear-gradient(135deg, var(--accent-soft), var(--accent-deep))',
            color: '#fff',
            boxShadow: '0 8px 24px -8px var(--accent-glow)',
          }}
        >
          {saving ? 'se salvează...' : 'salvează și intră'}
        </button>
        <button onClick={onDone} className="rounded-xl px-4 py-3 text-xs text-[var(--fg-muted)] hover:text-[var(--fg)]">
          sari peste
        </button>
      </div>
    </div>
  );
}

function GlassInput({ label, unit, placeholder, value, onChange, required }: any) {
  return (
    <div className="rounded-xl px-3 py-2.5 border border-white/10 bg-white/5 focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/30 transition-all">
      <div className="flex items-center justify-between mb-0.5">
        <span className="label">{label}{required && <span className="text-[var(--accent)] ml-0.5">*</span>}</span>
        <span className="text-[9px] num text-[var(--fg-faint)]">{unit}</span>
      </div>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent outline-none num font-bold text-xl text-[var(--fg)] placeholder:text-[var(--fg-faint)] placeholder:font-normal"
      />
    </div>
  );
}
```

---

## 8. Dashboard — no-scroll grid

Rewrite `app/page.tsx`. Goal: **fits in one viewport on lg+**. Mobile stacks naturally.

```tsx
'use client';
import Link from 'next/link';
import { useShapeData } from '@/lib/useShapeData';
import { useActiveUser } from '@/lib/useActiveUser';
import KpiCards from '@/components/dashboard/KpiCards';
import SquadBar from '@/components/dashboard/SquadBar';
import PersonalHistory from '@/components/dashboard/PersonalHistory';
import SquadInsights from '@/components/dashboard/SquadInsights';

export default function Home() {
  const { activeUser } = useActiveUser();
  const { people, loading } = useShapeData();
  if (!activeUser || loading) return null;
  const me = people.find(p => p.name === activeUser);
  if (!me) return null;

  return (
    <div className="flex flex-col gap-3 lg:gap-4 lg:h-full">
      {/* Row 1: 3 KPI cards */}
      <div className="anim-fade lg:shrink-0">
        <KpiCards person={me} />
      </div>

      {/* Row 2: Squad competition */}
      <div className="anim-fade d1 lg:shrink-0">
        <SquadBar people={people} currentUser={activeUser} />
      </div>

      {/* Row 3: split — personal history + insights */}
      <div className="anim-fade d2 grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 lg:flex-1 lg:min-h-0">
        <PersonalHistory person={me} />
        <SquadInsights people={people} currentUser={activeUser} />
      </div>

      {/* Footer link */}
      <div className="anim-fade d3 lg:shrink-0 text-center pt-1 pb-2">
        <Link href="/squad" className="text-[10px] text-[var(--fg-muted)] hover:text-[var(--fg)] uppercase tracking-wider font-semibold">
          vezi istoric echipă completă →
        </Link>
      </div>
    </div>
  );
}
```

**Critical CSS contract:** the wrapper uses `lg:h-full` so it fills `main` (which is `lg:overflow-hidden lg:flex lg:flex-col` from AppShell). Row 1 and Row 2 use `lg:shrink-0` so they take their content height. Row 3 uses `lg:flex-1 lg:min-h-0` so it absorbs the remainder — and `PersonalHistory` scrolls *inside its own card* if rows overflow, never the page.

---

## 9. KPI Cards — `components/dashboard/KpiCards.tsx`

Three cards. For ShapeSquad map to:

| KPI | Metric | Target | Better when |
|---|---|---|---|
| 1 | **Greutate** (kg) | user-defined goal (default ±2kg from current) | closer to goal |
| 2 | **Body Fat %** | M: 12-20%, F: 20-28% | inside zone |
| 3 | **Masă Musculară %** | M: ≥35%, F: ≥28% | higher |

Card 1 accent = `var(--accent)` (indigo). Card 2 accent = `#a78bfa` (purple-400). Card 3 accent = `#fbbf24` (amber-400).

```tsx
'use client';
import { Person, d } from '@/lib/shape';

function Sparkline({ values, color, width = 70, height = 22 }: {
  values: (number | null)[]; color: string; width?: number; height?: number;
}) {
  const present = values.filter((v): v is number => v != null);
  if (present.length < 2) return <div className="text-[10px] text-[var(--fg-faint)]">—</div>;
  const min = Math.min(...present);
  const max = Math.max(...present);
  const range = max - min || 1;
  const pad = 3;
  const pts = values.map((v, i) => {
    if (v == null) return null;
    const x = (i / Math.max(values.length - 1, 1)) * width;
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return { x, y };
  });
  let dpath = '';
  let prev: { x: number; y: number } | null = null;
  for (const p of pts) {
    if (!p) { prev = null; continue; }
    dpath += prev ? ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    prev = p;
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={dpath} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KpiCard({
  label, value, unit, delta, deltaUnit, higherBetter, target, series, color, accentVar,
}: {
  label: string; value: number | null; unit: string;
  delta: number | null; deltaUnit: string;
  higherBetter: boolean; target: string;
  series: (number | null)[]; color: string; accentVar: string;
}) {
  const deltaGood = delta != null && (higherBetter ? delta > 0 : delta < 0);
  const deltaBad = delta != null && (higherBetter ? delta < 0 : delta > 0);
  const deltaColor = deltaGood ? 'var(--good)' : deltaBad ? 'var(--bad)' : 'var(--fg-muted)';
  const arrow = delta == null || delta === 0 ? '·' : delta > 0 ? '↑' : '↓';

  return (
    <div className="kpi card px-5 py-4 lg:py-5 flex flex-col" style={{ ['--kpi-accent' as any]: accentVar }}>
      <div className="flex items-center justify-between mb-2">
        <span className="label">{label}</span>
        <span className="text-[9px] num text-[var(--fg-faint)]">target {target}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className="num font-bold leading-none text-5xl lg:text-6xl tracking-tight"
          style={{ color: value == null ? 'var(--fg-faint)' : color }}
        >
          {value != null ? value.toFixed(1) : '—'}
        </span>
        <span className="text-sm text-[var(--fg-muted)]">{unit}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] num font-bold flex items-center gap-1" style={{ color: deltaColor }}>
          <span>{arrow}</span>
          {delta != null ? <>{Math.abs(delta).toFixed(1)}{deltaUnit} vs prev</> : <span className="text-[var(--fg-faint)]">—</span>}
        </span>
        <Sparkline values={series} color={color} />
      </div>
    </div>
  );
}

export default function KpiCards({ person }: { person: Person }) {
  const l = person.latest;
  const p = person.previous;
  const sorted = [...person.entries].sort((a, b) => a.date.localeCompare(b.date));
  const last7 = sorted.slice(-7);

  // Tier-aware colors for the headline number
  const bfTarget = person.gender === 'M' ? { lo: 12, hi: 20 } : { lo: 20, hi: 28 };
  const bfColor = l.bodyFat == null ? 'var(--fg-faint)'
    : (l.bodyFat >= bfTarget.lo && l.bodyFat <= bfTarget.hi) ? 'var(--good)'
    : 'var(--warn)';
  const musTarget = person.gender === 'M' ? 35 : 28;
  const musColor = l.muscle == null ? 'var(--fg-faint)'
    : l.muscle >= musTarget ? 'var(--good)' : 'var(--warn)';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
      <KpiCard
        label="Greutate" value={l.kg} unit="kg" deltaUnit="kg"
        delta={d(l.kg, p?.kg ?? null)} higherBetter={false} target="goal"
        series={last7.map(e => e.kg)} color="var(--accent)" accentVar="var(--accent)"
      />
      <KpiCard
        label="Body Fat" value={l.bodyFat} unit="%" deltaUnit="%"
        delta={d(l.bodyFat, p?.bodyFat ?? null)} higherBetter={false}
        target={`${bfTarget.lo}–${bfTarget.hi}%`}
        series={last7.map(e => e.bodyFat)} color={bfColor} accentVar="#a78bfa"
      />
      <KpiCard
        label="Muscle" value={l.muscle} unit="%" deltaUnit="%"
        delta={d(l.muscle, p?.muscle ?? null)} higherBetter={true}
        target={`≥${musTarget}%`}
        series={last7.map(e => e.muscle)} color={musColor} accentVar="#fbbf24"
      />
    </div>
  );
}
```

---

## 10. Squad Bar — `components/dashboard/SquadBar.tsx`

Minimalist row: 3 big numbers side-by-side, current user highlighted in indigo. **No card chrome around each number — typography & spacing do the work.**

```tsx
'use client';
import { Person, calcXP } from '@/lib/shape';

export default function SquadBar({ people, currentUser }: { people: Person[]; currentUser: string }) {
  const maxEntries = Math.max(1, ...people.map(p => p.entries.length));
  const rows = people
    .map(p => {
      const xp = calcXP(p, maxEntries);
      return { name: p.name, score: xp.total, level: xp.level, tier: xp.tier, isMe: p.name === currentUser };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return (
    <section className="card px-5 py-4 lg:py-5">
      <div className="flex items-baseline justify-between mb-3">
        <span className="label">Competiția Squad · XP</span>
        <span className="text-[10px] num text-[var(--fg-faint)]">top 3</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {rows.map((r, i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
          const color = r.isMe ? 'var(--accent)' : 'var(--fg)';
          return (
            <div key={r.name} className="text-center">
              <div className="num font-bold text-3xl lg:text-4xl leading-none tracking-tight" style={{ color }}>
                {r.score}
              </div>
              <div className="mt-1.5 flex items-center justify-center gap-1.5">
                <span className="text-[10px]">{medal}</span>
                <span
                  className="text-[11px] font-bold"
                  style={{ color: r.isMe ? 'var(--accent)' : 'var(--fg-muted)' }}
                >
                  {r.isMe ? 'TU' : r.name}
                </span>
              </div>
              <div className="text-[9px] num text-[var(--fg-faint)] mt-0.5">
                {r.tier.icon} Lv {r.level}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

---

## 11. Personal History — `components/dashboard/PersonalHistory.tsx`

Compact table. Columns: **DATĂ · KG · BF% · Muscle · Status pill**. Modeled on PDF page 7. The card scrolls internally if too many rows — never the page.

```tsx
'use client';
import { Person, fDate } from '@/lib/shape';

export default function PersonalHistory({ person, limit = 6 }: { person: Person; limit?: number }) {
  const rows = [...person.entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
  if (!rows.length) {
    return (
      <section className="card px-5 py-4 flex flex-col">
        <div className="label mb-3">Istoric Personal</div>
        <div className="flex-1 flex items-center justify-center text-xs text-[var(--fg-muted)] italic py-6">
          niciun log încă
        </div>
      </section>
    );
  }

  const bfZone = person.gender === 'M' ? { lo: 12, hi: 20 } : { lo: 20, hi: 28 };
  const statusFor = (bf: number | null): 'optim' | 'average' | 'poor' => {
    if (bf == null) return 'average';
    if (bf >= bfZone.lo && bf <= bfZone.hi) return 'optim';
    const dist = bf < bfZone.lo ? bfZone.lo - bf : bf - bfZone.hi;
    return dist <= 3 ? 'average' : 'poor';
  };
  const statusLabel = (s: string) => s === 'optim' ? 'Optim' : s === 'average' ? 'Average' : 'Poor';

  return (
    <section className="card px-5 py-4 lg:py-5 flex flex-col min-h-0">
      <div className="flex items-baseline justify-between mb-3">
        <span className="label">Istoric Personal</span>
        <span className="text-[10px] num text-[var(--fg-faint)]">ultimele {rows.length} măsurători</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 lg:gap-4 items-center pb-2 border-b border-[var(--border)]">
        <span className="label">Data</span>
        <span className="label text-right">Kg</span>
        <span className="label text-right hidden sm:inline">BF%</span>
        <span className="label text-right hidden sm:inline">Muscle</span>
        <span className="label text-right">Status</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[var(--border)]/60">
        {rows.map(e => {
          const s = statusFor(e.bodyFat);
          return (
            <div key={e.date} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 lg:gap-4 items-center py-2.5">
              <span className="text-xs">{fDate(e.date)}</span>
              <span className="num font-bold text-base text-right">{e.kg?.toFixed(1) ?? '—'}</span>
              <span className="num text-xs text-[var(--fg-muted)] text-right hidden sm:inline">{e.bodyFat?.toFixed(1) ?? '—'}</span>
              <span className="num text-xs text-[var(--fg-muted)] text-right hidden sm:inline">{e.muscle?.toFixed(1) ?? '—'}</span>
              <span className={`pill ${s}`}>{statusLabel(s)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

---

## 12. Squad Insights — `components/dashboard/SquadInsights.tsx`

Combined panel: **computed factual stat** at top + **AI-generated line** at bottom. The AI part calls your existing chat/insight endpoint (or a new `/api/vibe`) and caches in localStorage per `(user, latestDate)`.

```tsx
'use client';
import { useEffect, useState } from 'react';
import { Person, calcXP } from '@/lib/shape';

export default function SquadInsights({ people, currentUser }: { people: Person[]; currentUser: string }) {
  const me = people.find(p => p.name === currentUser);
  if (!me) return null;

  const maxEntries = Math.max(1, ...people.map(p => p.entries.length));
  const myXP = calcXP(me, maxEntries);
  const ranked = people
    .map(p => ({ name: p.name, xp: calcXP(p, maxEntries).total }))
    .sort((a, b) => b.xp - a.xp);
  const myRank = ranked.findIndex(r => r.name === currentUser) + 1;
  const avgBf = (() => {
    const present = people.flatMap(p => p.entries.filter(e => e.bodyFat != null).map(e => e.bodyFat!));
    return present.length ? Math.round(present.reduce((s, v) => s + v, 0) / present.length * 10) / 10 : null;
  })();

  // AI vibe (cached per (user, latest date))
  const lastDate = me.latest.date;
  const cacheKey = `shapesquad_vibe_${currentUser}_${lastDate}`;
  const [aiText, setAiText] = useState<string | null>(null);
  useEffect(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) { setAiText(cached); return; }
    } catch {}
    fetch('/api/vibe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: currentUser, people }),
    })
      .then(r => r.json())
      .then((j: { text?: string }) => {
        if (j.text) {
          setAiText(j.text);
          try { localStorage.setItem(cacheKey, j.text); } catch {}
        }
      })
      .catch(() => {});
  }, [cacheKey, currentUser, people]);

  return (
    <section className="card px-5 py-4 lg:py-5 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{ background: 'radial-gradient(circle at 0% 0%, rgba(99,102,241,0.10), transparent 55%)' }}
      />
      <div className="relative space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-base">👥</span>
          <div className="flex-1 min-w-0">
            <div className="label">Squad Insights</div>
            <p className="text-sm mt-1 leading-relaxed">
              {avgBf != null
                ? <>Squad-ul are BF mediu <strong className="num text-[var(--accent)]">{avgBf}%</strong>. </>
                : <span className="text-[var(--fg-muted)]">Nu sunt destule date pentru media squad-ului. </span>}
              {myRank > 0 && (
                <>Ești pe locul <strong className="num text-[var(--accent)]">#{myRank}</strong> la XP ({myXP.total} pts).</>
              )}
            </p>
          </div>
        </div>

        {aiText && (
          <div className="flex items-start gap-3 pt-3 border-t border-[var(--border)]/70">
            <span className="text-base">💪</span>
            <div className="flex-1 min-w-0">
              <div className="label" style={{ color: 'var(--accent)' }}>Squad AI Coach</div>
              <p className="text-sm mt-1 leading-relaxed">{aiText}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
```

You'll need a `/api/vibe` route that takes `{ user, people }` and returns `{ text: string }` (one short sentence from Claude Haiku, **max 3 sentences, sharp, no fluff**). Reuse your existing chat infrastructure — same Anthropic client, same env var.

---

## 13. Migration order (execute in this sequence)

```
1.  app/globals.css                ← Section 2 + 3 (tokens + utilities)
2.  components/Sidebar.tsx          ← create new (Section 5)
3.  components/AppShell.tsx         ← refactor (Section 4)
4.  components/ChatPanel.tsx        ← reposition (Section 6)
5.  components/OnboardingPicker.tsx ← rewrite as combined picker+log (Section 7)
6.  components/dashboard/KpiCards.tsx          ← create new (Section 9)
7.  components/dashboard/SquadBar.tsx          ← create new (Section 10)
8.  components/dashboard/PersonalHistory.tsx   ← create new (Section 11)
9.  components/dashboard/SquadInsights.tsx     ← create new (Section 12)
10. app/api/vibe/route.ts           ← create new (Anthropic call, 3-sentence cap)
11. app/page.tsx                    ← rewrite as no-scroll grid (Section 8)
12. npm run build                   ← verify nothing broken
13. delete unused: MetricCard, MeasurementsTable (if no longer imported)
```

**At each step, commit.** Don't batch — small commits make it easy to bisect if visual regression appears.

---

## 14. What to KEEP from current shapesquad (do not rewrite)

These are domain logic, not UI. The new design wraps them, doesn't replace them.

| Keep | Why |
|---|---|
| `lib/shape.ts` types (`Entry`, `Person`, `MetricDef`) | Data model is fine |
| `lib/shape.ts` helpers (`groupByPerson`, `calcXP`, `calcStreak`, `getPersonInsight`, `densifyTimeSeries`, `calcOverallScore`) | Battle-tested, reuse |
| `lib/useShapeData.ts`, `useActiveUser.ts`, `useTheme.ts` | Hooks layer is solid |
| `app/api/*` (existing chat/data routes) | Backend untouched |
| `tailwind.config.ts` | Tokens flow through CSS vars, config doesn't change |

What you delete: `MetricCard.tsx`, `MeasurementsTable.tsx`, the existing card chrome that the new components replace.

---

## 15. Gotchas (so you don't waste an hour)

| Gotcha | Symptom | Fix |
|---|---|---|
| `body { overflow: hidden }` blocks dashboard scroll on mobile | Page locks vertically on small screens | Remove `overflow: hidden` from `body`. The `lg:overflow-hidden` lives on the AppShell root + main, not body. |
| `lg:h-full` doesn't fill when parent isn't sized | Row 3 collapses to 0 on lg+ | Ensure `<main>` in AppShell has `lg:flex lg:flex-col lg:overflow-hidden`. Then page wrapper uses `lg:h-full` and children use `lg:flex-1 lg:min-h-0`. |
| Aurora blobs render behind solid bg | Indigo glow invisible | Aurora needs a transparent or near-transparent base on its ::before/::after. The base layer is `var(--bg)` on `.aurora` itself; pseudo-elements blend on top via `inset: 0` + radial gradients. |
| Tailwind arbitrary CSS-var classes | `lg:left-[var(--x)]` doesn't compile | Use static values (`lg:left-[268px]`) or inline style. JIT doesn't expand vars in arbitrary values. |
| Light-mode glass invisible | `.glass` content has no contrast on light bg | The provided `html.light .glass` rule swaps to white-tinted glass. Don't override. |
| KPI ::after with `overflow: hidden` on parent | Bottom border clipped | The `.kpi` class sets `overflow: hidden` so the glow stays clipped within rounded corners. That's intentional — keep it. |
| Status pill in tight column with hidden text | Pill wraps and breaks the row | Use `pill` on a `<span>` (inline-flex) not block, and don't `text-overflow` it. |

---

## 16. Domain mapping cheat sheet (sleep → shape)

| somn concept | shapesquad equivalent |
|---|---|
| Sleep Score (SS, 0–100) | Overall Score (`calcOverallScore` → 6.0–10.0) |
| REM minutes | Muscle % |
| HRV ms | Body Fat % (lower better, similar visual role) |
| RHR | (skip — talie/waist works in measurements card) |
| `lastNDays(7)` | `densifyTimeSeries` + `.slice(-7)` from sorted entries |
| `personColor()` | `PERSON_COLORS[idx]` |
| Hipnos (mascot) | "Squad AI Coach" — no mascot, just text + indigo chip |
| Target Romanian text | Same — keep `ro` locale |

---

## 17. TL;DR — what success looks like

After migration:
- ✅ Login page = aurora gradient + glassmorphism card, pick user → log form inline → enter dashboard. One screen, one flow.
- ✅ Dashboard fits in viewport on `lg+` — no body scroll. Three rows: KPIs / Squad bar / History+Insights.
- ✅ Chat lives in the left sidebar as a prominent indigo CTA. Tapping it slides a panel in from the LEFT.
- ✅ Slate 950 background. Indigo accent. Big numbers (5xl–6xl on KPIs). Generous spacing.
- ✅ Status pills (`optim` / `average` / `poor`) in the history table.
- ✅ KPI cards have a glowing colored bottom border.
- ✅ `npm run build` passes clean.

**Commit message for the final push:**

```
ShapeSquad Masterpiece UI: Slate + Indigo, no-scroll dashboard

Migrate to the somn masterpiece design language. Login combines picker
+ quick log (aurora + glass). Dashboard fits in viewport: 3 KPI cards
(kg / BF / muscle) → squad XP bar → history table + insights split.
Chat moves from right dock to LEFT sidebar CTA with slide-in panel.
Slate 950 base, indigo accent, status pills, glowing KPI borders.
```

---

*Reference implementation: somn (https://somn-xi.vercel.app). This guide is self-contained — no need to crack open somn's source to execute.*
