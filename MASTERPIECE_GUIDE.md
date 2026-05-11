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

## 4. Layout Shift — Slim TopBar + Floating Chat Bubble

> **Latest masterpiece pattern (2026-05).** The earlier left-sidebar design has been retired in favor of a thinner, more page-focused layout: a slim sticky TopBar with a profile popover, plus a floating chat bubble bottom-right. Maximum dashboard real-estate, minimal chrome.

**Target shape:**

```
┌─────────────────────────────────────────────────────────────┐
│ somn · sleep IT ai                  [theme] [👤 Petrica ▾] │  ← TopBar (sticky, 56px)
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🦞 Hipnos · "one-liner observation"                       │
│  ┌──────┬──────┬──────┐                                    │
│  │ KPI  │ KPI  │ KPI  │                                    │
│  └──────┴──────┴──────┘                                    │
│  ...rest of dashboard scrolls naturally...                  │
│                                                             │
│                                       ┌──────────┐         │
│                                       │ Hipnos · │ (🦞)    │  ← floating bubble
│                                       │ live     │         │     bottom-right
│                                       └──────────┘         │
└─────────────────────────────────────────────────────────────┘
```

**Why this beats the sidebar:**
- No nav links to host (this is a single-page app) — a sidebar was wasted space.
- The profile + chat are the only "global" UI elements; they don't need 260px of real-estate.
- Page content can use the full width.
- Mobile and desktop share the same TopBar — no drawer logic needed.

**Three components to build:**
1. `components/AppShell.tsx` — TopBar + main + ChatPanel
2. `components/TopBar.tsx` — slim sticky bar
3. `components/ProfilePopover.tsx` — popover triggered from TopBar avatar chip

**AppShell skeleton:**

```tsx
// components/AppShell.tsx
return (
  <>
    <div className="min-h-dvh flex flex-col">
      <TopBar />
      <main className="flex-1 min-w-0 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 pb-safe pb-24 sm:pb-28">
        {children}
      </main>
    </div>

    {/* Chat lives outside the flow — floating bubble bottom-right */}
    <ChatPanel />
  </>
);
```

The `pb-24 sm:pb-28` ensures the floating chat bubble never overlaps the last row of dashboard content.

---

## 5. TopBar + ProfilePopover

**`components/TopBar.tsx`:**

```tsx
'use client';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ProfilePopover } from '@/components/ProfilePopover';

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 bg-[var(--bg)]/85 backdrop-blur-md border-b border-[var(--border)] pt-safe">
      <div className="flex items-center justify-between gap-3 h-14 px-3 sm:px-5 max-w-6xl mx-auto w-full">
        <Link href="/" className="flex items-baseline gap-2 group">
          <span className="text-xl font-bold tracking-tight group-hover:text-[var(--accent)] transition-colors">
            shape
          </span>
          <span className="text-[9px] uppercase tracking-[0.22em] text-[var(--fg-muted)] font-medium hidden sm:inline">
            body · IT · ai
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <ProfilePopover />
        </div>
      </div>
    </header>
  );
}
```

**`components/ProfilePopover.tsx`** — chip with avatar+name → opens a 18rem popover with full profile details (level, tier, XP bar, streak, total logs) and a "Schimbă utilizator" action. See full implementation in somn's `src/components/layout/profile-popover.tsx`. Key contract: outside-click + Escape close the popover, focus management is implicit.

The chip itself:

```tsx
<button
  onClick={() => setOpen(o => !o)}
  className="flex items-center gap-2 h-9 pl-1 pr-2.5 rounded-full border transition-colors"
  style={{
    background: open
      ? `linear-gradient(135deg, ${c}24, transparent 70%)`
      : `linear-gradient(135deg, ${c}10, transparent 70%)`,
    borderColor: open ? `${c}60` : 'var(--border)',
  }}
>
  <Avatar /> <span className="text-xs font-bold hidden sm:inline" style={{ color: c }}>{name}</span> ▾
</button>
```

---

## 6. ChatPanel — floating bubble bottom-right, ALWAYS-VISIBLE label

The critical lesson from earlier iterations: **a bare icon-only bubble gets ignored.** Solve it by pairing the bubble with a permanently-visible label pill to its left.

**Layout when collapsed:**

```
[ 🟢 Hipnos · vorbește live ]  ( 🦞 )
 └ label pill (sm+ only)        └ lobster bubble (always visible)
```

The pill has a pulsing live-dot, indigo gradient background, and reads "Hipnos · vorbește live". On tiny mobile (`<sm`), only the lobster bubble shows, with a small pulsing dot in its top-right corner so users still get the "alive" signal.

**Skeleton:**

```tsx
return (
  <>
    {/* Collapsed: label pill + lobster bubble */}
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 transition-all duration-200 ${
        open ? 'opacity-0 pointer-events-none translate-y-2 scale-95' : 'opacity-100 scale-100'
      }`}
    >
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 h-12 pl-3.5 pr-3 rounded-full border shadow-2xl shadow-black/40 hover:-translate-x-0.5 transition-all"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(168,85,247,0.12))',
          borderColor: 'rgba(129,140,248,0.35)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <PulsingDot />
        <span className="text-xs font-bold">Squad AI Coach</span>
        <span className="text-[10px] text-[var(--fg-muted)] hidden md:inline">vorbește live</span>
      </button>

      <button
        onClick={() => setOpen(true)}
        className="relative w-14 h-14 rounded-full border-2 shadow-2xl shadow-black/50 hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, var(--accent-soft), var(--accent-deep))',
          borderColor: 'rgba(255,255,255,0.20)',
        }}
      >
        <BrandIcon size={36} />
        {/* Outer pulse ring + mobile-only mini dot */}
      </button>
    </div>

    {/* Backdrop + popup expand from bottom-right */}
    <div className={`fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] ${open ? '' : 'opacity-0 pointer-events-none'}`} onClick={() => setOpen(false)} />
    <div
      className={`fixed z-50 flex flex-col bg-[var(--bg)] border border-[var(--border)] overflow-hidden shadow-2xl
        inset-0 sm:inset-auto sm:bottom-4 sm:right-4 sm:w-[420px] sm:max-w-[calc(100vw-2rem)] sm:h-[min(720px,calc(100dvh-6rem))] sm:rounded-2xl
        lg:w-[460px]
        transform-gpu transition-all duration-250 ease-out origin-bottom-right
        ${open ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'}
      `}
    >
      <ChatWidget />
    </div>
  </>
);
```

**Mobile UX**: the popup goes full-screen (`inset-0`). The label pill is hidden because the bubble itself is enough on small screens — the chat is one tap away.

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

## 8. Dashboard — single scrolling page

Rewrite `app/page.tsx`. The page is one column that scrolls naturally. Don't force-fit into a viewport (that's what hid charts in earlier iterations).

```tsx
'use client';
import { useShapeData } from '@/lib/useShapeData';
import { useActiveUser } from '@/lib/useActiveUser';
import HipnosLine from '@/components/dashboard/HipnosLine';
import KpiCards from '@/components/dashboard/KpiCards';
import PersonalHistory from '@/components/dashboard/PersonalHistory';
import Leaderboard from '@/components/dashboard/Leaderboard';
import TeamChartPane from '@/components/dashboard/TeamChartPane';

export default function Home() {
  const { activeUser } = useActiveUser();
  const { people, loading } = useShapeData();
  if (!activeUser || loading) return null;
  const me = people.find(p => p.name === activeUser);
  if (!me) return null;

  return (
    <div className="flex flex-col gap-3 lg:gap-4 max-w-6xl mx-auto w-full">
      {/* 🦞 Top one-liner — AI vibe */}
      <div className="anim-fade">
        <HipnosLine person={me} people={people} />
      </div>

      {/* KPIs — 3 big numbers */}
      <div className="anim-fade d1">
        <KpiCards person={me} />
      </div>

      {/* Split: personal history (with Hipnos pattern footer) · team leaderboard */}
      <div className="anim-fade d2 grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
        <PersonalHistory person={me} />
        <Leaderboard people={people} currentUser={activeUser} />
      </div>

      {/* Team multi-metric chart with tabs (kg / BF / muscle / talie) */}
      <div className="anim-fade d3">
        <TeamChartPane people={people} />
      </div>
    </div>
  );
}
```

**Layout principles:**
- Page scrolls naturally. No `lg:h-full` / `lg:overflow-hidden` hacks. The user expects to scroll.
- Wrap content in `max-w-6xl mx-auto` so it stays readable on ultra-wide displays.
- AppShell's `<main>` already pads bottom with `pb-24 sm:pb-28` so the floating chat bubble doesn't overlap the last row.

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

## 12. Hipnos presence — top one-liner + pattern footer in history

**The old "SquadInsights" card is retired.** It got demoted into two leaner Hipnos touch-points so the AI feels present without taking up a full card slot:

### 12a. Top one-liner — `components/dashboard/HipnosLine.tsx`

A single sentence at the top of the page. Fetched once per `(user, latestLogDate)`, cached in localStorage. Returns `null` silently if no AI text yet — never an empty placeholder.

```tsx
'use client';
import { useEffect, useState } from 'react';
import { Person } from '@/lib/shape';

// v2 — bump the key when you change the prompt format so users
// don't keep stale cached text.
const KEY = (user: string, lastDate: string) => `squad_vibe_v2_${user}_${lastDate}`;

export default function HipnosLine({ person, people }: { person: Person; people: Person[] }) {
  const [text, setText] = useState<string | null>(null);
  const lastDate = person.latest.date;
  const user = person.name;

  useEffect(() => {
    if (!user || !lastDate) return;
    const k = KEY(user, lastDate);
    try {
      const cached = localStorage.getItem(k);
      if (cached) { setText(cached); return; }
    } catch {}
    fetch('/api/vibe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, people }),
    })
      .then(r => r.json())
      .then((j: { text?: string }) => {
        if (j.text) {
          setText(j.text);
          try { localStorage.setItem(k, j.text); } catch {}
        }
      })
      .catch(() => {});
  }, [user, lastDate, people]);

  if (!text) return null;

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2 rounded-xl border relative overflow-hidden"
      style={{
        background: 'linear-gradient(90deg, rgba(99,102,241,0.08), transparent 70%)',
        borderColor: 'rgba(129,140,248,0.18)',
      }}
    >
      <span className="text-base shrink-0">🦞</span>
      <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--accent)] shrink-0">
        Squad AI
      </span>
      <span className="text-[var(--fg-dim)] shrink-0 hidden sm:inline">·</span>
      <p className="text-sm text-[var(--fg)] truncate flex-1 min-w-0">{text}</p>
    </div>
  );
}
```

**API contract for `/api/vibe`:** body `{ user, people }`, returns `{ text: string }`. Prompt must enforce **max 14 words, ONE sentence, sharp, no fluff, reference one real number for the user.** Example:

```
"${fn}, săpt asta media ta BF e 19.4 — la 0.6 sub Cosmin."
```

### 12b. Pattern footer in PersonalHistory — `personalTrendNote()` in `lib/shape.ts`

Add this deterministic helper to `lib/shape.ts`. It runs client-side (no AI call → instant render). The PersonalHistory card uses it to show a 🦞 footer line so Hipnos feels present in the history view too.

```ts
// lib/shape.ts
export interface TrendNote {
  text: string;
  tone: 'good' | 'neutral' | 'warn';
}

export function personalTrendNote(person: Person): TrendNote | null {
  const mine = [...person.entries].sort((a, b) => a.date.localeCompare(b.date));
  if (mine.length < 2) return null;

  const last = mine[mine.length - 1];
  const prev = mine[mine.length - 2];

  // Body Fat consistency — multi-entry trend
  const bfPresent = mine.filter(e => e.bodyFat != null);
  if (bfPresent.length >= 3) {
    const first = bfPresent[0].bodyFat!;
    const lastBf = bfPresent[bfPresent.length - 1].bodyFat!;
    const drop = first - lastBf;
    if (drop >= 2) return { text: `BF −${drop.toFixed(1)}% de la start · momentum`, tone: 'good' };
    if (drop <= -2) return { text: `BF +${Math.abs(drop).toFixed(1)}% de la start · recalibrare`, tone: 'warn' };
  }

  // Muscle gain
  if (last.muscle != null && prev.muscle != null) {
    const m = last.muscle - prev.muscle;
    if (m >= 0.5) return { text: `+${m.toFixed(1)}% masă musculară · keep going`, tone: 'good' };
    if (m <= -0.5) return { text: `${m.toFixed(1)}% masă musculară · atenție la macros`, tone: 'warn' };
  }

  // Weight stability
  if (last.kg != null && prev.kg != null) {
    const w = last.kg - prev.kg;
    if (Math.abs(w) <= 0.3) return { text: `greutate stabilă · ${last.kg.toFixed(1)}kg`, tone: 'neutral' };
  }

  return null;
}
```

Then in `PersonalHistory.tsx`, append at the bottom of the card:

```tsx
{trend && (
  <div className="mt-3 pt-3 border-t border-[var(--border)]/70 flex items-start gap-2.5">
    <span className="text-base shrink-0">🦞</span>
    <div className="flex-1 min-w-0">
      <div className="text-[9px] uppercase tracking-[0.16em] font-bold text-[var(--accent)] mb-0.5">
        Squad AI · pattern
      </div>
      <p
        className="text-xs leading-relaxed"
        style={{
          color: trend.tone === 'good' ? 'var(--good)'
            : trend.tone === 'warn' ? 'var(--warn)'
            : 'var(--fg-muted)',
        }}
      >
        {trend.text}
      </p>
    </div>
  </div>
)}
```

### 12c. TeamChartPane — bottom of the page

The multi-metric chart with tabs (kg / BF / muscle / talie) replaces the old separate `/squad` or `/detail` page. Build it as `components/dashboard/TeamChartPane.tsx` with:
- A small header row: title + range tabs (7 / 30 / all)
- A second row of metric tabs (kg, BF%, muscle, talie) with a target indicator on the right
- A big SVG line chart underneath with all teammates overlaid, target line, smooth Bezier curves

Reuse your existing chart component if you have one; otherwise inline the SVG path generation (≤80 lines).

---

## 13. Migration order (execute in this sequence)

```
1.  app/globals.css                       ← Section 2 + 3 (tokens + utilities)
2.  components/ProfilePopover.tsx         ← create new (Section 5)
3.  components/TopBar.tsx                 ← create new (Section 5)
4.  components/AppShell.tsx               ← refactor: TopBar + main + ChatPanel (Section 4)
5.  components/ChatPanel.tsx              ← floating bubble + label pill (Section 6)
6.  components/OnboardingPicker.tsx       ← combined picker+log (Section 7)
7.  components/dashboard/KpiCards.tsx     ← create new (Section 9)
8.  components/dashboard/PersonalHistory.tsx ← create new (Section 11) — with Hipnos pattern footer
9.  components/dashboard/HipnosLine.tsx   ← top-of-page one-liner (uses /api/vibe)
10. components/dashboard/Leaderboard.tsx  ← keep/adapt existing
11. components/dashboard/TeamChartPane.tsx ← multi-metric switcher chart
12. app/api/vibe/route.ts                 ← one-line cap, sharp prompt
13. lib/shape.ts                          ← add personalTrendNote() helper
14. app/page.tsx                          ← Hipnos line → KPIs → split (History + Leaderboard) → TeamChart
15. npm run build                         ← verify nothing broken
16. delete unused: legacy MetricCard, MeasurementsTable, any old detail pages
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
- ✅ **Login page** = aurora gradient + glassmorphism card, pick user → log form inline → enter dashboard. One screen, one flow.
- ✅ **TopBar** sticky at top: brand left, theme + profile chip right. Click chip → popover with level, XP bar, streak, switch-user.
- ✅ **Dashboard is a single scrolling page**: Hipnos one-liner → KPI cards → (Personal History with Hipnos pattern footer + Team Leaderboard) → Team multi-metric chart.
- ✅ **Chat** = floating bubble bottom-right with an ALWAYS-VISIBLE label pill ("Squad AI Coach · vorbește live"). Popup expands from bottom-right.
- ✅ Slate 950 background. Indigo accent. Big numbers (5xl–6xl on KPIs). Generous spacing.
- ✅ Status pills (`optim` / `average` / `poor`) in the history table.
- ✅ KPI cards have a glowing colored bottom border.
- ✅ `npm run build` passes clean.

**Commit message for the final push:**

```
ShapeSquad Masterpiece UI: TopBar + floating chat, single-page dashboard

Migrate to the somn masterpiece design language. Slate 950 base, indigo
accent. Sticky slim TopBar with profile popover replaces the sidebar.
Chat lives as a floating bubble bottom-right with an always-visible
label pill so users can't miss it. Single-page dashboard: Hipnos
one-liner → KPI cards (kg/BF/muscle) → History+Leaderboard split →
Team multi-metric chart. Personal history grows a Hipnos pattern
footer with deterministic trend observations.
```

---

## 18. Design evolution log (so future readers know what changed)

**v1 (sleep tracker original, lime accent, zinc base):** retired.

**v2 (somn masterpiece, slate + indigo, LEFT sidebar):** see git history, branch retired.

**v3 (current — somn live):** TopBar + floating chat bubble. **Use this going forward** for all squad-style projects.

The /detail page pattern was a mistake — splitting team data onto a second page hid the multi-metric chart behind a no-scroll wall. **Keep everything on one page, let it scroll.** A sticky TopBar handles brand + identity; the rest is content.

---

*Reference implementation: somn (https://somn-xi.vercel.app). This guide is self-contained — no need to crack open somn's source to execute.*
