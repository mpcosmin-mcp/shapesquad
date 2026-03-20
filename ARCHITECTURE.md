# ShapeSquad — Project Architecture & Roadmap

## 🎯 What Is This
Team body composition tracking dashboard for IT Software team at Aumovio Sibiu. Gamified leaderboard with personal analytics, trend tracking, and body visualization.

**Live:** `https://mpcosmin-mcp.github.io/shapesquad`
**Repo:** `https://github.com/mpcosmin-mcp/shapesquad`

---

## 🏗️ Stack

| Layer | Tech |
|-------|------|
| Framework | React 18 + TypeScript |
| Styling | Tailwind CSS + custom CSS vars |
| Charts | Recharts (AreaChart, LineChart, RadarChart) |
| Icons | Lucide React |
| Build | Vite + vite-plugin-singlefile → single HTML output |
| Backend | Google Sheets via Apps Script (JSONP read, POST write) |
| Hosting | GitHub Pages via GitHub Actions auto-deploy |
| Fonts | Montserrat (headings) + JetBrains Mono (data) |

---

## 📁 Project Structure

```
shapesquad/
├── .github/workflows/deploy.yml    # Auto-deploy on push
├── public/favicon.svg              # SS logo neon green on navy
├── src/
│   ├── App.tsx                     # Shell, routing, nav, gender toggle, logo reset
│   ├── main.tsx                    # React entry
│   ├── index.css                   # Design system, animations, mobile-first
│   ├── lib/
│   │   ├── shape.ts                # Types, API, parsing, grouping, helpers, demo data
│   │   └── awards.ts               # (future) extracted award logic
│   └── components/pages/
│       ├── MyProfilePage.tsx        # Personal deep-dive, charts, body comp, silhouette
│       ├── BodySilhouette.tsx       # SVG body shape v2, multi-layer, timeline, heatmap
│       ├── SquadPage.tsx            # Home: ticker, awards carousel, chart, leaderboard
│       ├── TrendsPage.tsx           # Multi-metric charts, me vs all toggle
│       ├── ComparePage.tsx          # Radar + head-to-head with crowns
│       ├── HistoryPage.tsx          # Full data table with filters
│       └── InputPage.tsx            # PIN-locked measurement entry form
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── ARCHITECTURE.md                  # ← this file
```

---

## 🎨 Design System

### Aesthetic: "Nike Lab meets Gaming HUD"
- **Base:** Deep navy `#0f172a` with glassmorphism
- **Cards:** `rgba(30,41,59,0.4)` + `backdrop-filter: blur(16px)` + subtle border
- **Accent colors:** Neon green `#00ff88`, blue `#3b82f6`, pink `#ec4899`, orange `#f97316`, purple `#a855f7`
- **Data positive:** `#00ff88` (green) | **Data negative:** `#ff3b3b` (red)
- **Gender:** Blue for ♂, Pink for ♀, neutral for ALL
- **Typography:** Montserrat 900 (headings), 700 (labels), JetBrains Mono (all numbers/data)
- **Animations:** `fadeUp`, `slideR`, `float` with staggered delays (d1-d9)
- **Mobile:** Bottom nav, stacked cards instead of tables, drag-scroll carousels, 44px min tap targets

### CSS Variables
```css
--bg: #0f172a          --text: #f1f5f9
--glass: rgba(30,41,59,0.4)  --text2: #94a3b8  --text3: #475569
--neon-green: #00ff88  --neon-blue: #3b82f6   --neon-pink: #ec4899
--neon-orange: #f97316 --neon-purple: #a855f7  --neon-red: #ff3b3b
--r: 16px              --r-lg: 24px
```

---

## 📊 Data Model

### Google Sheet Columns
`Nume | Date | Kg | Body Fat % | Visceral Fat | Muscle | Water | Gender | Biceps | Spate | Piept | Talie | Fesieri`

### TypeScript Types
```typescript
interface Entry {
  name: string; date: string; kg: number|null; bodyFat: number|null;
  visceralFat: number|null; muscle: number|null; water: number|null;
  gender: 'M'|'F'; biceps: number|null; spate: number|null;
  piept: number|null; talie: number|null; fesieri: number|null;
}

interface Person {
  name: string; gender: 'M'|'F'; entries: Entry[];
  latest: Entry; first: Entry; previous: Entry|null;
}
```

### Parsing Notes
- Google Sheets sends percentages as decimals (0.251 = 25.1%) — `num()` handles this
- Date format: M/D/YYYY from Sheets → converted to ISO
- JSONP callback for cross-origin read
- POST with `mode: 'no-cors'` for write

---

## 🏆 Gamification System

### Awards (auto-assigned from data)
| Award | Emoji | Logic |
|-------|-------|-------|
| Pure Talent | ✨ | Lowest body fat % |
| The Progressive | ⚡ | Biggest BF% drop (first → last) |
| Belly Boss | 🍕 | Highest body fat % |
| Streak Master | 🔥 | Most measurements |
| Lazy Legend | 🦥 | Fewest measurements |
| Zen Master | 🧘 | Hash fallback |
| The Sniper | 🎯 | Hash fallback |
| Diamond Hands | 💎 | Hash fallback |
| Rocket | 🚀 | Hash fallback |
| Beast Mode | 🦁 | Hash fallback |

### Fun Facts Ticker
Auto-generated from real data:
- Squad total weight in "average humans"
- Who gained/lost most kg
- Data nerd (most measurements)
- Gender ratio
- Average BF% with commentary

---

## 🧍 Body Silhouette (Current: v2 SVG)

### How It Works
- Parametric SVG body generated with all-cubic-bezier curves (no straight line segments)
- Scale factors per zone: `piept`, `talie`, `fesieri`, `biceps` + estimated `coapse`, `gambe`
- `bodyFat%` adds puffiness + `bmiScale()` makes heavier people visually wider
- Gender differences: F has narrower shoulders/neck, wider hips, hourglass waist; M has V-taper
- **Multi-layer rendering:** fat layer (outer, orange), lean layer (inner, accent color), visceral fat glow (belly zone)
- **Timeline slider** with step=0.01 for smooth morphing between measurement dates via `lerpEntry()`
- **Heatmap zones** showing per-measurement deltas vs first entry (green = good, red = bad, with lowerBetter logic)
- **First entry ghost** shown as dashed overlay for comparison
- Delta labels (+/- cm) next to each measurement
- Side panel: Body Fat %, Visceral Fat level, Weight (fat/lean split), BMI, Lower Body estimates
- **Lower body estimation:** thigh from hip circumference (anthropometric ratio), calf from weight/height formula

### Body Composition Model (MyProfilePage)
- 100% stacked model: Fat% + Muscle% + Bone/Organs% = 100%
- Water shown separately (it's distributed across all tissues, ~75% of muscle is water)
- Three weight cards: Fat kg, Muscle kg, Bone/Organs kg

### Reference Heights (Romania avg)
- Male: 175cm
- Female: 162cm

---

## 🗺️ Roadmap

### ✅ Done (v1)
- [x] Google Sheets backend + Apps Script
- [x] GitHub Pages auto-deploy
- [x] Squad page with awards, ticker, leaderboard
- [x] Personal profile with charts, body comp, measurements
- [x] Trends (me vs all), Compare (radar + H2H)
- [x] History with filters
- [x] PIN-locked input form
- [x] Gender toggle (ALL/♂/♀)
- [x] Welcome picker ("Who are you?")
- [x] Logo = hard reset to home
- [x] Drag-to-scroll carousel
- [x] Mobile-first responsive
- [x] SVG body silhouette v1

### ✅ Done (v2)
- [x] **Body Silhouette v2** — organic all-bezier SVG paths, BMI-based width scaling
- [x] **Timeline slider** — scrub through months with smooth lerp morphing (step 0.01)
- [x] **Fat/Lean/Visceral layers** — multi-layer SVG: fat outer, lean inner, visceral glow
- [x] **Heatmap zones** — color zones for gain/loss per body zone (vs first entry)
- [x] **Lower body estimation** — thigh from hip ratio, calf from weight/height
- [x] **Body composition fix** — 100% model (Fat + Muscle + Bone/Organs), Water separate
- [x] **Click-to-profile** — clicking user on Squad page navigates to profile

### 🔜 Next (v3)
- [ ] **Three.js 3D body** — parametric mesh from cross-section measurements, rotatable
- [ ] **Side-by-side 3D compare** — two months next to each other
- [ ] **Measurement input** — add height field per person
- [ ] **Photo overlay** — optional progress photo behind silhouette

### 💡 Ideas Parking Lot
- Avatar customization (hair, skin tone)
- Monthly email/Teams digest with highlights
- Prediction: "At this rate, you'll hit X% BF by month Y"
- Challenge mode: team vs team goals
- Integration with Garmin/fitness trackers
- Export PDF monthly report

---

## ⚙️ Development

### Local Dev
```bash
npm install
npm run dev          # localhost:5173
```
Note: Google Sheets API won't work on localhost (JSONP restriction). Falls back to demo data.

### Build
```bash
npm run build        # dist/index.html (single file)
```

### Deploy
Push to `main` → GitHub Actions auto-deploys.
```bash
git add .
git commit -m "message"
git push --force
```

### Apps Script API
```
URL: https://script.google.com/macros/s/AKfycbxqEkxY93XwuKtu1daSqSj_4EsILuaLGVJzoLpPEaBIKcqsLIcgSoCzk5_VeTsDNOAg/exec
Read: GET with ?callback=fn (JSONP)
Write: POST with JSON body (no-cors)
Sheet tab: "ShapeSquad"
```

### Input PIN
`shapesquad2025` — defined in `InputPage.tsx` line 4.

---

## 🚨 Triggers for Claude Code

When working on this project:
1. **Always read this file first** before making changes
2. **Build after every change** — `npx vite build` must pass
3. **Mobile-first** — test at 375px width, then desktop
4. **No localStorage** — not supported in single-file artifacts
5. **TypeScript `any` for Recharts formatters** — known type mismatch, use `(v: any)`
6. **Google Sheets % parsing** — values < 1 are percentages (multiply by 100)
7. **Gender colors** — blue for M, pink for F, neutral/white for ALL
8. **Font consistency** — Montserrat for text, JetBrains Mono for ALL numbers
9. **Animation delays** — use d1-d9 classes for staggered reveals
10. **Keep files < 300 lines** — split if bigger

---

## 👥 Team
Petrica (admin), Adina, Bogdan, Cata, Clara, Cristi, Diana Mica, Diana Mijlocie, Gaby, Lavinia, Stefi, Varamea
