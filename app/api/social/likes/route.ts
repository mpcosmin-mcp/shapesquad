import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

/**
 * Generic likes — Redis hash `shape:likes`.
 *
 *   field = targetKey (free-form: `user:Petrica`, `metric:Petrica:bodyFat`, ...)
 *   value = JSON-stringified `string[]` of users who liked it.
 *
 * GET → full map { likes: Record<string, string[]> }.
 * POST { targetKey, user } → toggles the like, returns { targetKey, likes }.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HASH_KEY = 'shape:likes';
type LikesMap = Record<string, string[]>;

function decodeLikes(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === 'string') {
    try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; }
    catch { return []; }
  }
  return [];
}

function kvUnavailable(err: unknown): NextResponse {
  console.error('[/api/social/likes] KV unavailable', err);
  return NextResponse.json(
    { error: 'kv-unavailable', message: 'Vercel KV not configured. See SOCIAL_SYNC.md.', likes: {} },
    { status: 503 },
  );
}

export async function GET() {
  try {
    const all = await kv.hgetall<Record<string, unknown>>(HASH_KEY);
    const out: LikesMap = {};
    if (all) for (const [k, v] of Object.entries(all)) out[k] = decodeLikes(v);
    return NextResponse.json({ likes: out });
  } catch (err) {
    return kvUnavailable(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { targetKey?: string; user?: string };
    const { targetKey, user } = body;
    if (!targetKey || !user) {
      return NextResponse.json({ error: 'missing targetKey or user' }, { status: 400 });
    }
    const current = decodeLikes(await kv.hget(HASH_KEY, targetKey));
    const next = current.includes(user)
      ? current.filter((u) => u !== user)
      : [...current, user];
    if (next.length === 0) await kv.hdel(HASH_KEY, targetKey);
    else await kv.hset(HASH_KEY, { [targetKey]: JSON.stringify(next) });
    return NextResponse.json({ targetKey, likes: next });
  } catch (err) {
    return kvUnavailable(err);
  }
}
