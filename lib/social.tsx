'use client';
import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type ReactNode,
} from 'react';
import {
  fetchEntryReactions, toggleEntryReactionRemote, type EntryReactions,
  fetchComments, addCommentRemote, deleteCommentRemote, toggleCommentLikeRemote,
  type ApiError,
} from '@/lib/social-api';
import {
  type ReactionMap, DEFAULT_REACTION,
  toggleReaction as toggleReactionMap, reactorsOf,
} from '@/lib/reactions';
import type { Comment, CommentsMap } from '@/lib/social-store';
import { hydrateComment } from '@/lib/social-store';

/* ─── Social layer — reactions + flat comments ─────────────
 *
 * Source of truth: Upstash Redis (hashes social:likes / social:comments).
 * Graceful degradation: when KV env vars are absent (local dev), the API
 * returns 503 and this provider stays in localStorage-only optimistic mode.
 *
 * entryKey = `${date}_${name}` — uniquely identifies a body-comp entry.
 *
 * Lifecycle:
 *   1. Mount → hydrate from localStorage (instant paint with last-known).
 *   2. Background refetch from KV → update state + cache on success.
 *   3. Refetch on window focus + every 30s while active.
 *   4. Mutation → optimistic update + localStorage write + POST to KV.
 *      On server success → replace with canonical value.
 *      On 5xx/network/kv-unavailable → keep optimistic (offline-first).
 *      On 4xx → rollback (bad request, not a server fault).
 * ───────────────────────────────────────────────────────── */

const REACTIONS_KEY = 'shapesquad_reactions_v1';
const COMMENTS_KEY = 'shapesquad_comments_v1';
const REFETCH_INTERVAL_MS = 30_000;

// Re-export types so consumers don't need to import from social-store directly
export type { Comment, CommentsMap };

interface SocialContextValue {
  reactions: EntryReactions;
  comments: CommentsMap;
  toggleEntryReaction: (entryKey: string, emoji: string, user: string) => void;
  toggleLike: (entryKey: string, user: string) => void;
  addComment: (entryKey: string, comment: Comment) => void;
  deleteComment: (entryKey: string, ts: number, by: string) => void;
  toggleCommentLike: (entryKey: string, ts: number, user: string) => void;
  initialLoading: boolean;
  syncError: string | null;
}

const SocialContext = createContext<SocialContextValue | null>(null);

function readCache<T>(key: string): T {
  if (typeof window === 'undefined') return {} as T;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : ({} as T);
  } catch { return {} as T; }
}

function writeCache(key: string, val: unknown) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* non-fatal */ }
}

export function entryKeyOf(date: string, name: string): string {
  return `${date}_${name}`;
}

/* ─── Provider ───────────────────────────────────────────── */
export function SocialProvider({ children }: { children: ReactNode }) {
  const [reactions, setReactions] = useState<EntryReactions>({});
  const [comments, setComments] = useState<CommentsMap>({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Entries with an in-flight optimistic reaction — background refetch must
  // NOT clobber these (prevents the "tap vanishes mid-flight" race condition).
  const pendingReactions = useRef<Set<string>>(new Set());

  // Hydrate from localStorage on mount (synchronous = no flicker).
  useEffect(() => {
    setReactions(readCache<EntryReactions>(REACTIONS_KEY));
    const rawComments = readCache<Record<string, unknown[]>>(COMMENTS_KEY);
    const hydrated: CommentsMap = {};
    for (const [k, arr] of Object.entries(rawComments)) {
      if (Array.isArray(arr)) hydrated[k] = arr.map(hydrateComment);
    }
    setComments(hydrated);
  }, []);

  // Background refetch cycle.
  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const [r, c] = await Promise.all([fetchEntryReactions(), fetchComments()]);
        if (cancelled) return;
        setReactions(prev => {
          const merged: EntryReactions = { ...r };
          // Never overwrite an entry with an in-flight optimistic reaction.
          for (const k of pendingReactions.current) {
            if (prev[k]) merged[k] = prev[k];
            else delete merged[k];
          }
          writeCache(REACTIONS_KEY, merged);
          return merged;
        });
        setComments(c);
        writeCache(COMMENTS_KEY, c);
        setSyncError(null);
      } catch (err) {
        const e = err as ApiError;
        setSyncError(e?.isKvUnavailable ? 'kv-unavailable' : (e?.message ?? 'sync error'));
      } finally {
        if (!cancelled) setInitialLoading(false);
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

  /* ── Reaction mutation ───────────────────────────────────── */

  const toggleEntryReaction = useCallback((entryKey: string, emoji: string, user: string) => {
    pendingReactions.current.add(entryKey);
    let snapshot: ReactionMap = {};
    setReactions(prev => {
      snapshot = prev[entryKey] ?? {};
      const map = toggleReactionMap(snapshot, emoji, user);
      const optimistic: EntryReactions = { ...prev };
      if (Object.keys(map).length === 0) delete optimistic[entryKey];
      else optimistic[entryKey] = map;
      writeCache(REACTIONS_KEY, optimistic);
      return optimistic;
    });

    toggleEntryReactionRemote(entryKey, emoji, user)
      .then(serverMap => {
        setReactions(curr => {
          const next: EntryReactions = { ...curr };
          if (Object.keys(serverMap).length === 0) delete next[entryKey];
          else next[entryKey] = serverMap;
          writeCache(REACTIONS_KEY, next);
          return next;
        });
        setSyncError(null);
      })
      .catch((err: ApiError) => {
        // Rollback only on genuine 4xx (bad request). On 5xx/network keep optimistic.
        if (err?.status && err.status >= 400 && err.status < 500) {
          setReactions(curr => {
            const reverted: EntryReactions = { ...curr };
            if (Object.keys(snapshot).length === 0) delete reverted[entryKey];
            else reverted[entryKey] = snapshot;
            writeCache(REACTIONS_KEY, reverted);
            return reverted;
          });
        } else {
          setSyncError(err?.isKvUnavailable ? 'kv-unavailable' : (err?.message ?? 'sync error'));
        }
      })
      .finally(() => { pendingReactions.current.delete(entryKey); });
  }, []);

  const toggleLike = useCallback(
    (entryKey: string, user: string) => toggleEntryReaction(entryKey, DEFAULT_REACTION, user),
    [toggleEntryReaction],
  );

  /* ── Comment mutations ───────────────────────────────────── */

  const addComment = useCallback((entryKey: string, comment: Comment) => {
    setComments(prev => {
      const optimistic: CommentsMap = {
        ...prev,
        [entryKey]: [...(prev[entryKey] ?? []), comment],
      };
      writeCache(COMMENTS_KEY, optimistic);
      return optimistic;
    });

    addCommentRemote(entryKey, comment)
      .then(serverArr => {
        setComments(curr => {
          const next: CommentsMap = { ...curr, [entryKey]: serverArr };
          writeCache(COMMENTS_KEY, next);
          return next;
        });
        setSyncError(null);
      })
      .catch((err: ApiError) => {
        if (err?.status && err.status >= 400 && err.status < 500) {
          // Rollback: drop the optimistic comment by its ts.
          setComments(curr => {
            const filtered = (curr[entryKey] ?? []).filter(c => c.ts !== comment.ts);
            const reverted: CommentsMap = { ...curr };
            if (filtered.length === 0) delete reverted[entryKey];
            else reverted[entryKey] = filtered;
            writeCache(COMMENTS_KEY, reverted);
            return reverted;
          });
        } else {
          setSyncError(err?.isKvUnavailable ? 'kv-unavailable' : (err?.message ?? 'sync error'));
        }
      });
  }, []);

  const deleteComment = useCallback((entryKey: string, ts: number, by: string) => {
    let snapshot: Comment[] = [];
    setComments(prev => {
      snapshot = prev[entryKey] ?? [];
      const filtered = snapshot.filter(c => !(c.ts === ts && c.from === by));
      const optimistic: CommentsMap = { ...prev };
      if (filtered.length === 0) delete optimistic[entryKey];
      else optimistic[entryKey] = filtered;
      writeCache(COMMENTS_KEY, optimistic);
      return optimistic;
    });

    deleteCommentRemote(entryKey, ts, by)
      .then(serverArr => {
        setComments(curr => {
          const next: CommentsMap = { ...curr };
          if (serverArr.length === 0) delete next[entryKey];
          else next[entryKey] = serverArr;
          writeCache(COMMENTS_KEY, next);
          return next;
        });
        setSyncError(null);
      })
      .catch((err: ApiError) => {
        if (err?.status && err.status >= 400 && err.status < 500) {
          setComments(curr => ({ ...curr, [entryKey]: snapshot }));
        } else {
          setSyncError(err?.isKvUnavailable ? 'kv-unavailable' : (err?.message ?? 'sync error'));
        }
      });
  }, []);

  const toggleCommentLike = useCallback((entryKey: string, ts: number, user: string) => {
    let snapshot: Comment[] = [];
    setComments(prev => {
      snapshot = prev[entryKey] ?? [];
      const next = snapshot.map(c => c.ts !== ts ? c : {
        ...c,
        likes: c.likes.includes(user) ? c.likes.filter(u => u !== user) : [...c.likes, user],
      });
      const optimistic: CommentsMap = { ...prev, [entryKey]: next };
      writeCache(COMMENTS_KEY, optimistic);
      return optimistic;
    });

    toggleCommentLikeRemote(entryKey, ts, user)
      .then(serverArr => {
        setComments(curr => {
          const next: CommentsMap = { ...curr, [entryKey]: serverArr };
          writeCache(COMMENTS_KEY, next);
          return next;
        });
        setSyncError(null);
      })
      .catch((err: ApiError) => {
        if (err?.status && err.status >= 400 && err.status < 500) {
          setComments(curr => ({ ...curr, [entryKey]: snapshot }));
        } else {
          setSyncError(err?.isKvUnavailable ? 'kv-unavailable' : (err?.message ?? 'sync error'));
        }
      });
  }, []);

  return (
    <SocialContext.Provider value={{
      reactions, comments,
      toggleEntryReaction, toggleLike,
      addComment, deleteComment, toggleCommentLike,
      initialLoading, syncError,
    }}>
      {children}
    </SocialContext.Provider>
  );
}

/* ─── Hook ───────────────────────────────────────────────── */
export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) {
    return {
      reactions: {} as EntryReactions,
      comments: {} as CommentsMap,
      toggleEntryReaction: () => {},
      toggleLike: () => {},
      addComment: () => {},
      deleteComment: () => {},
      toggleCommentLike: () => {},
      initialLoading: false,
      syncError: null as string | null,
      entryReactionsFor: (_k: string) => ({} as ReactionMap),
      likesFor: (_k: string) => [] as string[],
      commentsFor: (_k: string) => [] as Comment[],
    };
  }
  return {
    ...ctx,
    entryReactionsFor: (entryKey: string) => ctx.reactions[entryKey] ?? {},
    likesFor: (entryKey: string) => reactorsOf(ctx.reactions[entryKey] ?? {}, DEFAULT_REACTION),
    commentsFor: (entryKey: string) => ctx.comments[entryKey] ?? [],
  };
}
