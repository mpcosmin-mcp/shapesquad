'use client';
import { useState } from 'react';
import { Heart, MessageCircle, Send, X } from 'lucide-react';
import { firstNameOf, personColor } from '@/lib/shape';
import { useSocial, entryKeyOf, type Comment } from '@/lib/social';
import { MentionText, appendMention, type Mentionable } from '@/lib/mentions';
import { ReactionBar } from '@/components/dashboard/ReactionBar';

/**
 * Reactions + flat comments footer for a single feed entry.
 *
 * No threading — simputz. Each comment can be hearted and deleted
 * by its author. The composer supports @mention chips.
 *
 * Layout:
 *   [ReactionBar]                  ← emoji reactions
 *   [💬 N]                         ← toggle comment thread
 *   ──── thread ────────────────
 *   🔵 Petrica · 2min
 *   "comment text with @mentions"
 *   [♥ 2]
 *   [mention chips] [input] [send]
 */
export function EntryReactions({
  entryDate,
  entryName,
  currentUser,
  allNames,
}: {
  entryDate: string;
  entryName: string;
  currentUser: string;
  allNames: string[];
}) {
  const {
    toggleEntryReaction, entryReactionsFor,
    addComment, deleteComment, toggleCommentLike, commentsFor,
  } = useSocial();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');

  const key = entryKeyOf(entryDate, entryName);
  const entryReactions = entryReactionsFor(key);
  const comments = commentsFor(key);

  const mentionables: Mentionable[] = allNames
    .filter(n => n !== currentUser)
    .map(n => ({ first: firstNameOf(n), full: n, color: personColor(n, allNames) }));

  const submit = () => {
    const t = input.trim();
    if (!t || t.length > 280) return;
    addComment(key, { from: currentUser, ts: Date.now(), text: t, likes: [] });
    setInput('');
    setOpen(true);
  };

  return (
    <div className="mt-2.5 pt-2 border-t border-[var(--color-border)]/60">
      {/* Action row */}
      <div className="flex items-center gap-3 flex-wrap">
        <ReactionBar
          reactions={entryReactions}
          currentUser={currentUser}
          onToggle={(emoji) => toggleEntryReaction(key, emoji, currentUser)}
        />

        <button
          onClick={() => setOpen(o => !o)}
          aria-label="Comentarii"
          aria-pressed={open}
          className={`flex items-center gap-1.5 text-xs font-bold tap rounded-md px-1 -mx-1 py-0.5 transition-colors ml-auto ${
            open ? 'text-[var(--color-accent)]' : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
          }`}
        >
          <MessageCircle size={18} strokeWidth={2} />
          {comments.length > 0 && (
            <span className="num text-[11px]">{comments.length}</span>
          )}
        </button>
      </div>

      {/* Expanded thread */}
      {open && (
        <div className="mt-2.5 space-y-2">
          {/* Existing comments */}
          {comments
            .slice()
            .sort((a, b) => a.ts - b.ts)
            .map(c => (
              <CommentRow
                key={`${c.from}-${c.ts}`}
                comment={c}
                currentUser={currentUser}
                allNames={allNames}
                onDelete={() => deleteComment(key, c.ts, c.from)}
                onToggleLike={() => toggleCommentLike(key, c.ts, currentUser)}
              />
            ))}

          {/* Composer */}
          <div className="space-y-1.5">
            <MentionChips mentionables={mentionables} onPick={f => setInput(v => appendMention(v, f))} />
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
                placeholder="scrie ceva… (@ pentru a menționa)"
                maxLength={280}
                className="flex-1 min-w-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)] focus:outline-none focus:border-[var(--color-accent)]/60 transition-colors"
              />
              <button
                onClick={submit}
                disabled={!input.trim()}
                aria-label="Trimite"
                className="tap rounded-lg p-2 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                style={{
                  background: input.trim()
                    ? 'linear-gradient(135deg, var(--color-accent-soft), var(--color-accent-deep))'
                    : 'transparent',
                  color: input.trim() ? '#fff' : 'var(--color-fg-muted)',
                }}
              >
                <Send size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Single comment row ─────────────────────────────────── */

function CommentRow({
  comment,
  currentUser,
  allNames,
  onDelete,
  onToggleLike,
}: {
  comment: Comment;
  currentUser: string;
  allNames: string[];
  onDelete: () => void;
  onToggleLike: () => void;
}) {
  const c = personColor(comment.from, allNames);
  const fn = firstNameOf(comment.from);
  const ago = relativeTime(comment.ts);
  const iLiked = comment.likes.includes(currentUser);
  const canDelete = comment.from === currentUser;

  const mentionables: Mentionable[] = allNames.map(n => ({
    first: firstNameOf(n),
    full: n,
    color: personColor(n, allNames),
  }));

  return (
    <div className="flex items-start gap-2 group">
      <span
        className="w-5 h-5 text-[10px] rounded-full shrink-0 mt-0.5 flex items-center justify-center font-bold"
        style={{ background: `${c}22`, color: c }}
        aria-hidden
      >
        {fn[0]}
      </span>
      <div className="flex-1 min-w-0 leading-relaxed">
        <div className="text-xs">
          <span className="font-bold" style={{ color: c }}>{fn}</span>
          <span className="text-[var(--color-fg-faint)] num text-[10px] ml-1.5">{ago}</span>
        </div>
        <p className="text-xs text-[var(--color-fg)] mt-0.5 whitespace-pre-line break-words">
          <MentionText text={comment.text} mentionables={mentionables} />
        </p>
        <button
          onClick={onToggleLike}
          aria-label={iLiked ? 'Retrage like' : 'Dă like'}
          aria-pressed={iLiked}
          className="flex items-center gap-1 text-[10px] font-bold tap rounded-md px-0.5 -mx-0.5 py-0.5 mt-1 transition-transform active:scale-90"
          style={{ color: iLiked ? 'var(--color-bad)' : 'var(--color-fg-muted)' }}
        >
          <Heart size={12} strokeWidth={2.2} fill={iLiked ? 'var(--color-bad)' : 'none'} />
          {comment.likes.length > 0 && <span className="num">{comment.likes.length}</span>}
        </button>
      </div>
      {canDelete && (
        <button
          onClick={onDelete}
          className="text-[var(--color-fg-faint)] opacity-0 group-hover:opacity-100 hover:text-[var(--color-bad)] transition-all shrink-0 p-0.5"
          aria-label="Șterge"
        >
          <X size={11} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

/* ─── @mention quick-insert chips ───────────────────────── */

function MentionChips({
  mentionables,
  onPick,
}: {
  mentionables: Mentionable[];
  onPick: (first: string) => void;
}) {
  if (!mentionables.length) return null;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-[9px] text-[var(--color-fg-faint)]">menționează:</span>
      {mentionables.map(p => (
        <button
          key={p.full}
          type="button"
          onClick={() => onPick(p.first)}
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-md transition-transform active:scale-90"
          style={{ color: p.color, background: `${p.color}14` }}
        >
          @{p.first}
        </button>
      ))}
    </div>
  );
}

/* ─── Relative time (Romanian) ──────────────────────────── */

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'acum';
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}z`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}săpt`;
  return new Date(ts).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
}
