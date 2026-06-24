import { NextRequest, NextResponse } from 'next/server';
import {
  kvReady, getAllComments, getComments, setComments,
  type Comment,
} from '@/lib/social-store';

/**
 * Flat comments storage in Upstash Redis.
 *
 * Redis hash `social:comments`
 *   field = entryKey (`${date}_${name}`)
 *   value = JSON-stringified Comment[] where Comment = { from, ts, text, likes: string[] }
 *
 * POST actions:
 *   add    — append a comment { from, ts, text }
 *   like   — toggle heart on comment by ts, by user
 *   delete — remove comment by ts, only if from === by
 *
 * Returns 503 when redis is not configured.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function unavailable(): NextResponse {
  return NextResponse.json(
    { error: 'kv-unavailable', comments: {} },
    { status: 503 },
  );
}

function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: 'bad-request', message }, { status: 400 });
}

export async function GET() {
  if (!kvReady()) return unavailable();
  try {
    const comments = await getAllComments();
    return NextResponse.json({ comments });
  } catch (err) {
    console.error('[/api/social/comments] GET error', err);
    return unavailable();
  }
}

export async function POST(req: NextRequest) {
  if (!kvReady()) return unavailable();
  try {
    const body = await req.json() as {
      action?: 'add' | 'like' | 'delete';
      entryKey?: string;
      // add
      from?: string;
      ts?: number;
      text?: string;
      // like / delete
      user?: string;
      by?: string;
    };

    const action = body.action ?? 'add';
    const { entryKey } = body;
    if (!entryKey) return badRequest('missing entryKey');

    const current = await getComments(entryKey);

    switch (action) {
      case 'add': {
        if (!body.from || !body.text) return badRequest('missing from or text');
        const newComment: Comment = {
          from: body.from.slice(0, 100),
          ts: body.ts ?? Date.now(),
          text: body.text.slice(0, 500).trim(),
          likes: [],
        };
        if (!newComment.text) return badRequest('empty text');
        const next = [...current, newComment];
        await setComments(entryKey, next);
        return NextResponse.json({ entryKey, comments: next });
      }

      case 'like': {
        if (body.ts == null || !body.user) return badRequest('missing ts or user');
        const user = body.user;
        const next = current.map(c => c.ts !== body.ts ? c : {
          ...c,
          likes: c.likes.includes(user)
            ? c.likes.filter(u => u !== user)
            : [...c.likes, user],
        });
        await setComments(entryKey, next);
        return NextResponse.json({ entryKey, comments: next });
      }

      case 'delete': {
        if (body.ts == null || !body.by) return badRequest('missing ts or by');
        const next = current.filter(c => !(c.ts === body.ts && c.from === body.by));
        await setComments(entryKey, next);
        return NextResponse.json({ entryKey, comments: next });
      }

      default:
        return badRequest(`unknown action: ${action}`);
    }
  } catch (err) {
    console.error('[/api/social/comments] POST error', err);
    return unavailable();
  }
}
