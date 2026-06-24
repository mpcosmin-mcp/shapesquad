/* Thin client for the social API routes. Used by lib/social.tsx. */
'use client';

import type { Comment, CommentsMap } from '@/lib/social-store';
import type { ReactionMap } from '@/lib/reactions';

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

/* ─── Entry reactions ────────────────────────────────────── */

export type EntryReactions = Record<string, ReactionMap>;

export async function fetchEntryReactions(): Promise<EntryReactions> {
  const r = await fetch('/api/social/likes', { cache: 'no-store' });
  const j = (await r.json()) as { reactions?: EntryReactions; error?: string };
  if (!r.ok) throw buildError(r.status, j.error ?? 'fetch failed', j.error === 'kv-unavailable');
  return j.reactions ?? {};
}

export async function toggleEntryReactionRemote(
  entryKey: string,
  emoji: string,
  user: string,
): Promise<ReactionMap> {
  const r = await fetch('/api/social/likes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entryKey, emoji, user }),
  });
  const j = (await r.json()) as { reactions?: ReactionMap; error?: string };
  if (!r.ok) throw buildError(r.status, j.error ?? 'toggle failed', j.error === 'kv-unavailable');
  return j.reactions ?? {};
}

/* ─── Comments ───────────────────────────────────────────── */

export async function fetchComments(): Promise<CommentsMap> {
  const r = await fetch('/api/social/comments', { cache: 'no-store' });
  const j = (await r.json()) as { comments?: CommentsMap; error?: string };
  if (!r.ok) throw buildError(r.status, j.error ?? 'fetch failed', j.error === 'kv-unavailable');
  return j.comments ?? {};
}

async function postCommentAction(body: Record<string, unknown>): Promise<Comment[]> {
  const r = await fetch('/api/social/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = (await r.json()) as { comments?: Comment[]; error?: string };
  if (!r.ok) throw buildError(r.status, j.error ?? 'request failed', j.error === 'kv-unavailable');
  return j.comments ?? [];
}

export async function addCommentRemote(entryKey: string, comment: Comment): Promise<Comment[]> {
  return postCommentAction({
    action: 'add',
    entryKey,
    from: comment.from,
    ts: comment.ts,
    text: comment.text,
  });
}

export async function toggleCommentLikeRemote(
  entryKey: string,
  ts: number,
  user: string,
): Promise<Comment[]> {
  return postCommentAction({ action: 'like', entryKey, ts, user });
}

export async function deleteCommentRemote(
  entryKey: string,
  ts: number,
  by: string,
): Promise<Comment[]> {
  return postCommentAction({ action: 'delete', entryKey, ts, by });
}
