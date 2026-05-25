'use client';
import {
  createContext, useCallback, useContext, useEffect, useState,
  type ReactNode,
} from 'react';

/* ═══════════════════════════════════════════════════════════════════════
 * Likes — generic target-key based like system.
 *
 * Used for liking users (`user:<name>`), personal metrics
 * (`metric:<name>:<key>`) and anything else.
 *
 * Backend: Vercel KV hash `shape:likes`. Falls back to localStorage offline.
 * ═══════════════════════════════════════════════════════════════════════ */

const CACHE_KEY = 'shapesquad_likes_v3';
const REFETCH_INTERVAL_MS = 30_000;

export type LikesMap = Record<string, string[]>;

interface LikesContextValue {
  likes: LikesMap;
  toggleLike: (targetKey: string, user: string) => void;
  likesFor: (targetKey: string) => string[];
  hasLiked: (targetKey: string, user: string) => boolean;
  syncError: string | null;
}

const LikesContext = createContext<LikesContextValue | null>(null);

function readCache(): LikesMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as LikesMap) : {};
  } catch { return {}; }
}
function writeCache(m: LikesMap) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(m)); } catch { /* non-fatal */ }
}

interface ApiError extends Error { status: number; isKvUnavailable: boolean }
function buildError(status: number, msg: string, isKvUnavailable = false): ApiError {
  const e = new Error(msg) as ApiError;
  e.status = status;
  e.isKvUnavailable = isKvUnavailable;
  return e;
}

async function fetchLikes(): Promise<LikesMap> {
  const r = await fetch('/api/social/likes', { cache: 'no-store' });
  const j = (await r.json()) as { likes?: LikesMap; error?: string };
  if (!r.ok) throw buildError(r.status, j.error ?? 'fetch failed', j.error === 'kv-unavailable');
  return j.likes ?? {};
}

async function toggleLikeRemote(targetKey: string, user: string): Promise<string[]> {
  const r = await fetch('/api/social/likes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetKey, user }),
  });
  const j = (await r.json()) as { likes?: string[]; error?: string };
  if (!r.ok) throw buildError(r.status, j.error ?? 'toggle failed', j.error === 'kv-unavailable');
  return j.likes ?? [];
}

export function LikesProvider({ children }: { children: ReactNode }) {
  const [likes, setLikes] = useState<LikesMap>({});
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => { setLikes(readCache()); }, []);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const m = await fetchLikes();
        if (cancelled) return;
        setLikes(m);
        writeCache(m);
        setSyncError(null);
      } catch (err) {
        const e = err as ApiError;
        setSyncError(e?.isKvUnavailable ? 'kv-unavailable' : (e?.message ?? 'sync error'));
      }
    };
    refresh();
    const onFocus = () => { refresh(); };
    window.addEventListener('focus', onFocus);
    const id = window.setInterval(refresh, REFETCH_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      window.clearInterval(id);
    };
  }, []);

  const toggleLike = useCallback((targetKey: string, user: string) => {
    let snapshot: string[] = [];
    setLikes((prev) => {
      snapshot = prev[targetKey] ?? [];
      const optimistic: LikesMap = snapshot.includes(user)
        ? { ...prev, [targetKey]: snapshot.filter((u) => u !== user) }
        : { ...prev, [targetKey]: [...snapshot, user] };
      if (optimistic[targetKey].length === 0) delete optimistic[targetKey];
      writeCache(optimistic);
      return optimistic;
    });
    toggleLikeRemote(targetKey, user)
      .then((serverArr) => {
        setLikes((curr) => {
          const next: LikesMap = { ...curr };
          if (serverArr.length === 0) delete next[targetKey];
          else next[targetKey] = serverArr;
          writeCache(next);
          return next;
        });
        setSyncError(null);
      })
      .catch((err: ApiError) => {
        if (err?.status && err.status >= 400 && err.status < 500) {
          setLikes((curr) => {
            const reverted: LikesMap = { ...curr };
            if (snapshot.length === 0) delete reverted[targetKey];
            else reverted[targetKey] = snapshot;
            writeCache(reverted);
            return reverted;
          });
        } else {
          setSyncError(err?.isKvUnavailable ? 'kv-unavailable' : (err?.message ?? 'sync error'));
        }
      });
  }, []);

  const likesFor = useCallback((k: string) => likes[k] ?? [], [likes]);
  const hasLiked = useCallback((k: string, u: string) => (likes[k] ?? []).includes(u), [likes]);

  return (
    <LikesContext.Provider value={{ likes, toggleLike, likesFor, hasLiked, syncError }}>
      {children}
    </LikesContext.Provider>
  );
}

export function useLikes() {
  const ctx = useContext(LikesContext);
  if (!ctx) {
    return {
      likes: {} as LikesMap,
      toggleLike: () => {},
      likesFor: (_k: string) => [] as string[],
      hasLiked: (_k: string, _u: string) => false,
      syncError: null as string | null,
    };
  }
  return ctx;
}

/* Convenience helpers for building target keys */
export const likeKey = {
  user: (name: string) => `user:${name}`,
  metric: (name: string, metric: string) => `metric:${name}:${metric}`,
  thread: (id: string) => `thread:${id}`,
};
