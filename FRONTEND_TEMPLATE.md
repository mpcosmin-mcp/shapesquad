# Frontend Template -- Premium Dark Dashboard

> A reusable playbook extracted from ShapeSquad. Use these building blocks to ship a polished, mobile-first, dark-mode dashboard for **any domain** -- finance, psychology, habit tracking, personal analytics, etc.

---

## Table of Contents

1. [Stack & Setup](#1-stack--setup)
2. [Design System](#2-design-system)
3. [Animation System](#3-animation-system)
4. [Glass UI Components](#4-glass-ui-components)
5. [Chart System](#5-chart-system)
6. [Data Architecture](#6-data-architecture)
7. [Scoring Engine](#7-scoring-engine)
8. [Layout Patterns](#8-layout-patterns)
9. [Interaction Patterns](#9-interaction-patterns)
10. [3D Visualization](#10-3d-visualization)
11. [Deployment](#11-deployment)
12. [Reuse Guide](#12-reuse-guide)

---

## 1. Stack & Setup

### Core Dependencies

| Package | Purpose |
|---------|---------|
| React 18 | UI framework with hooks-only architecture (no class components) |
| TypeScript | Strict types for data models, props, metric definitions |
| Tailwind CSS 3 | Utility-first styling, responsive breakpoints, arbitrary values |
| Vite | Dev server with HMR, fast builds |
| vite-plugin-singlefile | Bundles everything into one deployable `index.html` |
| Recharts | Composable charting (Area, Line, Radar, Bar) |
| Lucide React | Consistent icon set, tree-shakeable |
| Three.js + @react-three/fiber + @react-three/drei | Optional 3D visualization layer |

### Vite Configuration

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist',
    cssCodeSplit: false, // Required for single-file output
  },
});
```

### Tailwind Configuration

```js
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Clash Display', 'sans-serif'],   // Headlines
        body: ['Satoshi', 'sans-serif'],             // Body text (or Montserrat)
        mono: ['JetBrains Mono', 'monospace'],       // Numbers, data, code
      },
    },
  },
  plugins: [],
};
```

### Font Loading

Load fonts via Google Fonts at the top of `index.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700;800;900&display=swap');
```

**Key pattern**: Use a display/body font for text (Montserrat) and a monospace font (JetBrains Mono) for all numeric values. This gives data-heavy UIs a fintech/trading feel.

### Project Structure

```
src/
  index.css              # Design system: variables, glass, animations, components
  App.tsx                # Root: data loading, navigation state, view routing
  lib/
    shape.ts             # Data layer: types, fetch, scoring, helpers
  components/
    ChartCrosshair.tsx   # Reusable chart tooltip/cursor components
    pages/
      SquadPage.tsx      # Leaderboard/ranking pattern
      MyProfilePage.tsx  # Profile/dashboard pattern
      TrendsPage.tsx     # Multi-line trend comparisons
      ComparePage.tsx    # Side-by-side comparison
      BodySilhouette.tsx # SVG body visualization + timeline
      Body3D.tsx         # Three.js 3D body mesh (lazy-loaded)
      InputPage.tsx      # Form for data entry
      HistoryPage.tsx    # Full data log table
```

---

## 2. Design System

### CSS Custom Properties (The Palette)

```css
:root {
  /* Background & Glass */
  --bg: #0f172a;                        /* Slate 900 - deep dark base */
  --glass: rgba(30, 41, 59, 0.4);      /* Semi-transparent card fill */
  --glass-border: rgba(255, 255, 255, 0.06);  /* Barely visible border */

  /* Text hierarchy */
  --text: #f1f5f9;     /* Primary text (slate 100) */
  --text2: #94a3b8;    /* Secondary text (slate 400) */
  --text3: #475569;    /* Tertiary/muted (slate 600) */

  /* Neon accent palette */
  --neon-green: #00ff88;     /* Success, positive deltas, top scores */
  --neon-blue: #3b82f6;      /* Primary accent, links, active states */
  --neon-pink: #ec4899;      /* Female gender, secondary accent */
  --neon-orange: #f97316;    /* Warnings, moderate scores */
  --neon-purple: #a855f7;    /* Tertiary accent, categories */
  --neon-yellow: #facc15;    /* Gold, first place, highlights */
  --neon-red: #ff3b3b;       /* Danger, negative deltas, low scores */

  /* Border radius tokens */
  --r: 16px;         /* Standard card radius */
  --r-lg: 24px;      /* Large cards, hero sections */
}
```

### Dark-First Philosophy

1. **Body background** is deep slate (`#0f172a`), never pure black.
2. **Ambient glow** via `body::before` with fixed radial gradients at 3% opacity -- adds depth without distraction.
3. **Glass cards** layer on top with `backdrop-filter: blur(16px)`.
4. **Text uses 3 tiers**: bright white for data/headings, slate-400 for labels, slate-600 for tertiary.
5. **Color enters through data, not chrome** -- the UI is monochrome, but charts, scores, and deltas get vivid neon accents.

### Ambient Background Glow

```css
body::before {
  content: '';
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background-image:
    radial-gradient(circle at 20% 20%, rgba(59,130,246,0.03) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(236,72,153,0.03) 0%, transparent 50%);
}
```

### Scrollbar Styling

```css
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--text3); border-radius: 2px; }
```

### Adapting the Palette for Other Domains

| Domain | `--bg` | Primary Neon | Secondary Neon | Accent Logic |
|--------|--------|-------------|----------------|--------------|
| Finance | `#0a0f1a` | `#00ff88` (profit) | `#ff3b3b` (loss) | Green = up, Red = down |
| Psychology | `#1a1025` | `#a855f7` (insight) | `#3b82f6` (calm) | Purple = emotional, Blue = rational |
| Fitness | `#0f172a` | `#00ff88` (progress) | `#ec4899` (female) | Gender-aware, neon for deltas |
| Habit Tracker | `#0c1220` | `#facc15` (streak) | `#3b82f6` (activity) | Gold = streaks, Blue = tasks |

---

## 3. Animation System

### Core Keyframes

```css
/* Entrance: fade up from below */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Entrance: slide in from left */
@keyframes slideR {
  from { opacity: 0; transform: translateX(-12px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* Idle: gentle floating for avatars/icons */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-4px); }
}
```

### Utility Classes

```css
.anim-fade  { animation: fadeUp .5s ease both; }
.anim-slide { animation: slideR .4s ease both; }
.float      { animation: float 3s ease-in-out infinite; }
```

### Staggered Delay Classes (d1-d9)

Apply to sibling elements for a cascading entrance effect:

```css
.d1 { animation-delay: 50ms; }
.d2 { animation-delay: 100ms; }
.d3 { animation-delay: 150ms; }
/* ... up to */
.d9 { animation-delay: 450ms; }
```

**Usage pattern** (JSX):
```tsx
{items.map((item, i) => (
  <div key={item.id}
    className={`glass p-4 anim-fade d${Math.min(i + 1, 9)}`}>
    {/* card content */}
  </div>
))}
```

### Trading Card Hover

```css
.trading-card { transition: all .25s cubic-bezier(.16, 1, .3, 1); }

@media (hover: hover) {
  .trading-card:hover {
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 12px 40px rgba(0,0,0,.3);
    border-color: rgba(255,255,255,.12);
  }
}
.trading-card:active { transform: scale(0.98); }
```

**Key pattern**: Use `@media(hover:hover)` to prevent hover effects from firing on touch devices. Use `:active` with `scale(0.98)` for tactile feedback on mobile.

### Chart Fluid Animations

These animate Recharts SVG elements automatically when placed inside a `.chart-fluid` wrapper:

```css
/* Area fill breathes */
.chart-fluid .recharts-area-area {
  animation: breathe 4s ease-in-out infinite;
}

/* Area stroke glows */
.chart-fluid .recharts-area-curve {
  --glow-color: var(--chart-accent, rgba(59,130,246,0.4));
  animation: chartGlow 3s ease-in-out infinite;
}

/* Line draws in, then glows */
.chart-fluid .recharts-line .recharts-line-curve {
  stroke-dasharray: 2000;
  animation: lineDrawIn 2s ease-out forwards, chartGlow 3s ease-in-out 2s infinite;
}

/* Radar polygon pulses */
.chart-fluid .recharts-radar .recharts-radar-polygon {
  animation: radarPulse 3s ease-in-out infinite;
}
```

### Shimmer Overlay

A subtle light sweep across chart/card containers:

```css
.chart-fluid::after {
  content: '';
  position: absolute;
  top: 0; bottom: 0;
  left: -50%; width: 50%;
  pointer-events: none;
  background: linear-gradient(105deg,
    transparent 20%, rgba(255,255,255,0.015) 35%,
    rgba(255,255,255,0.035) 50%, rgba(255,255,255,0.015) 65%,
    transparent 80%);
  animation: shimmerSlide 6s ease-in-out infinite;
}
```

### Progress Bar Shimmer

```css
.progress-fill::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
  animation: shimmerSweep 3s ease-in-out infinite;
}
```

### Ticker (Marquee)

```css
@keyframes ticker {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.animate-ticker { animation: ticker 35s linear infinite; }
@media (hover: hover) { .animate-ticker:hover { animation-play-state: paused; } }
```

**Usage**: Duplicate content array `[...items, ...items]` so the marquee seamlessly loops.

---

## 4. Glass UI Components

### Glass Card (`.glass`)

The foundational card component:

```css
.glass {
  background: var(--glass);                  /* rgba(30,41,59,0.4) */
  border: 1px solid var(--glass-border);     /* rgba(255,255,255,0.06) */
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: var(--r-lg);               /* 24px */
}
```

**Composition pattern** (JSX):
```tsx
<div className="glass p-5 relative overflow-hidden anim-fade d3">
  {/* Colored accent strip at top */}
  <div className="accent-strip" style={{ background: color }} />
  {/* Decorative blur circle */}
  <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-[0.06]"
       style={{ background: color }} />
  {/* Content */}
</div>
```

### Accent Strip

A thin colored bar at the top of a card for visual categorization:

```css
.accent-strip {
  position: absolute; top: 0; left: 0; right: 0;
  height: 3px;
  border-radius: var(--r-lg) var(--r-lg) 0 0;
}
```

### Chip Badge (`.chip`)

For tags, labels, small status indicators:

```css
.chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 100px;
  font-size: .65rem; font-weight: 700;
}
```

**Usage** with inline color:
```tsx
<span className="chip text-[10px]"
  style={{ background: `${color}15`, color }}>
  Elite
</span>
```

The pattern `${color}15` appends 15 (hex opacity ~8%) to a hex color for a tinted background.

### Pill Button (`.pill`)

Toggle buttons, filter buttons:

```css
.pill {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 10px; border-radius: 100px;
  border: 1px solid var(--glass-border);
  background: var(--glass);
  cursor: pointer; transition: all .15s;
  font-size: .75rem; font-weight: 700;
}
.pill:active { transform: scale(.96); }
.pill.on { border-color: var(--neon-blue); background: rgba(59,130,246,.15); color: #93c5fd; }
```

### Tab Bar (`.tab-bar` + `.tab`)

Segmented control for page-level navigation:

```css
.tab-bar {
  display: flex; gap: 2px;
  background: var(--glass);
  border: 1px solid var(--glass-border);
  border-radius: var(--r); padding: 3px;
}
.tab {
  padding: 6px 14px; border-radius: 12px;
  font-size: .75rem; font-weight: 700;
  color: var(--text3); cursor: pointer;
  transition: all .15s; white-space: nowrap;
}
.tab.on { background: rgba(255,255,255,.08); color: var(--text); }
```

### Gender Toggle (`.gender-toggle`)

A specialized segmented toggle for binary filtering:

```css
.gender-toggle {
  display: flex; gap: 2px;
  background: rgba(255,255,255,.05);
  border: 1px solid var(--glass-border);
  border-radius: 14px; padding: 3px;
}
.gender-btn {
  padding: 6px 16px; border-radius: 11px;
  font-weight: 800; font-size: .75rem;
  transition: all .2s; cursor: pointer;
}
```

**Adapt for any domain**: Use this for any binary/ternary toggle -- "All / Active / Archived", "Daily / Weekly / Monthly", etc.

### Progress Bar

```css
.progress-track { height: 5px; background: rgba(255,255,255,.06); border-radius: 3px; overflow: hidden; }
.progress-fill {
  height: 100%; border-radius: 3px;
  transition: width .8s cubic-bezier(.16, 1, .3, 1);
  position: relative; overflow: hidden;
}
```

**Usage with dynamic color** (JSX):
```tsx
<div className="progress-track">
  <div className="progress-fill" style={{
    width: `${percent}%`,
    background: score >= 80 ? 'var(--neon-green)' : 'var(--neon-orange)',
  }} />
</div>
```

### Glow Utilities

```css
.glow-blue  { box-shadow: 0 0 30px rgba(59,130,246,0.15); }
.glow-green { box-shadow: 0 0 30px rgba(0,255,136,0.15); }
```

Apply to hero cards, #1 ranked items, featured content.

---

## 5. Chart System

### Recharts Setup Pattern

Every chart follows this composition:

```tsx
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { CrosshairCursor, FloatingTooltip } from '../ChartCrosshair';

function MiniChart({ data, color, metricKey, unit }) {
  return (
    <div className="glass p-5">
      <div className="chart-fluid"
        style={{ height: 180, '--chart-accent': `${color}66` }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <AreaChart data={data}>
            <defs>
              {/* Animated gradient fill */}
              <linearGradient id={`g-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}>
                  <animate attributeName="stop-opacity"
                    values="0.3;0.12;0.3" dur="4s" repeatCount="indefinite" />
                </stop>
                <stop offset="50%" stopColor={color} stopOpacity={0.08}>
                  <animate attributeName="stop-opacity"
                    values="0.08;0.2;0.08" dur="4s" begin="1s" repeatCount="indefinite" />
                </stop>
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
              {/* Glow filter for active dot */}
              <filter id={`glow-${metricKey}`}>
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <Tooltip
              cursor={<CrosshairCursor />}
              content={<FloatingTooltip unit={unit} color={color} />}
              isAnimationActive={false} />
            <Area type="monotone" dataKey="val"
              stroke={color} strokeWidth={2.5}
              fill={`url(#g-${metricKey})`}
              activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2,
                filter: `url(#glow-${metricKey})` }} />
            <XAxis dataKey="date" axisLine={false} tickLine={false}
              tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

### TradingView-Style Crosshair Cursor

A vertical dashed line with a soft highlight zone that follows the mouse:

```tsx
export function CrosshairCursor({ points, height }: any) {
  if (!points?.length) return null;
  const x = points[0].x;
  return (
    <g>
      {/* Sharp dashed line */}
      <line x1={x} y1={0} x2={x} y2={height}
        stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="4 3" />
      {/* Wide soft highlight zone */}
      <line x1={x} y1={0} x2={x} y2={height}
        stroke="rgba(255,255,255,0.04)" strokeWidth={20} />
    </g>
  );
}
```

**Usage**: Pass as `cursor` prop to Recharts `<Tooltip>`:
```tsx
<Tooltip cursor={<CrosshairCursor />} ... />
```

### Floating Tooltip (Revolut/TradingView Style)

```tsx
export function FloatingTooltip({ active, payload, label, unit, color }: any) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  if (val == null) return null;

  return (
    <div style={{
      background: 'rgba(15,23,42,0.95)',
      backdropFilter: 'blur(12px)',
      border: `1px solid ${color || 'rgba(255,255,255,0.1)'}`,
      borderRadius: 12,
      padding: '8px 12px',
      boxShadow: `0 4px 20px rgba(0,0,0,0.4),
                   0 0 15px ${color || 'rgba(59,130,246,0.15)'}`,
    }}>
      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 800,
                     fontSize: 16, color: color || '#fff' }}>
        {Number(val).toFixed(1)}
        {unit && <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 2 }}>{unit}</span>}
      </div>
    </div>
  );
}
```

### Multi-Line Tooltip (for comparison charts)

Shows multiple data series with color dots, useful for "Trends" views:

```tsx
export function MultiTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ /* same glass styling */ }}>
      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>{label}</div>
      {payload.filter(p => p.value != null).map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: 3, background: p.color }} />
          <span className="text-slate-400">{p.name}</span>
          <span className="font-mono font-black ml-auto">{Number(p.value).toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}
```

### SVG Animate Gradients

Gradients with `<animate>` elements create a "breathing" fill effect without JavaScript:

```xml
<linearGradient id="bfGrad" x1="0" y1="0" x2="0" y2="1">
  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}>
    <animate attributeName="stop-opacity"
      values="0.3;0.12;0.3" dur="4s" repeatCount="indefinite" />
  </stop>
  <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.08}>
    <animate attributeName="stop-opacity"
      values="0.08;0.22;0.08" dur="4s" begin="1s" repeatCount="indefinite" />
  </stop>
  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
</linearGradient>
```

### Recharts Tooltip Fix

```css
.recharts-tooltip-wrapper { pointer-events: none !important; }
```

This prevents the tooltip from intercepting mouse events and causing flickering.

---

## 6. Data Architecture

### Type System

Define your data types as narrow interfaces:

```ts
// Entry = a single data point (one measurement, one transaction, one check-in)
export interface Entry {
  name: string;          // Who
  date: string;          // When (ISO format: YYYY-MM-DD)
  // ... domain-specific fields, all nullable:
  kg: number | null;
  bodyFat: number | null;
  // Use number | null for every metric field -- missing data is expected
}

// Person = an aggregated entity with history
export interface Person {
  name: string;
  entries: Entry[];       // Sorted chronologically
  latest: Entry;          // Most recent entry (for current values)
  first: Entry;           // First entry (for delta calculations)
  previous: Entry | null; // Second-to-last (for recent momentum)
}
```

**Key pattern**: Every numeric field is `number | null`. Never use `0` as a stand-in for missing data. This makes null-checking explicit and prevents scoring/rendering bugs.

### JSONP Fetch Pattern

For Google Sheets backends (no CORS support), use JSONP:

```ts
export async function fetchAllData(): Promise<Entry[]> {
  return new Promise((resolve) => {
    const cb = `__cb_${Date.now()}`;
    // Register global callback
    (window as any)[cb] = (data: any) => {
      delete (window as any)[cb];
      document.getElementById(cb)?.remove();
      resolve(parseRows(data));
    };
    // Inject script tag
    const s = document.createElement('script');
    s.id = cb;
    s.src = `${API_URL}?callback=${cb}`;
    s.onerror = () => resolve(DEMO_DATA);    // Graceful fallback
    document.body.appendChild(s);
    // Timeout fallback
    setTimeout(() => {
      if ((window as any)[cb]) {
        delete (window as any)[cb];
        resolve(DEMO_DATA);
      }
    }, 8000);
  });
}
```

**Why JSONP?** Google Apps Script `doGet()` does not support CORS. JSONP wraps the response in a callback function and delivers it via a `<script>` tag. The 8-second timeout + demo data fallback ensures the app always works.

**For REST APIs**, replace with a standard `fetch()`:

```ts
export async function fetchAllData(): Promise<Entry[]> {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    return parseRows(data);
  } catch {
    return DEMO_DATA;
  }
}
```

### Data Parsing & Normalization

```ts
function num(v: any, isPercent = false): number | null {
  if (v == null || v === '') return null;
  const s = String(v).replace('%', '').replace(',', '.').trim();
  let n = parseFloat(s);
  if (isNaN(n)) return null;
  if (isPercent && n > 0 && n < 1) n = n * 100;  // 0.25 -> 25%
  return Math.round(n * 100) / 100;               // 2 decimal precision
}
```

**Key patterns**:
- Strip `%` and convert `,` to `.` (European number formats)
- Auto-detect if a percentage was entered as 0-1 vs 0-100
- Round to 2 decimals to prevent floating-point display noise

### groupByPerson (Entity Aggregation)

```ts
export function groupByPerson(entries: Entry[]): Person[] {
  const map = new Map<string, Entry[]>();
  entries.forEach(e => {
    const arr = map.get(e.name) || [];
    arr.push(e);
    map.set(e.name, arr);
  });
  return Array.from(map.entries()).map(([name, ents]) => {
    const sorted = ents.sort((a, b) => a.date.localeCompare(b.date));
    return {
      name,
      entries: sorted,
      latest: sorted[sorted.length - 1],
      first: sorted[0],
      previous: sorted.length > 1 ? sorted[sorted.length - 2] : null,
    };
  });
}
```

**Adapt for any domain**: Replace "Person" with "Account", "Habit", "Asset", etc. The pattern is always: group raw entries by entity, sort by time, surface `latest`, `first`, `previous`.

### Metric Definitions

Define metrics as a typed array of objects for DRY iteration:

```ts
export type MetricKey = 'kg' | 'bodyFat' | 'muscle' | /* ... */;

export interface MetricDef {
  key: MetricKey;
  label: string;          // Full display name
  shortLabel: string;     // Abbreviated (for tables, chips)
  unit: string;           // 'kg', '%', '$', ''
  icon: string;           // Emoji or icon name
  lowerBetter?: boolean;  // If true, negative deltas are green
  category: string;       // For grouping in UI
}

export const METRICS: MetricDef[] = [
  { key: 'kg', label: 'Weight', shortLabel: 'Wt', unit: 'kg', icon: '...', category: 'body' },
  { key: 'bodyFat', label: 'Body Fat', shortLabel: 'BF%', unit: '%', icon: '...', lowerBetter: true, category: 'body' },
  // ...
];
```

### Helper Functions

```ts
// Delta between two values
export function d(curr: number | null, prev: number | null): number | null {
  if (curr == null || prev == null) return null;
  return Math.round((curr - prev) * 100) / 100;
}

// Percentage delta
export function dPct(curr: number | null, prev: number | null): number | null {
  if (curr == null || prev == null || prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 10000) / 100;
}

// Color for a delta value (respects lowerBetter)
export function dColor(val: number | null, lowerBetter = false): string {
  if (val == null || val === 0) return 'var(--text3)';
  const good = lowerBetter ? val < 0 : val > 0;
  return good ? 'var(--neon-green)' : 'var(--neon-red)';
}

// Format number with fallback
export function f(v: number | null, dec = 1): string {
  if (v == null) return '\u2014'; // em dash
  return v.toFixed(dec);
}
```

---

## 7. Scoring Engine

### Weighted Multi-Factor Scoring

The scoring engine maps raw metrics to a human-friendly 6.0-10.0 grade scale:

```
Internal 0-100  -->  toGrade()  -->  6.0 - 10.0 display
```

```ts
function toGrade(internal: number): number {
  return Math.round((6 + Math.max(0, Math.min(100, internal)) * 0.04) * 10) / 10;
}
```

### Factor Design Template

Each scoring factor follows this pattern:

1. **Define "OK zone"** -- a generous range of acceptable values (gender-aware if relevant)
2. **Inside the zone**: Score 70-100, with midpoint scoring highest
3. **Outside the zone**: Degrade gently (2-5 points per unit of overshoot)
4. **No data = neutral** (60-65), never penalize missing data

```ts
// Example: Body Fat factor
const bfOk = gender === 'M' ? { lo: 10, hi: 26 } : { lo: 18, hi: 34 };
const bfMid = (bfOk.lo + bfOk.hi) / 2;
let bf = 60; // default if no data

if (latest.bodyFat != null) {
  if (latest.bodyFat >= bfOk.lo && latest.bodyFat <= bfOk.hi) {
    const dist = Math.abs(latest.bodyFat - bfMid);
    const halfRange = (bfOk.hi - bfOk.lo) / 2;
    bf = 70 + 30 * (1 - dist / halfRange);  // 70-100
  } else {
    const overshoot = latest.bodyFat < bfOk.lo
      ? bfOk.lo - latest.bodyFat
      : latest.bodyFat - bfOk.hi;
    bf = Math.max(20, 70 - overshoot * 2);   // degrades gently
  }
}
```

### Weighted Combination

```ts
const raw = bf * 0.25 + progress * 0.20 + bmi * 0.15 + consistency * 0.25 + muscle * 0.15;
return toGrade(raw);
```

### Score Breakdown Interface

Always expose per-factor scores alongside the total:

```ts
export interface ScoreBreakdown {
  total: number;        // 6.0 - 10.0
  bf: number;           // 6.0 - 10.0
  progress: number;
  bmi: number;
  consistency: number;
  muscle: number;
}
```

This enables the multi-colored breakdown bar in the leaderboard.

### Grade Color Mapping

```ts
function gradeColor(g: number): string {
  if (g >= 9)   return 'var(--neon-green)';
  if (g >= 8)   return '#4ecdc4';
  if (g >= 7)   return 'var(--neon-blue)';
  if (g >= 6.5) return 'var(--neon-orange)';
  return 'var(--neon-red)';
}
```

### Pattern Recognition / Insights

Generate natural-language insights from data trends:

```ts
export function getPersonInsight(p: Person):
  { text: string; emoji: string; tone: 'good' | 'neutral' | 'warn' } {

  // Check conditions in priority order (most specific first):
  // 1. Only 1 entry? -> "Just getting started"
  // 2. Strong consistent improvement? -> "On fire"
  // 3. Moderate improvement? -> "On track"
  // 4. Plateau with muscle gain? -> "Recomposition"
  // 5. Negative trend? -> "Time to recalibrate"
  // 6. Recent positive momentum? -> "Picking up"
  // 7. Stable in ideal zone? -> "Maintaining well"
  // 8. Default: "Need more data"
}
```

The `tone` field drives color: `good` = green, `warn` = orange, `neutral` = gray.

### Adapting the Scoring Engine

| Domain | Factors (weights) | OK Zones |
|--------|-------------------|----------|
| Finance | Portfolio return (30%), Sharpe ratio (25%), Diversification (20%), Consistency (25%) | Return: 5-15% annual |
| Habit Tracker | Streak length (30%), Completion rate (25%), Variety (20%), Recency (25%) | Completion: 60-100% |
| Psychology | Mood stability (25%), Sleep score (20%), Activity (20%), Social (15%), Journaling (20%) | Mood: 5-8 on 10-scale |

---

## 8. Layout Patterns

### Mobile-First Grid

Use Tailwind responsive breakpoints. Start with single-column, expand to multi-column:

```tsx
{/* 2 cols on mobile, 3 on sm, 5 on lg */}
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
  {stats.map(s => <StatCard key={s.label} {...s} />)}
</div>

{/* Full-width chart + sidebar */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
  <div className="lg:col-span-8">{/* Chart */}</div>
  <div className="lg:col-span-4">{/* Stats sidebar */}</div>
</div>
```

### Drag-Scroll Carousel

CSS + minimal JS for touch-friendly horizontal scrolling:

```css
.drag-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x proximity;
  scrollbar-width: thin;
}
.drag-scroll > * { scroll-snap-align: start; }
.drag-scroll.grabbing { cursor: grabbing; scroll-behavior: auto; }
.drag-scroll:not(.grabbing) { cursor: grab; scroll-behavior: smooth; }
```

```tsx
const scrollRef = useRef<HTMLDivElement>(null);
const [dragging, setDragging] = useState(false);
const dragState = useRef({ startX: 0, scrollLeft: 0, moved: false });

const onPointerDown = (e: React.PointerEvent) => {
  if (!scrollRef.current) return;
  setDragging(true);
  dragState.current = {
    startX: e.clientX,
    scrollLeft: scrollRef.current.scrollLeft,
    moved: false
  };
  scrollRef.current.setPointerCapture(e.pointerId);
};
const onPointerMove = (e: React.PointerEvent) => {
  if (!dragging || !scrollRef.current) return;
  const dx = e.clientX - dragState.current.startX;
  if (Math.abs(dx) > 5) dragState.current.moved = true;
  scrollRef.current.scrollLeft = dragState.current.scrollLeft - dx;
};
const onPointerUp = () => setDragging(false);
```

**Key pattern**: Track `moved` to distinguish drag from click. Only fire `onClick` if `!dragState.current.moved`.

### Ticker Bar

A horizontally scrolling marquee of fun facts / stats:

```tsx
<div className="overflow-hidden rounded-2xl"
  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
  <div className="flex animate-ticker whitespace-nowrap py-2.5">
    {/* Duplicate array for seamless loop */}
    {[...facts, ...facts].map((f, i) => (
      <span key={i} className="inline-block mx-6 text-[11px] font-bold text-slate-400 shrink-0">
        {f}
      </span>
    ))}
  </div>
</div>
```

### Responsive Table with Scroll

Desktop shows a full table; mobile wraps it for horizontal scroll:

```css
.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.lb-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 600px; }
.lb-table th {
  font-size: .6rem; text-transform: uppercase; letter-spacing: .1em;
  font-weight: 800; color: var(--text3); padding: 10px 12px;
  border-bottom: 1px solid var(--glass-border); white-space: nowrap;
  position: sticky; top: 0; background: var(--glass);
}
```

**Pattern**: On mobile (`md:hidden`), replace the table with stacked card layouts that show the same data vertically:

```tsx
{/* Mobile: stacked cards */}
<div className="md:hidden space-y-2">
  {ranking.map(p => <MobileLeaderCard key={p.name} {...p} />)}
</div>

{/* Desktop: full table */}
<div className="hidden md:block glass overflow-hidden">
  <div className="table-wrap">
    <table className="lb-table">...</table>
  </div>
</div>
```

### Bottom Nav Bar

```css
.mob-nav {
  display: none;
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
  background: rgba(15,23,42,0.95);
  backdrop-filter: blur(20px);
  border-top: 1px solid var(--glass-border);
  padding: 4px 4px calc(4px + env(safe-area-inset-bottom));
  justify-content: space-around;
}
@media (max-width: 768px) { .mob-nav { display: flex; } }
@media (min-width: 769px) { .mob-nav { display: none !important; } }
```

### Safe Area Padding

Account for the mobile nav bar height so content is not hidden behind it:

```css
.content-safe { padding-bottom: calc(70px + env(safe-area-inset-bottom)); }
@media (min-width: 769px) { .content-safe { padding-bottom: 2rem; } }
```

---

## 9. Interaction Patterns

### Drag Scroll with Pointer Capture

See the [carousel section above](#drag-scroll-carousel). Key implementation details:

- Use `setPointerCapture(e.pointerId)` to keep receiving events even if the pointer leaves the element.
- Track `moved` boolean (set true when `|dx| > 5px`) to distinguish drags from taps.
- On item click, check `if (!dragState.current.moved) onSelectItem(item)`.

### Timeline Slider with Snap Points

A range input styled as a glowing neon slider with date snap points:

```css
.timeline-slider {
  -webkit-appearance: none;
  appearance: none;
  height: 6px; border-radius: 3px;
  background: linear-gradient(to right,
    var(--accent) 0%, var(--accent) var(--pct),
    rgba(255,255,255,0.08) var(--pct), rgba(255,255,255,0.08) 100%);
  outline: none; cursor: pointer;
}
.timeline-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px; height: 18px; border-radius: 50%;
  background: var(--accent, #3b82f6);
  border: 3px solid #0f172a;
  box-shadow: 0 0 10px rgba(59,130,246,0.4), 0 0 0 2px var(--accent);
  cursor: grab;
}
```

**Usage** with CSS custom properties for dynamic coloring:

```tsx
<input type="range" min={0} max={maxIdx} step={0.01}
  value={sliderVal} onChange={e => setSliderVal(parseFloat(e.target.value))}
  className="timeline-slider w-full"
  style={{
    '--accent': accentColor,
    '--pct': `${(sliderVal / maxIdx) * 100}%`
  } as React.CSSProperties} />
```

The `step={0.01}` enables smooth interpolation between entries. Snap points below the slider provide visual anchors:

```tsx
<div className="flex justify-between mt-1">
  {entries.map((e, i) => (
    <button key={i} onClick={() => setSliderVal(i)}>
      <div className="w-1.5 h-1.5 rounded-full" style={{
        background: Math.abs(sliderVal - i) < 0.3 ? accentColor : 'rgba(255,255,255,0.15)',
        transform: Math.abs(sliderVal - i) < 0.3 ? 'scale(1.5)' : 'scale(1)',
      }} />
      <span className="text-[8px] font-mono">{formatDate(e.date)}</span>
    </button>
  ))}
</div>
```

### Tab / Pill Selection

State management pattern for segmented controls:

```tsx
const [gender, setGender] = useState<'all' | 'M' | 'F'>('all');

<div className="gender-toggle">
  {['all', 'M', 'F'].map(g => (
    <button key={g}
      onClick={() => setGender(g)}
      className="gender-btn"
      style={{
        background: gender === g ? `${genderColor}20` : 'transparent',
        color: gender === g ? genderColor : '#64748b',
      }}>
      {g === 'all' ? 'All' : g === 'M' ? 'Male' : 'Female'}
    </button>
  ))}
</div>
```

### Gender Toggle as a Domain Filter

The gender toggle is a pattern for any binary/ternary filter. Replace with:
- **Finance**: "All / Stocks / Crypto"
- **Habits**: "All / Daily / Weekly"
- **Analytics**: "7d / 30d / 90d / 1y"

---

## 10. 3D Visualization

### Architecture

The 3D layer is **optional** and **lazy-loaded** to keep initial bundle small:

```tsx
const Body3D = lazy(() => import('./Body3D'));

// In render:
<Suspense fallback={
  <div className="flex items-center justify-center" style={{ height: 420 }}>
    <span className="text-slate-500 animate-pulse">Loading 3D...</span>
  </div>
}>
  <Body3D entry={interpolated} gender={gender} />
</Suspense>
```

### 2D/3D Toggle

```tsx
const [is3D, setIs3D] = useState(true);

<button onClick={() => setIs3D(v => !v)}
  className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase"
  style={{
    background: is3D ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
    border: `1px solid ${is3D ? accentColor : 'rgba(255,255,255,0.08)'}`,
    color: is3D ? accentColor : '#64748b',
  }}>
  {is3D ? '3D' : '2D'}
</button>
```

### Three.js Body Mesh (react-three-fiber)

The 3D component builds a BufferGeometry from cross-section rings:

```tsx
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Define cross-sections: { y: normalized height, rx: width, rz: depth }
// Build rings of vertices, connect with triangle indices
// Wrap in <Canvas> with <OrbitControls>
```

**Key patterns**:
- Cross-sections are defined by measurement data (chest, waist, hips, etc.)
- Missing measurements use reference values for the gender
- `useFrame` for per-frame rotation or animation
- `OrbitControls` for drag-to-rotate, scroll-to-zoom

### SVG 2D Fallback (BodySilhouette)

The 2D visualization uses a single SVG `<path>` built from cubic Bezier curves:

1. **buildBody()** takes measurements + gender, returns a `d` path string
2. Two layers rendered: "fat" path (full body) and "lean" path (reduced body fat factor)
3. Heatmap zones (radial gradients) overlay areas where measurements changed
4. Ghost outline (dashed) shows first-entry silhouette for comparison
5. Measurement labels with leader lines positioned at anatomical landmarks
6. Visceral fat rendered as a radial glow in the abdominal area

**Interpolation** between timeline entries uses `lerpEntry()` for smooth slider transitions:

```ts
function lerp(a: number | null, b: number | null, t: number): number | null {
  if (a == null && b == null) return null;
  const va = a ?? b!; const vb = b ?? a!;
  return va + (vb - va) * t;
}

function lerpEntry(a: Entry, b: Entry, t: number): Entry {
  return {
    name: t < 0.5 ? a.name : b.name,
    date: t < 0.5 ? a.date : b.date,
    kg: lerp(a.kg, b.kg, t),
    bodyFat: lerp(a.bodyFat, b.bodyFat, t),
    // ... all numeric fields
  };
}
```

---

## 11. Deployment

### Single HTML File via vite-plugin-singlefile

The entire app (HTML + CSS + JS + fonts referenced via CDN) builds into a single `index.html`:

```bash
npm run build
# Output: dist/index.html (single file, ~500KB-1MB gzipped)
```

This file can be:
- Opened directly in a browser (no server needed)
- Hosted on GitHub Pages
- Shared via email/Slack
- Embedded in an iframe

### GitHub Pages Auto-Deploy

1. Build the project: `npm run build`
2. The `dist/index.html` is your entire app
3. Push to a `gh-pages` branch or configure GitHub Pages to serve from `dist/`

### Vite Config for Single-File

```ts
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist',
    cssCodeSplit: false,  // Important: keep all CSS in one chunk
  },
});
```

### Why Single-File?

- **Zero infrastructure**: No CDN, no server, no build pipeline needed for hosting
- **Offline-capable**: Works without internet (except for external API calls and CDN fonts)
- **Portable**: Send the HTML file to anyone and it works
- **Fast deployment**: One file to upload, no cache invalidation issues

---

## 12. Reuse Guide

### How to Adapt Each Building Block

#### Step 1: Fork the Design System

Copy `index.css` and update:

1. **Colors**: Change `--neon-*` values to match your brand. Keep the structural variables (`--glass`, `--glass-border`, `--bg`).
2. **Fonts**: Swap Montserrat for your body font. Keep JetBrains Mono for data (it makes any number look premium).
3. **Border radius**: Adjust `--r` and `--r-lg` if you want sharper (8px/12px for finance) or rounder (20px/32px for consumer) cards.

#### Step 2: Define Your Data Layer

1. Create your `Entry` type with your domain fields (all `number | null`).
2. Create your `Person`/`Entity` type with `entries[]`, `latest`, `first`, `previous`.
3. Write a `groupByEntity()` function.
4. Define your `METRICS` array with `key`, `label`, `unit`, `lowerBetter`, `category`.

#### Step 3: Build Your Scoring Engine

1. Identify 4-6 scoring factors relevant to your domain.
2. For each factor, define an "OK zone" range.
3. Assign weights that sum to 1.0.
4. Use the `toGrade(internal)` function to map 0-100 to 6.0-10.0.
5. Write a `getInsight()` function that checks conditions in priority order.

#### Step 4: Assemble Pages from Patterns

| Pattern | Source Component | Use For |
|---------|-----------------|---------|
| Leaderboard + Awards | `SquadPage.tsx` | Rankings, comparisons, team views |
| Profile + Dashboard | `MyProfilePage.tsx` | Individual detail, personal analytics |
| Trend Charts | `TrendsPage.tsx` | Multi-entity time series |
| Side-by-Side Compare | `ComparePage.tsx` | A vs B comparison |
| Data Entry Form | `InputPage.tsx` | New data collection |
| History Log | `HistoryPage.tsx` | Full audit trail table |

### Domain-Specific Recipes

#### Finance Dashboard

```
Entry type:  { ticker, date, price, volume, marketCap, pe, dividendYield }
Entity:      Stock/Portfolio
Metrics:     price ($), volume, P/E ratio, dividend yield (%), market cap
Scoring:     return (30%), volatility (20%, lower better), diversification (25%), Sharpe (25%)
Charts:      Area chart for price, bar chart for volume, radar for risk profile
Ticker:      "AAPL +2.3% | MSFT -0.5% | Total portfolio: +8.2% YTD"
Cards:       Glass cards with green/red accent strips based on daily P&L
```

#### Habit Tracker

```
Entry type:  { habitName, date, completed, duration, quality, notes }
Entity:      Habit
Metrics:     streak (days), completion rate (%), avg duration, quality score
Scoring:     streak (30%), consistency (25%), variety (20%), recency (25%)
Charts:      Calendar heatmap, streak line chart, radar for habit balance
Ticker:      "Meditation: 45-day streak | Reading: 89% completion | 3 habits today"
Cards:       Glass cards with golden accent for long streaks
Toggle:      "Daily / Weekly / Monthly" instead of gender
```

#### Psychology / Mood Tracker

```
Entry type:  { date, mood, energy, anxiety, sleep, exercise, social, journal }
Entity:      Person (self)
Metrics:     mood (1-10), energy (1-10), anxiety (1-10, lower better), sleep hours
Scoring:     stability (30%), sleep (25%), activity (20%), social (15%), journaling (10%)
Charts:      Area chart for mood, radar for wellbeing dimensions, scatter for correlations
Insights:    "Mood improves on days with 7+ hours sleep" (pattern recognition)
Body viz:    Replace with mood silhouette or energy body map
```

#### Personal Agent / Productivity

```
Entry type:  { date, tasksCompleted, focusMinutes, meetings, inbox, codeCommits }
Entity:      Day / Week
Metrics:     tasks done, deep focus hours, meeting load (lower better), inbox zero %
Scoring:     output (30%), focus (25%), communication (20%), consistency (25%)
Charts:      Stacked area for time allocation, bar chart for daily output
Ticker:      "47 tasks this week | 23h deep focus | 5 meetings | Inbox: 3"
```

### Checklist: From Zero to Shipped Dashboard

1. [ ] Copy `index.css` design system, update palette
2. [ ] Define `Entry` and `Entity` types in `lib/data.ts`
3. [ ] Write `fetchData()` + `parseRows()` + `groupByEntity()`
4. [ ] Define `METRICS` array
5. [ ] Build scoring engine with 4-6 weighted factors
6. [ ] Write `getInsight()` pattern recognition
7. [ ] Create page components using glass cards, chips, progress bars
8. [ ] Add charts with CrosshairCursor + FloatingTooltip
9. [ ] Wrap charts in `.chart-fluid` for animations
10. [ ] Add bottom nav (mobile) + tab bar (desktop)
11. [ ] Add ticker bar with fun facts
12. [ ] Add drag-scroll carousel for awards/highlights
13. [ ] Add staggered entrance animations (`anim-fade d1-d9`)
14. [ ] Test on mobile (safe area padding, touch targets, no hover)
15. [ ] Build with `vite-plugin-singlefile` and deploy

### Performance Considerations

- **Lazy-load 3D** with `React.lazy()` + `<Suspense>` -- Three.js is heavy
- **`useMemo`** all derived data (scores, rankings, trend calculations)
- **`minWidth={0} minHeight={0}`** on `<ResponsiveContainer>` to prevent Recharts resize loops
- **`isAnimationActive={false}`** on `<Tooltip>` to prevent animation lag
- **CSS animations** over JS animations (GPU-accelerated, zero React re-renders)
- **`pointer-events: none`** on decorative overlays (shimmer, glow, ambient gradients)
- **JSONP timeout** (8s) with demo data fallback so the app never hangs

---

## Quick Reference: CSS Class Cheat Sheet

| Class | Purpose |
|-------|---------|
| `.glass` | Frosted glass card (background + blur + border) |
| `.chip` | Small rounded badge/tag |
| `.pill` / `.pill.on` | Toggle button (off/on states) |
| `.tab-bar` + `.tab` / `.tab.on` | Segmented navigation control |
| `.trading-card` | Hover lift + scale effect for clickable cards |
| `.accent-strip` | 3px colored bar at top of card |
| `.progress-track` + `.progress-fill` | Animated progress bar with shimmer |
| `.gender-toggle` + `.gender-btn` | Binary/ternary filter toggle |
| `.anim-fade` | Fade-up entrance animation |
| `.anim-slide` | Slide-right entrance animation |
| `.float` | Gentle idle floating animation |
| `.d1` through `.d9` | Staggered animation delays (50ms increments) |
| `.glow-blue` / `.glow-green` | Colored box-shadow glow |
| `.chart-fluid` | Wrapper that adds breathing + shimmer to Recharts |
| `.drag-scroll` | Horizontal scroll container with snap + grab cursor |
| `.animate-ticker` | Continuous horizontal scroll (marquee) |
| `.mob-nav` | Fixed bottom nav, shows only on mobile |
| `.content-safe` | Bottom padding to clear mobile nav |
| `.table-wrap` + `.lb-table` | Responsive data table with sticky headers |
| `.timeline-slider` | Styled range input with neon thumb and glow |
