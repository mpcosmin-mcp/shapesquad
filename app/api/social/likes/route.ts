import { NextRequest, NextResponse } from 'next/server';
import {
  kvReady, getAllLikes, getLikes, setLikes,
} from '@/lib/social-store';
import {
  DEFAULT_REACTION, isReactionEmoji, toggleReaction,
} from '@/lib/reactions';

/**
 * Entry reactions storage in Upstash Redis.
 *
 * Redis hash `social:likes`
 *   field = entryKey (`${date}_${name}`)
 *   value = JSON-stringified ReactionMap (emoji → string[])
 *
 * GET  — return full map (all entries)
 * POST { entryKey, user, emoji? } — toggle one emoji for user, return new map
 *
 * Returns 503 when redis is not configured (no KV env vars).
 * The client SocialProvider handles 503 gracefully (localStorage-only mode).
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function unavailable(): NextResponse {
  return NextResponse.json(
    { error: 'kv-unavailable', reactions: {} },
    { status: 503 },
  );
}

export async function GET() {
  if (!kvReady()) return unavailable();
  try {
    const reactions = await getAllLikes();
    return NextResponse.json({ reactions });
  } catch (err) {
    console.error('[/api/social/likes] GET error', err);
    return unavailable();
  }
}

export async function POST(req: NextRequest) {
  if (!kvReady()) return unavailable();
  try {
    const body = await req.json() as { entryKey?: string; user?: string; emoji?: string };
    const { entryKey, user } = body;
    const emoji = body.emoji ?? DEFAULT_REACTION;

    if (!entryKey || !user) {
      return NextResponse.json({ error: 'missing entryKey or user' }, { status: 400 });
    }
    if (!isReactionEmoji(emoji)) {
      return NextResponse.json({ error: 'invalid emoji' }, { status: 400 });
    }

    const current = await getLikes(entryKey);
    const next = toggleReaction(current, emoji, user);
    await setLikes(entryKey, next);

    return NextResponse.json({ entryKey, reactions: next });
  } catch (err) {
    console.error('[/api/social/likes] POST error', err);
    return unavailable();
  }
}
