# ShapeSquad — Body Composition Tracker

Team body composition tracking dashboard. Tracks weight, body fat, muscle mass, water, visceral fat, and body measurements.

## Stack

- **React 18** + TypeScript
- **Tailwind CSS** (custom dark/light design system)
- **Chart.js** (trends, radar charts)
- **Google Sheets** backend via Apps Script JSONP
- **Vite** + vite-plugin-singlefile → single HTML output
- **GitHub Pages** via GitHub Actions auto-deploy

## Pages

- **Dashboard** — Squad overview cards, metrics table, body composition bars, measurements
- **Trends** — Line charts per metric, filter by person
- **Compare** — Radar chart + side-by-side table with crown for best values
- **History** — Full data archive with filters
- **Log** — Input form for new measurements

## Development

```bash
npm install
npm run dev        # localhost:5173
npm run build      # dist/index.html (single file)
```

## Deploy

Push to `main` → GitHub Actions builds and deploys automatically.

**First time setup:**
1. Repo → Settings → Pages → Source: **GitHub Actions**
2. Push to main
3. Done: `https://[username].github.io/[repo-name]`

## Google Sheets Setup

1. Create a Google Sheet with columns: `Nume, Date, Kg, Body Fat %, Visceral Fat, Muscle, Water, Gender, Biceps, Spate, Piept, Talie, Fesieri`
2. Extensions → Apps Script → paste the doGet/doPost handler
3. Deploy as web app → copy URL
4. Paste URL in `src/lib/shape.ts` → `API` constant

Without API configured, the app runs with demo data.

## Design

- **Fonts**: Clash Display (headings) + Satoshi (body) + JetBrains Mono (data)
- **Dark theme**: Charcoal/midnight with neon green accent (#c8ff2e)
- **Light theme**: Warm off-white with deep purple accent (#5a2ee0)
- **Metric colors**: Green = gain/improvement, Red = loss/regression
