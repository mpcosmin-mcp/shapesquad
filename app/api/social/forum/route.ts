import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

/**
 * Forum storage in Vercel KV.
 *
 * Redis hash `shape:forum`
 *   field = threadId (`thread_<ts>_<rand>`)
 *   value = JSON-stringified Thread = {
 *     id, by, ts, title, body, likes: string[], comments: Comment[]
 *   }
 *
 *   Comment = { from, ts, text, likes: string[], replies: Reply[] }
 *   Reply   = { from, ts, text, likes: string[] }
 *
 * POST accepts `action` to discriminate:
 *   - 'createThread' { by, title, body }
 *   - 'comment'      { threadId, comment: { from, ts?, text } }
 *   - 'reply'        { threadId, commentTs, reply: { from, ts?, text } }
 *   - 'likeThread'   { threadId, user }
 *   - 'likeComment'  { threadId, commentTs, user, replyTs? }
 *   - 'deleteThread' { threadId, by }
 *   - 'deleteComment'{ threadId, ts, by, parentTs? }
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HASH_KEY = 'shape:forum';

interface Reply { from: string; ts: number; text: string; likes: string[]; }
interface Comment { from: string; ts: number; text: string; likes: string[]; replies: Reply[]; }
interface Thread {
  id: string;
  by: string;
  ts: number;
  title: string;
  body: string;
  likes: string[];
  comments: Comment[];
}
type ThreadsMap = Record<string, Thread>;

function hydrateReply(raw: unknown): Reply {
  const r = (raw ?? {}) as Partial<Reply>;
  return {
    from: r.from ?? '',
    ts: typeof r.ts === 'number' ? r.ts : 0,
    text: r.text ?? '',
    likes: Array.isArray(r.likes) ? r.likes : [],
  };
}
function hydrateComment(raw: unknown): Comment {
  const r = (raw ?? {}) as Partial<Comment>;
  return {
    from: r.from ?? '',
    ts: typeof r.ts === 'number' ? r.ts : 0,
    text: r.text ?? '',
    likes: Array.isArray(r.likes) ? r.likes : [],
    replies: Array.isArray(r.replies) ? r.replies.map(hydrateReply) : [],
  };
}
function hydrateThread(raw: unknown): Thread | null {
  const r = (raw ?? {}) as Partial<Thread>;
  if (!r.id || !r.by || !r.title) return null;
  return {
    id: r.id,
    by: r.by,
    ts: typeof r.ts === 'number' ? r.ts : 0,
    title: r.title,
    body: r.body ?? '',
    likes: Array.isArray(r.likes) ? r.likes : [],
    comments: Array.isArray(r.comments) ? r.comments.map(hydrateComment) : [],
  };
}
function decodeThread(raw: unknown): Thread | null {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return hydrateThread(raw);
  if (typeof raw === 'string') {
    try { return hydrateThread(JSON.parse(raw)); }
    catch { return null; }
  }
  return null;
}

function kvUnavailable(err: unknown): NextResponse {
  console.error('[/api/social/forum] KV unavailable', err);
  return NextResponse.json(
    { error: 'kv-unavailable', message: 'Vercel KV not configured. See SOCIAL_SYNC.md.', threads: {} },
    { status: 503 },
  );
}
function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: 'bad-request', message }, { status: 400 });
}

async function persist(threadId: string, thread: Thread | null): Promise<Thread | null> {
  if (!thread) {
    await kv.hdel(HASH_KEY, threadId);
    return null;
  }
  await kv.hset(HASH_KEY, { [threadId]: JSON.stringify(thread) });
  return thread;
}

/* ─── GET — full threads map ─────────────────────────────── */
export async function GET() {
  try {
    const all = await kv.hgetall<Record<string, unknown>>(HASH_KEY);
    const out: ThreadsMap = {};
    if (all) {
      for (const [k, v] of Object.entries(all)) {
        const t = decodeThread(v);
        if (t) out[k] = t;
      }
    }
    return NextResponse.json({ threads: out });
  } catch (err) {
    return kvUnavailable(err);
  }
}

/* ─── POST — action discriminator ─────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      action?:
        | 'createThread' | 'comment' | 'reply'
        | 'likeThread' | 'likeComment' | 'deleteThread' | 'deleteComment';
      threadId?: string;
      by?: string;
      title?: string;
      bodyText?: string;
      user?: string;
      comment?: Partial<Comment>;
      commentTs?: number;
      reply?: Partial<Reply>;
      replyTs?: number;
      ts?: number;
      parentTs?: number;
    };
    const action = body.action;
    if (!action) return badRequest('missing action');

    /* createThread doesn't need an existing thread */
    if (action === 'createThread') {
      if (!body.by || !body.title) return badRequest('missing by or title');
      const ts = Date.now();
      const id = `thread_${ts}_${Math.random().toString(36).slice(2, 8)}`;
      const thread: Thread = {
        id,
        by: body.by.slice(0, 100),
        ts,
        title: body.title.slice(0, 140).trim(),
        body: (body.bodyText ?? '').slice(0, 2000).trim(),
        likes: [],
        comments: [],
      };
      if (!thread.title) return badRequest('empty title');
      await persist(id, thread);
      return NextResponse.json({ thread });
    }

    /* All other actions require an existing thread */
    const threadId = body.threadId;
    if (!threadId) return badRequest('missing threadId');
    const current = decodeThread(await kv.hget(HASH_KEY, threadId));
    if (!current) return badRequest('thread not found');

    switch (action) {
      case 'likeThread': {
        if (!body.user) return badRequest('missing user');
        const u = body.user;
        const next: Thread = {
          ...current,
          likes: current.likes.includes(u)
            ? current.likes.filter((x) => x !== u)
            : [...current.likes, u],
        };
        return NextResponse.json({ thread: await persist(threadId, next) });
      }

      case 'comment': {
        const c = body.comment;
        if (!c?.from || !c?.text) return badRequest('missing comment.from or .text');
        const newComment: Comment = {
          from: c.from.slice(0, 100),
          ts: c.ts ?? Date.now(),
          text: c.text.slice(0, 500).trim(),
          likes: [],
          replies: [],
        };
        if (!newComment.text) return badRequest('empty comment text');
        const next: Thread = { ...current, comments: [...current.comments, newComment] };
        return NextResponse.json({ thread: await persist(threadId, next) });
      }

      case 'reply': {
        if (body.commentTs == null) return badRequest('missing commentTs');
        const r = body.reply;
        if (!r?.from || !r?.text) return badRequest('missing reply.from or .text');
        const newReply: Reply = {
          from: r.from.slice(0, 100),
          ts: r.ts ?? Date.now(),
          text: r.text.slice(0, 500).trim(),
          likes: [],
        };
        if (!newReply.text) return badRequest('empty reply text');
        const next: Thread = {
          ...current,
          comments: current.comments.map((c) =>
            c.ts === body.commentTs ? { ...c, replies: [...c.replies, newReply] } : c,
          ),
        };
        return NextResponse.json({ thread: await persist(threadId, next) });
      }

      case 'likeComment': {
        if (body.commentTs == null) return badRequest('missing commentTs');
        if (!body.user) return badRequest('missing user');
        const u = body.user;
        const isReply = body.replyTs != null;
        const next: Thread = {
          ...current,
          comments: current.comments.map((c) => {
            if (c.ts !== body.commentTs) return c;
            if (isReply) {
              return {
                ...c,
                replies: c.replies.map((r) =>
                  r.ts !== body.replyTs ? r : {
                    ...r,
                    likes: r.likes.includes(u) ? r.likes.filter((x) => x !== u) : [...r.likes, u],
                  },
                ),
              };
            }
            return {
              ...c,
              likes: c.likes.includes(u) ? c.likes.filter((x) => x !== u) : [...c.likes, u],
            };
          }),
        };
        return NextResponse.json({ thread: await persist(threadId, next) });
      }

      case 'deleteThread': {
        if (!body.by) return badRequest('missing by');
        if (current.by !== body.by) return badRequest('only author can delete');
        await persist(threadId, null);
        return NextResponse.json({ threadId, deleted: true });
      }

      case 'deleteComment': {
        if (body.ts == null || !body.by) return badRequest('missing ts or by');
        let nextComments: Comment[];
        if (body.parentTs != null) {
          nextComments = current.comments.map((c) =>
            c.ts !== body.parentTs ? c : {
              ...c,
              replies: c.replies.filter((r) => !(r.ts === body.ts && r.from === body.by)),
            },
          );
        } else {
          nextComments = current.comments.filter((c) => !(c.ts === body.ts && c.from === body.by));
        }
        const next: Thread = { ...current, comments: nextComments };
        return NextResponse.json({ thread: await persist(threadId, next) });
      }

      default:
        return badRequest(`unknown action: ${action}`);
    }
  } catch (err) {
    return kvUnavailable(err);
  }
}
