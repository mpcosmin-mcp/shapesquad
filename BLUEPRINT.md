# AI Dashboard Blueprint

> Full-stack blueprint for any internal dashboard with **DB + AI chat + role-based auth + drag-and-drop**, deployed on Vercel.
>
> Battle-tested in [coldea-dashboard](https://coldea-dashboard.vercel.app). Reusable for inventory, CRM, HR, support tickets, project trackers — any domain with **CRUD + conversation**.
>
> Cost: ~$2–4/month per client. Time to clone for a new client: **~1 day**.

---

## What you get

- **PIN auth** — 4-digit codes per role, edge-runtime safe, HMAC-signed cookies
- **Two-role RBAC** — admin (read+write) and viewer (read-only). AI chat tool-filtered per role.
- **Name picker** — after PIN, user picks display name. Used for attribution in transfers and AI.
- **Repository data layer** — clean read+write interface, 60s cache, auto-invalidate on writes
- **AI chat with tool use** — Claude Haiku 4.5 reads AND writes the DB. After mutation → frontend refetches instantly.
- **Drag-and-drop** — kanban-style board with optimistic UI + rollback on error
- **Visual data viz** — donut charts, bar charts, tier-based sizing, all SVG (no chart lib)
- **Top 3 Insights** — server-computed deterministic patterns (hotspot, valuable, active)
- **Auto-backup** — Vercel Cron snapshots DB daily, keeps last N
- **AppShell** — chat panel docks right on desktop, page width animates to make room
- **Smoke test** — 24-check end-to-end script you run after every deploy
- **Premium aesthetics** — stratified shadows, subtle texture, italic serif brand mark, popover with contact

---

## The Big Picture

```
                           ┌─────────────────────────────────┐
                           │  USER                            │
                           │  ────                            │
                           │  Login PIN → name → dashboard.   │
                           │  Talks to AI. Drags cards.        │
                           │  Sees instant refresh.            │
                           └────────────────┬─────────────────┘
                                            │
                                            │  HTTPS
                                            ▼
                  ┌─────────────────────────────────────────────────┐
                  │  FRONTEND (Next.js 15 App Router · Tailwind)    │
                  │  ──────────────────────────────────────────     │
                  │  AppShell wraps pages.                          │
                  │  ChatPanel docks right on chat open.            │
                  │  Pages refetch when AI mutates.                 │
                  └────────────┬──────────────────────┬─────────────┘
                               │                      │
                       /api/data         /api/chat (tool-use loop)
                               │                      │
                  ┌────────────▼──────────────────────▼─────────────┐
                  │  REPOSITORY (lib/sheets.ts)                     │
                  │  ──────────────────────────                     │
                  │  Single interface: list, find, create, update,  │
                  │  remove, logTransfer.                            │
                  │  60s in-memory cache → invalidated on writes.   │
                  └────────────┬─────────────────────────────────────┘
                               │
                  ┌────────────▼──────────────┐
                  │  Google Sheets API v4     │  ← DB. Swappable.
                  │  (or Supabase / Postgres) │
                  └────────────┬──────────────┘
                               │
                               ▼
                       Google Spreadsheet
                       ├── Main data tab
                       ├── Log tab (audit trail)
                       ├── Config tab (subscribers etc.)
                       └── Backup_YYYY-MM-DD-HH-mm × N
```

The trick: **Repository abstraction**. AI tools, drag-drop API, and page loaders all go through the same `lib/sheets.ts` methods. Swap the DB without touching anything else.

---

## Stack

| Layer | Tech | Why |
|---|---|---|
| Frontend | **Next.js 15** App Router + RSC | API routes co-located, server components for data fetch |
| Styling | **Tailwind v3** + custom shadow tokens | Premium look without a design system overhead |
| Auth | **HMAC cookies + Web Crypto API** | Edge-runtime safe, no library needed |
| DB | **Google Sheets API v4** (default) | Free, team-friendly, no maintenance. Swap when you outgrow it. |
| AI | **Anthropic SDK · Claude Haiku 4.5** | Cheap (~$0.003/turn), fast, supports tool use |
| Hosting | **Vercel** (Hobby tier covers most) | Auto-deploy on git push, free Cron, edge functions |
| Charts | **Pure inline SVG** (no library) | 0KB extra weight, full control, sharp at any size |

---

## Architecture: 7 layers

### Layer 1 — Auth (`lib/auth.ts`)

PIN → role → signed cookie. Edge-runtime safe (Web Crypto API, no `node:crypto`).

```ts
export type Role = "admin" | "viewer";

export interface Session {
  authenticated: boolean;
  role: Role | null;
  name: string | null;
}

export function pinToRole(input: string): Role | null { /* HMAC-safe compare */ }
export async function setSession(role: Role) { /* httpOnly signed cookie */ }
export async function setName(name: string) { /* sanitized name cookie */ }
export async function getSession(): Promise<Session>;
export async function requireAdmin(): Promise<boolean>;
```

**Gotcha caught:** `lib/auth.ts` and `middleware.ts` run on Edge runtime. Cannot use `node:crypto`. Use `crypto.subtle.sign('HMAC', ...)` instead.

### Layer 2 — Repository (`lib/sheets.ts`)

The single source of truth that both frontend reads AND AI writes go through.

```ts
// Reads (cached 60s)
getInventory(): Promise<Item[]>
findItemByCode(cod: string): Promise<Item | null>
searchItems(query: string): Promise<Item[]>
getTransfers(): Promise<Transfer[]>
getSantiere(): Promise<string[]>

// Writes (invalidate cache after)
addItem(input): Promise<Item>
updateItem(cod, updates): Promise<Item>
deleteItem(cod): Promise<{deleted: Item}>
logTransfer(input): Promise<void>

// Computed (server-side aggregates)
computeStats(items): Stats
```

Cache via `Map<string, {data, expires}>`. Every write calls `invalidateCache()` so the next read is fresh.

### Layer 3 — API routes (thin wrappers)

```
/api/auth        POST pin → role · DELETE → logout
/api/auth/name   POST name → set name cookie
/api/whoami      GET → { authenticated, role, name }
/api/data        GET → { items, santiere }
/api/move        POST { cod, toSantier } → updateItem + logTransfer  [admin only]
/api/chat        POST { messages } → { text, mutated, toolCalls }
/api/backup      GET  (cron, with CRON_SECRET) · POST (admin)
```

**Design rules:**
1. API routes never call other API routes — they call `repo` directly.
2. AI tools call `repo` too, not API routes.
3. Write routes check `requireAdmin()` first.

### Layer 4 — AI tools (`lib/tools.ts`)

Tool definitions follow Anthropic's `Tool[]` schema:

```ts
export const TOOLS: Anthropic.Tool[] = [
  { name: "list_inventory", description: "...", input_schema: {...} },
  { name: "add_item", description: "...", input_schema: {...} },
  // ...
];

export const WRITE_TOOLS = new Set(["add_item", "update_item", "delete_item", "log_transfer"]);

export async function executeTool(name, input) {
  switch (name) {
    case "list_inventory": return repo.list(input);
    case "add_item": return repo.create(input);
    // ...
  }
}
```

**Gotcha caught:** Tool `input_schema` property keys must match `/^[a-zA-Z0-9_.-]{1,64}$/`. **No diacritics, spaces, or parentheses.** If your DB columns are Romanian (`Șantier`, `Preț (RON)`), use snake_case keys in the schema (`santier`, `pret_ron`) and remap in `executeTool`.

### Layer 5 — Chat route (the agentic loop)

```ts
// /api/chat
export async function POST(req) {
  const session = await getSession();
  if (!session.authenticated) return 401;
  
  // Filter tools by role: viewer gets only read tools
  const tools = session.role === "viewer"
    ? TOOLS.filter(t => !WRITE_TOOLS.has(t.name))
    : TOOLS;
  
  const conversation = messages.map(...);
  let mutated = false;
  let i = 0;
  
  while (i++ < 8) {  // safety bound
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages: conversation,
    });
    
    if (response.stop_reason === "tool_use") {
      conversation.push({ role: "assistant", content: response.content });
      const results = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        if (WRITE_TOOLS.has(block.name)) mutated = true;
        try {
          const r = await executeTool(block.name, block.input);
          results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(r) });
        } catch (err) {
          results.push({ type: "tool_result", tool_use_id: block.id, content: err.message, is_error: true });
        }
      }
      conversation.push({ role: "user", content: results });
      continue;
    }
    
    const text = response.content.filter(b => b.type === "text").map(b => b.text).join("\n");
    return NextResponse.json({ text, mutated, toolCalls });
  }
}
```

**The `mutated` flag is everything.** The frontend uses it to know when to refetch.

### Layer 6 — Frontend (AppShell + ChatPanel + refetch)

```tsx
// components/app-shell.tsx — Wraps every authed page
// Listens to chat-toggle event. On lg+, when chat opens,
// inline-style paddingRight = 400px → page shrinks left, chat docks right.
export function AppShell({ children }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [isLarge, setIsLarge] = useState(false);
  useEffect(/* matchMedia */, []);
  useEffect(/* listen CHAT_EVENT */, []);
  return (
    <div
      className="h-screen flex flex-col"
      style={{
        paddingRight: chatOpen && isLarge ? "400px" : "0px",
        transition: "padding-right 200ms cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      {children}
    </div>
  );
}

// components/chat-panel.tsx — mounted globally, slides in from right
// On AI mutation → calls router.refresh() so server components re-fetch.

// components/chat-widget.tsx — message bubbles + composer
// Use: flex-1 min-h-0 overflow-y-auto on messages container,
// shrink-0 on composer. Otherwise composer disappears on long chats.
```

### Layer 7 — Cron + Backup

```json
// vercel.json
{
  "crons": [
    { "path": "/api/backup", "schedule": "0 3 * * *" }
  ]
}
```

```ts
// /api/backup — duplicates the main tab as Backup_YYYY-MM-DD-HH-mm
// Keeps the latest N, deletes older.
// GET is authorized via Authorization: Bearer ${CRON_SECRET} (Vercel auto-sends).
// POST is admin manual trigger.
```

---

## File structure

```
your-dashboard/
├── app/
│   ├── layout.tsx               wraps in <AppShell> + <ChatPanel> + <ChatFAB>
│   ├── globals.css              app-bg with subtle gradient + noise texture
│   ├── page.tsx                 Overview — top 3 insights + 3 main panels + 2 bottom panels
│   ├── login/page.tsx           4-digit PIN entry (Suspense-wrapped useSearchParams!)
│   ├── name/page.tsx            Name picker with suggestions from existing data
│   ├── board/page.tsx           Kanban drag-and-drop view
│   ├── inventar/page.tsx        Searchable table (page-aware)
│   ├── santiere/page.tsx        Visual donut grid per site
│   ├── actiune/page.tsx         Urgent items grouped
│   ├── istoric/page.tsx         Transfer log with sticky header
│   └── api/
│       ├── auth/route.ts        POST pin · DELETE logout
│       ├── auth/name/route.ts   POST name
│       ├── whoami/route.ts      GET session info
│       ├── data/route.ts        GET inventory + santiere
│       ├── move/route.ts        POST drag-drop endpoint  [admin]
│       ├── chat/route.ts        Claude tool-use loop
│       └── backup/route.ts      GET cron · POST admin
├── components/
│   ├── nav.tsx                  brand + nav + actions (2-zone, left-aligned)
│   ├── footer.tsx               brand + signature
│   ├── app-shell.tsx            chat-aware shrinking wrapper
│   ├── chat-panel.tsx           docked panel + FAB
│   ├── chat-widget.tsx          message bubbles + composer
│   ├── inventory-table.tsx      reusable table with filters
│   ├── board.tsx                kanban + drag-and-drop
│   ├── site-card.tsx            donut chart card with tier sizing
│   ├── dev-signature.tsx        click-to-contact brand mark
│   ├── kpi-card.tsx
│   └── stare-badge.tsx
├── lib/
│   ├── auth.ts                  HMAC sessions, PIN→role, name cookie
│   ├── sheets.ts                Repository (read+write+cache+stats)
│   ├── tools.ts                 AI tools + executor
│   ├── chat-toggle.ts           global CustomEvent for chat panel
│   ├── use-role.ts              client hook { role, name }
│   ├── types.ts                 domain types
│   └── utils.ts                 cn(), formatRON(), extractImageUrl()
├── middleware.ts                gate everything except /login + /api/auth
├── vercel.json                  cron config
├── tailwind.config.ts           custom shadows (shadow-panel, panel-hover, panel-lifted)
├── package.json
└── smoke-test.sh                24-check end-to-end test
```

---

## Setup a new client (1-hour playbook)

```bash
# 1. Clone the template
gh repo create newclient-dashboard --private --template mpcosmin-mcp/coldea-dashboard
cd newclient-dashboard

# 2. Adapt the domain
# Edit lib/types.ts — define your entity shape
# Edit lib/sheets.ts — adjust column names, addItem, updateItem
# Edit lib/tools.ts — rename tools, update FIELD_MAP, system prompt
# Edit app/page.tsx — adjust insights computation
# Edit components/nav.tsx, footer.tsx — change "COLDEA" to client name

# 3. Wire the Google Sheet
# Client creates a sheet, shares with service account email
# Run setup_client_sheet.py (or manually create tabs: Main, Log, Config)

# 4. Local dev
cp .env.example .env.local
# Fill in PINs, sheet ID, creds JSON, secrets, Anthropic key
npm install
npm run dev    # → http://localhost:3000

# 5. Deploy
gh repo create  # if not done
git push -u origin master
vercel link --yes --project newclient-dashboard

# Set env vars via Vercel CLI
echo -n "5678" | vercel env add DASHBOARD_ADMIN_PIN production --yes
echo -n "1234" | vercel env add DASHBOARD_VIEWER_PIN production --yes
echo -n "SHEET_ID" | vercel env add GOOGLE_SHEET_ID production --yes
cat creds.json | vercel env add GOOGLE_CREDENTIALS_JSON production --yes
python -c "import secrets;print(secrets.token_hex(32),end='')" | vercel env add SESSION_SECRET production --yes
echo -n "$ANTHROPIC_KEY" | vercel env add ANTHROPIC_API_KEY production --yes
python -c "import secrets;print(secrets.token_hex(32),end='')" | vercel env add CRON_SECRET production --yes

# Deploy
vercel --prod --yes

# 6. Smoke test
bash smoke-test.sh  # expect 24/24
```

**Time per step:** clone (5min), domain adaptation (20–40min), deploy (5min), smoke test + visual check (10min). **Total: ~1 hour** if you've done it before.

---

## Customization recipes

### Add a new tool the AI can use

1. Add the tool to `TOOLS` array in `lib/tools.ts` (snake_case property keys!)
2. Add the case to `executeTool()` mapping to a repo method
3. If it writes → add the tool name to `WRITE_TOOLS` set
4. Update `SYSTEM_PROMPT` in `/api/chat/route.ts` to mention when to use it

### Add a new role

1. Edit `lib/auth.ts` — add the role to `Role` type and `pinToRole`
2. Add the env var (e.g., `DASHBOARD_MANAGER_PIN`)
3. Update `/api/chat` tool filtering logic
4. Update role-aware UI badges in `components/nav.tsx`

### Swap Google Sheets for Postgres

1. Create `lib/postgres.ts` implementing the same exported functions (`getInventory`, `updateItem`, etc.)
2. Update imports in `lib/tools.ts` and API routes
3. Remove `googleapis` from `package.json`, add `pg` (or `drizzle` + `postgres`)
4. Cache + invalidate stays the same logic

### Add a new page

1. Create `app/<route>/page.tsx` as a server component
2. Use `getInventory()`, `getTransfers()`, etc. from `lib/sheets`
3. Add `<Nav />`, `<Footer />`, wrap content in `<main className="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col">`
4. Add link in `components/nav.tsx` `links` array

---

## Patterns worth reusing across projects

### Pattern: Chat-aware shrinking layout
```tsx
// AppShell uses matchMedia + inline style.
// Don't use Tailwind arbitrary classes with CSS vars — they don't compile.
style={{ paddingRight: chatOpen && isLarge ? "400px" : "0px" }}
```

### Pattern: Repository with cache invalidation
```ts
const cache = new Map();
async function withCache(key, fn) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data;
  const data = await fn();
  cache.set(key, { data, expires: Date.now() + TTL });
  return data;
}
function invalidate() { cache.clear(); }
// Every write method calls invalidate().
```

### Pattern: Mutation-driven refetch
```tsx
// In ChatPanel
function onMutated() { router.refresh(); }  // re-runs server components

// In API
return NextResponse.json({ text, mutated: didWrite });
```

### Pattern: Tiered visual sizing
```ts
function tier(count) {
  if (count >= 150) return "huge";
  if (count >= 50) return "big";
  if (count >= 20) return "medium";
  return "small";
}
// Map to lg:col-span-N classes for a CSS grid where bigger items dominate.
```

### Pattern: Top 3 deterministic insights
- Compute server-side, no AI cost
- Each insight links to a related page (click → drill down)
- Color-coded by tone: alert (red), brand (orange), info (blue)

### Pattern: SVG donut charts
- One `<circle>` per segment with `strokeDasharray` + `strokeDashoffset`
- `transform="rotate(-90 cx cy)"` to start at 12 o'clock
- Total in center via `<text>` (font-size scales with donut size)
- ~2KB total, no chart library

### Pattern: Drag-and-drop with optimistic UI
- Native HTML5 drag events (no library)
- Update local state immediately on drop → API call → on error, rollback to previous state
- Toast notifications for success/error/loading

---

## Gotchas (so you don't hit them again)

| Gotcha | Symptom | Fix |
|---|---|---|
| Edge runtime + node:crypto | Middleware 500 `MIDDLEWARE_INVOCATION_FAILED` | Use `crypto.subtle.sign` (Web Crypto API) in `lib/auth.ts` and `middleware.ts` |
| Tailwind arbitrary class with CSS var | Class generated in HTML but no CSS rule | `lg:pr-[var(--x)]` ≠ valid. Use inline style with JS state instead. |
| useSearchParams without Suspense | Build fails on Next 15: "should be wrapped in suspense" | Wrap the component using it in `<Suspense fallback={...}>` |
| Tool schema with diacritics/spaces | Anthropic 400: "property keys should match pattern" | snake_case keys (`pret_ron`), remap in `executeTool` |
| flex-1 overflow-y-auto without min-h-0 | Composer gets pushed below visible area on long lists | Add `min-h-0` to the flex-1 container AND `shrink-0` to siblings |
| max-w-2xl + mx-auto on wide screens | Content shifts horizontally when chat opens/closes | Remove `mx-auto`, content always left-aligned |
| Vulnerable Next.js version | Vercel rejects deploy: "Vulnerable version of Next.js detected" | Bump to latest 15.x in `package.json` |
| Cookies not saved in fetch | Auth not persisting after POST `/api/auth` | Add `credentials: 'include'` to fetch options |

---

## Costs (per client)

| Item | Monthly |
|---|---|
| Vercel Hobby | $0 (covers up to 100GB bandwidth) |
| Anthropic Haiku 4.5 | $1–3 (50–100 chat turns/day) |
| Google Sheets API | $0 (free under 300 reads/min/user) |
| **Total** | **$1–3/month** |

Bill the client **200–400 RON/month** for managed service (10× markup). Setup fee 2000–3000 RON one-time.

---

## What's NOT in the template (deliberate)

- ❌ A general design system (Tailwind + custom shadow tokens is enough)
- ❌ A charting library (pure SVG handles dashboards better)
- ❌ Multi-tenancy (one deployment per client = cleaner)
- ❌ Email notifications (use Telegram bot instead — way cheaper, instant)
- ❌ Real-time sync via websockets (60s cache + router.refresh() is enough)
- ❌ User signup flow (PINs are admin-issued, not self-serve)

---

## What's next (backlog for v2)

- **AI tour mode** — Claude walks through the dashboard, explains patterns ("notice Cristian has 7 problems concentrated in Stoian's team")
- **Real-time updates** — switch to Supabase realtime for multi-user collaborative apps
- **Photo upload via web** — currently photos come from Telegram bot only
- **Export to PDF** — monthly report generator
- **Multi-language** — toggle RO/EN/DE for clients abroad

---

## TL;DR

Clone the repo, edit `lib/types.ts` + `lib/sheets.ts` + `lib/tools.ts` for your domain, set env vars on Vercel, deploy. **You have a production AI dashboard in 1 hour.**

The architecture survives any domain swap because everything goes through the Repository pattern.

The aesthetics survive any branding swap because Tailwind tokens are centralized.

The deploy survives any new client because Vercel CLI handles env vars per-project.

*Built April–May 2026 · pattern adapted from [somn](https://somn-xi.vercel.app) (Sleep Tracker) · executed in [coldea-dashboard](https://coldea-dashboard.vercel.app) (Inventory)*
