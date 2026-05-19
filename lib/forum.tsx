'use client';
import {
  createContext, useCallback, useContext, useEffect, useState,
  type ReactNode,
} from 'react';
import {
  fetchThreads, createThreadRemote, likeThreadRemote,
  commentOnThreadRemote, replyOnThreadRemote, likeCommentRemote,
  deleteThreadRemote, deleteCommentRemote,
  type ApiError,
} from '@/lib/forum-api';

/* ═══════════════════════════════════════════════════════════════════════
 * Forum — Reddit-style free-form threads.
 *
 * Source of truth: Vercel KV hash `shape:forum`.
 * Mount once at app/layout.tsx via <ForumProvider>.
 * Hook `useForum()` exposes threads + mutations with optimistic updates.
 * ═══════════════════════════════════════════════════════════════════════ */

const CACHE_KEY = 'shapesquad_forum_v1';
const REFETCH_INTERVAL_MS = 30_000;

export interface Reply { from: string; ts: number; text: string; likes: string[]; }
export interface Comment {
  from: string;
  ts: number;
  text: string;
  likes: string[];
  replies: Reply[];
}
export interface Thread {
  id: string;
  by: string;
  ts: number;
  title: string;
  body: string;
  likes: string[];
  comments: Comment[];
}
export type ThreadsMap = Record<string, Thread>;

interface ForumContextValue {
  threads: ThreadsMap;
  loading: boolean;
  syncError: string | null;
  createThread: (by: string, title: string, body: string) => Promise<Thread | null>;
  likeThread: (threadId: string, user: string) => void;
  commentOnThread: (threadId: string, text: string, from: string) => void;
  replyOnThread: (threadId: string, commentTs: number, text: string, from: string) => void;
  likeComment: (threadId: string, commentTs: number, user: string, replyTs?: number) => void;
  deleteThread: (threadId: string, by: string) => Promise<void>;
  deleteComment: (threadId: string, ts: number, by: string, parentTs?: number) => void;
}

const ForumContext = createContext<ForumContextValue | null>(null);

function readCache(): ThreadsMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as ThreadsMap) : {};
  } catch { return {}; }
}
function writeCache(m: ThreadsMap) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(m)); } catch { /* non-fatal */ }
}

export function ForumProvider({ children }: { children: ReactNode }) {
  const [threads, setThreads] = useState<ThreadsMap>({});
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Hydrate from cache on mount, then background refetch
  useEffect(() => { setThreads(readCache()); }, []);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const t = await fetchThreads();
        if (cancelled) return;
        setThreads(t);
        writeCache(t);
        setSyncError(null);
      } catch (err) {
        const e = err as ApiError;
        setSyncError(e?.isKvUnavailable ? 'kv-unavailable' : (e?.message ?? 'sync error'));
      } finally {
        if (!cancelled) setLoading(false);
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

  const applyThread = useCallback((t: Thread | null, threadId?: string) => {
    setThreads((prev) => {
      const next = { ...prev };
      if (t) next[t.id] = t;
      else if (threadId) delete next[threadId];
      writeCache(next);
      return next;
    });
  }, []);

  const handleErr = (err: unknown) => {
    const e = err as ApiError;
    if (e?.isKvUnavailable) setSyncError('kv-unavailable');
    else setSyncError(e?.message ?? 'sync error');
  };

  const createThread = useCallback(async (by: string, title: string, body: string) => {
    try {
      const t = await createThreadRemote(by, title, body);
      applyThread(t);
      setSyncError(null);
      return t;
    } catch (err) {
      handleErr(err);
      return null;
    }
  }, [applyThread]);

  const likeThread = useCallback((threadId: string, user: string) => {
    const prev = threads[threadId];
    if (!prev) return;
    const optimistic: Thread = {
      ...prev,
      likes: prev.likes.includes(user) ? prev.likes.filter((u) => u !== user) : [...prev.likes, user],
    };
    applyThread(optimistic);
    likeThreadRemote(threadId, user)
      .then((srv) => applyThread(srv))
      .catch(handleErr);
  }, [threads, applyThread]);

  const commentOnThread = useCallback((threadId: string, text: string, from: string) => {
    const prev = threads[threadId];
    if (!prev) return;
    const ts = Date.now();
    const optimisticComment: Comment = { from, ts, text, likes: [], replies: [] };
    applyThread({ ...prev, comments: [...prev.comments, optimisticComment] });
    commentOnThreadRemote(threadId, { from, ts, text })
      .then((srv) => applyThread(srv))
      .catch(handleErr);
  }, [threads, applyThread]);

  const replyOnThread = useCallback((threadId: string, commentTs: number, text: string, from: string) => {
    const prev = threads[threadId];
    if (!prev) return;
    const ts = Date.now();
    const optimisticReply: Reply = { from, ts, text, likes: [] };
    applyThread({
      ...prev,
      comments: prev.comments.map((c) =>
        c.ts === commentTs ? { ...c, replies: [...c.replies, optimisticReply] } : c,
      ),
    });
    replyOnThreadRemote(threadId, commentTs, { from, ts, text })
      .then((srv) => applyThread(srv))
      .catch(handleErr);
  }, [threads, applyThread]);

  const likeComment = useCallback((threadId: string, commentTs: number, user: string, replyTs?: number) => {
    const prev = threads[threadId];
    if (!prev) return;
    const optimistic: Thread = {
      ...prev,
      comments: prev.comments.map((c) => {
        if (c.ts !== commentTs) return c;
        if (replyTs != null) {
          return {
            ...c,
            replies: c.replies.map((r) =>
              r.ts !== replyTs ? r : {
                ...r,
                likes: r.likes.includes(user) ? r.likes.filter((u) => u !== user) : [...r.likes, user],
              },
            ),
          };
        }
        return {
          ...c,
          likes: c.likes.includes(user) ? c.likes.filter((u) => u !== user) : [...c.likes, user],
        };
      }),
    };
    applyThread(optimistic);
    likeCommentRemote(threadId, commentTs, user, replyTs)
      .then((srv) => applyThread(srv))
      .catch(handleErr);
  }, [threads, applyThread]);

  const deleteThread = useCallback(async (threadId: string, by: string) => {
    const prev = threads[threadId];
    if (!prev || prev.by !== by) return;
    applyThread(null, threadId);
    try { await deleteThreadRemote(threadId, by); }
    catch (err) { handleErr(err); }
  }, [threads, applyThread]);

  const deleteCommentCb = useCallback((threadId: string, ts: number, by: string, parentTs?: number) => {
    const prev = threads[threadId];
    if (!prev) return;
    const optimistic: Thread = {
      ...prev,
      comments: parentTs != null
        ? prev.comments.map((c) =>
            c.ts !== parentTs ? c : {
              ...c,
              replies: c.replies.filter((r) => !(r.ts === ts && r.from === by)),
            },
          )
        : prev.comments.filter((c) => !(c.ts === ts && c.from === by)),
    };
    applyThread(optimistic);
    deleteCommentRemote(threadId, ts, by, parentTs)
      .then((srv) => applyThread(srv))
      .catch(handleErr);
  }, [threads, applyThread]);

  return (
    <ForumContext.Provider value={{
      threads, loading, syncError,
      createThread, likeThread, commentOnThread, replyOnThread,
      likeComment, deleteThread, deleteComment: deleteCommentCb,
    }}>
      {children}
    </ForumContext.Provider>
  );
}

export function useForum() {
  const ctx = useContext(ForumContext);
  if (!ctx) {
    return {
      threads: {} as ThreadsMap,
      loading: false,
      syncError: null as string | null,
      createThread: async () => null,
      likeThread: () => {},
      commentOnThread: () => {},
      replyOnThread: () => {},
      likeComment: () => {},
      deleteThread: async () => {},
      deleteComment: () => {},
    };
  }
  return ctx;
}
