# Claude — ShapeSquad Project Instructions

> Read this first if you're picking up work on this codebase.

## Project

**ShapeSquad** — body composition tracker for a small team. Logs weight, body fat %, muscle mass, water, visceral fat, and body measurements (biceps, back, chest, waist, hips). Gamified with XP + tiers. Google Sheets backend, Anthropic-powered AI coach. Deployed on Vercel.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind 3 · Anthropic SDK · Google Sheets via Apps Script JSONP · Recharts (legacy — being phased out for inline SVG).

## The most important file in this repo right now

**[MASTERPIECE_GUIDE.md](./MASTERPIECE_GUIDE.md)** — the UI redesign brief.

If the user asks to "improve the design", "make it look like somn", "apply masterpiece UI", or any variation: **open MASTERPIECE_GUIDE.md and execute it section by section in the listed migration order**. The guide is self-contained — every CSS token, every component skeleton, every gotcha is inlined. You don't need to fetch anything from the somn project.

## How to work in this repo

1. **Domain logic lives in `lib/shape.ts`** — types, helpers, score, XP, streaks. Don't rewrite this when touching UI. Wrap it.
2. **Hooks in `lib/use*.ts`** — `useShapeData`, `useActiveUser`, `useTheme`. Stable, reuse them.
3. **API routes in `app/api/`** — chat, data, etc. Backend stays unless explicitly asked.
4. **UI in `components/` and `app/page.tsx`** — this is where redesigns happen.
5. **Always run `npm run build` after structural changes** before declaring done. Vercel rejects vulnerable Next versions.

## Other reference docs

- [README.md](./README.md) — original project overview (stack, Google Sheets setup)
- [BLUEPRINT.md](./BLUEPRINT.md) — generalized AI-dashboard blueprint (auth, repo pattern, tool-use loop). Cross-project; not specific to ShapeSquad.
- [ARCHITECTURE.md](./ARCHITECTURE.md) — system architecture overview
- [FRONTEND_TEMPLATE.md](./FRONTEND_TEMPLATE.md) — frontend template notes

## Conventions

- Romanian copy in UI ("Greutate", "Schimbă utilizator", etc.). Keep `ro` locale.
- `--var-name` CSS custom properties for theming (slate 950 dark / slate 50 light).
- Tailwind classes for layout/spacing, inline `style={{}}` only for dynamic colors from data.
- `num` class on numeric values for tabular-nums + tight letter-spacing.
- `label` class for the small uppercase section headers.
- Components: PascalCase named exports. Files: PascalCase for components, kebab-case for lib.

## Don't ask, just do (after MASTERPIECE_GUIDE.md is followed)

- Always commit incrementally (one section of the guide per commit, ideally).
- Push to `main` triggers Vercel auto-deploy. Don't push broken builds.
- If the user says "make it look better" without specifics, default to the somn masterpiece direction unless the change has already been applied.
