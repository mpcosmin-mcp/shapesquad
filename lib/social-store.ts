/* ─────────────────────────────────────────────────────────
   Upstash Redis client + typed read/write helpers for the social layer.

   Two Redis hashes:
     social:likes    — field = entryKey  →  JSON ReactionMap
     social:comments — field = entryKey  →  JSON Comment[]

   When KV env vars are absent (local dev without .env.local) redis is
   null and kvReady() returns false. All callers must guard on this and
   return 503 so the client falls back to localStorage-only state.
   ───────────────────────────────────────────────────────── */
import { Redis } from '@upstash/redis';
import type { ReactionMap } from '@/lib/reactions';
import { normalizeReactions } from '@/lib/reactions';

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;
export const kvReady = (): boolean => redis !== null;

const LIKES_KEY = 'social:likes';
const COMMENTS_KEY = 'social:comments';

/* ─── Comment shape ─────────────────────────────────────── */

export interface Comment {
  from: string;
  ts: number;
  text: string;
  /** Users who hearted this comment. */
  likes: string[];
}

export type CommentsMap = Record<string, Comment[]>;

/** Pad legacy / partial comment records so the UI never crashes. */
export function hydrateComment(raw: unknown): Comment {
  const r = (raw ?? {}) as Partial<Comment>;
  return {
    from: r.from ?? '',
    ts: typeof r.ts === 'number' ? r.ts : 0,
    text: r.text ?? '',
    likes: Array.isArray(r.likes) ? r.likes : [],
  };
}

/* ─── Raw decode helpers (handle both string and object) ─── */

/** @upstash/redis auto-parses JSON on hget — but a value stored as a
 *  raw JSON string also needs parsing. This guard covers both. */
function decodeMap(raw: unknown): ReactionMap {
  if (typeof raw === 'string') {
    try { return normalizeReactions(JSON.parse(raw)); }
    catch { return {}; }
  }
  return normalizeReactions(raw);
}

function decodeComments(raw: unknown): Comment[] {
  if (Array.isArray(raw)) return raw.map(hydrateComment);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(hydrateComment) : [];
    } catch { return []; }
  }
  return [];
}

/* ─── Likes helpers ──────────────────────────────────────── */

export async function getAllLikes(): Promise<Record<string, ReactionMap>> {
  if (!redis) return {};
  const all = await redis.hgetall<Record<string, unknown>>(LIKES_KEY);
  const out: Record<string, ReactionMap> = {};
  if (all) {
    for (const [k, v] of Object.entries(all)) {
      const map = decodeMap(v);
      if (Object.keys(map).length) out[k] = map;
    }
  }
  return out;
}

export async function getLikes(entryKey: string): Promise<ReactionMap> {
  if (!redis) return {};
  return decodeMap(await redis.hget(LIKES_KEY, entryKey));
}

export async function setLikes(entryKey: string, map: ReactionMap): Promise<void> {
  if (!redis) return;
  if (Object.keys(map).length === 0) {
    await redis.hdel(LIKES_KEY, entryKey);
  } else {
    await redis.hset(LIKES_KEY, { [entryKey]: JSON.stringify(map) });
  }
}

/* ─── Comments helpers ───────────────────────────────────── */

export async function getAllComments(): Promise<CommentsMap> {
  if (!redis) return {};
  const all = await redis.hgetall<Record<string, unknown>>(COMMENTS_KEY);
  const out: CommentsMap = {};
  if (all) {
    for (const [k, v] of Object.entries(all)) {
      const arr = decodeComments(v);
      if (arr.length) out[k] = arr;
    }
  }
  return out;
}

export async function getComments(entryKey: string): Promise<Comment[]> {
  if (!redis) return [];
  return decodeComments(await redis.hget(COMMENTS_KEY, entryKey));
}

export async function setComments(entryKey: string, arr: Comment[]): Promise<void> {
  if (!redis) return;
  if (arr.length === 0) {
    await redis.hdel(COMMENTS_KEY, entryKey);
  } else {
    await redis.hset(COMMENTS_KEY, { [entryKey]: JSON.stringify(arr) });
  }
}
