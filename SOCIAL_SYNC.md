# Social sync — Vercel KV setup

> ShapeSquad feed (likes + comments + replies) is backed by **Vercel KV** (Upstash Redis).
> Without KV, the UI still works offline (localStorage), but reactions don't sync between users or devices.

## What's stored

Two Redis hashes:

| Key | Field | Value |
|---|---|---|
| `shape:likes` | `${date}_${name}` (entry key) | JSON `string[]` — who liked that measurement |
| `shape:comments` | `${date}_${name}` | JSON `Comment[]` with `{ from, ts, text, likes, replies }` |

`Comment.replies` are 1-level deep (Instagram-style — you reply to a comment, not to a reply).

## Setup (5 minutes)

1. **Connect a KV store from the Vercel dashboard**
   - Open the project on Vercel → **Storage** tab → **Create database** → **KV**.
   - Pick the closest region. Click **Create**.
   - Vercel auto-adds these env vars to your project: `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`.

2. **Local development**
   - Click **.env.local** tab on the KV store page → copy the snippet.
   - Paste into `.env.local` at the project root.
   - Restart `npm run dev`.

3. **Verify**
   - Open the dashboard, click the heart on any entry in the feed.
   - In the Vercel dashboard, go to the KV store → **Data Browser** → look for `shape:likes`.
   - You should see your entry key with your name in the array.

## Cost

Hobby tier: 30,000 commands/month free. A team of ~10 with normal feed usage should sit comfortably under 10K/month. Each like = 1 read + 1 write. Each comment add = 1 read + 1 write.

## Graceful fallback when KV isn't configured

The API routes (`app/api/social/likes/route.ts`, `app/api/social/comments/route.ts`) detect missing env vars and return `{ error: 'kv-unavailable', ... }` with HTTP 503.

The client (`lib/social.tsx`) catches this and surfaces an `offline` badge in the feed header. Likes and comments still work on the local device via `localStorage`, but won't sync to others until KV is configured.

## Migration / clearing data

To wipe all reactions (e.g. before a season reset):

```bash
# Using the Vercel CLI
vercel env pull .env.local
redis-cli -u "$KV_URL" del shape:likes shape:comments
```

Or in the Vercel KV Data Browser, delete the two keys directly.
