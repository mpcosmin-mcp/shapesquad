/* Thin client for /api/social/forum */
'use client';

import type { Thread, Comment, Reply, ThreadsMap } from '@/lib/forum';

export interface ApiError extends Error {
  status: number;
  isKvUnavailable: boolean;
}

function buildError(status: number, msg: string, isKvUnavailable = false): ApiError {
  const e = new Error(msg) as ApiError;
  e.status = status;
  e.isKvUnavailable = isKvUnavailable;
  return e;
}

export async function fetchThreads(): Promise<ThreadsMap> {
  const r = await fetch('/api/social/forum', { cache: 'no-store' });
  const j = (await r.json()) as { threads?: ThreadsMap; error?: string };
  if (!r.ok) throw buildError(r.status, j.error ?? 'fetch failed', j.error === 'kv-unavailable');
  return j.threads ?? {};
}

async function postAction<T>(body: Record<string, unknown>): Promise<T> {
  const r = await fetch('/api/social/forum', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = (await r.json()) as { thread?: T; threadId?: string; deleted?: boolean; error?: string };
  if (!r.ok) throw buildError(r.status, j.error ?? 'request failed', j.error === 'kv-unavailable');
  // For deletes, we want to be tolerant — caller handles
  return (j.thread ?? (j as unknown)) as T;
}

export function createThreadRemote(by: string, title: string, bodyText: string): Promise<Thread> {
  return postAction<Thread>({ action: 'createThread', by, title, bodyText });
}

export function likeThreadRemote(threadId: string, user: string): Promise<Thread> {
  return postAction<Thread>({ action: 'likeThread', threadId, user });
}

export function commentOnThreadRemote(
  threadId: string,
  comment: Pick<Comment, 'from' | 'text' | 'ts'>,
): Promise<Thread> {
  return postAction<Thread>({ action: 'comment', threadId, comment });
}

export function replyOnThreadRemote(
  threadId: string,
  commentTs: number,
  reply: Pick<Reply, 'from' | 'text' | 'ts'>,
): Promise<Thread> {
  return postAction<Thread>({ action: 'reply', threadId, commentTs, reply });
}

export function likeCommentRemote(
  threadId: string,
  commentTs: number,
  user: string,
  replyTs?: number,
): Promise<Thread> {
  return postAction<Thread>({ action: 'likeComment', threadId, commentTs, user, replyTs });
}

export async function deleteThreadRemote(threadId: string, by: string): Promise<void> {
  const r = await fetch('/api/social/forum', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'deleteThread', threadId, by }),
  });
  const j = (await r.json()) as { deleted?: boolean; error?: string };
  if (!r.ok) throw buildError(r.status, j.error ?? 'delete failed', j.error === 'kv-unavailable');
}

export function deleteCommentRemote(
  threadId: string,
  ts: number,
  by: string,
  parentTs?: number,
): Promise<Thread> {
  return postAction<Thread>({ action: 'deleteComment', threadId, ts, by, parentTs });
}
