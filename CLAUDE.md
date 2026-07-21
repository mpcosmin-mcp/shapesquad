# Claude — ShapeSquad Project Instructions

> Read this first if you're picking up work on this codebase.

## Project

**ShapeSquad** — body composition tracker for a small team. Logs weight, body fat %, muscle mass, water, visceral fat, and body measurements (biceps, back, chest, waist, hips). Gamified with XP + tiers. Neon Postgres backend (measurements) + Upstash Redis (social/bookings). Deployed on Vercel.

> **No AI / Anthropic anymore.** The Squad AI chat coach was removed (2026-05-20) — runtime AI token cost = $0. Forum idea-farming is now a manual monthly review by the owner. If reintroducing AI later, re-add `@anthropic-ai/sdk` + a focused on-demand endpoint (don't auto-call per message).

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind 3 · Neon Postgres (`lib/db.ts`, measurements) · Upstash Redis (social/bookings) · Recharts (legacy — being phased out for inline SVG).

## Design system — token-disciplined loading

The masterpiece design language is the **global `masterpiece-ui` skill** (canonical, ~7K tokens, invoke it when doing UI work). Don't duplicate-load.

`MASTERPIECE_GUIDE.md` (~11K tokens) + `FRONTEND_TEMPLATE.md` (~11K tokens) are **large project-specific references**. To save tokens:
- **Never read them whole-file.** `grep` the specific section you need (e.g., `grep -n "ScoreCard\|chart\|tooltip" MASTERPIECE_GUIDE.md`), then read only that range.
- For generic design tokens/components → use the `masterpiece-ui` skill (smaller, canonical).
- For ShapeSquad-specific adaptations (Romanian copy, body-comp components, migration order) → grep the relevant section of MASTERPIECE_GUIDE.md.

If asked to "apply masterpiece UI" / "improve design": invoke the `masterpiece-ui` skill first; consult the project guide by section only for ShapeSquad-specific deltas.

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

## Token discipline (read this)

- **Grep before read.** Find the symbol/section, read only that range. Never whole-file the big guides (MASTERPIECE_GUIDE 11K, FRONTEND_TEMPLATE 11K, BLUEPRINT 5.7K).
- **One source of truth for design:** the `masterpiece-ui` skill. The project guides are deltas/references, not required reads.
- `/clear` between unrelated task batches to drop stale context.

## Don't ask, just do

- Always commit incrementally (one logical change per commit).
- Push to `main` triggers Vercel auto-deploy. Don't push broken builds.
- If the user says "make it look better" without specifics, default to the somn masterpiece direction unless the change has already been applied.
