'use client';
import { useMemo, useState } from 'react';
import { Heart, MessageCircle, Send, X, ChevronDown, ChevronRight, CornerDownRight, Plus } from 'lucide-react';
import { useForum, type Thread, type Comment } from '@/lib/forum';
import { PERSON_COLORS } from '@/lib/shape';
import { fmtDate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';

/**
 * Forum — Reddit-style threads.
 *
 * Header: title + new-thread composer (collapsible).
 * Body: list of thread cards sorted by latest activity (latest comment / created).
 *   • Click a card → expands inline with comments + reply composer.
 *   • Heart toggles thread like.
 * Threading: 1 level (matches the rest of the app), like-able at every level.
 */
export function Forum({
  currentUser, allNames,
}: {
  currentUser: string;
  allNames: string[];
}) {
  const {
    threads, loading, syncError,
    createThread, likeThread, commentOnThread, replyOnThread,
    likeComment, deleteThread, deleteComment,
  } = useForum();

  const [composerOpen, setComposerOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const sorted = useMemo(() => {
    return Object.values(threads).sort((a, b) => lastActivity(b) - lastActivity(a));
  }, [threads]);

  const submitNew = async () => {
    const t = newTitle.trim();
    if (!t || posting) return;
    setPosting(true);
    const created = await createThread(currentUser, t, newBody.trim());
    setPosting(false);
    if (created) {
      setNewTitle('');
      setNewBody('');
      setComposerOpen(false);
      setExpanded((s) => ({ ...s, [created.id]: true }));
    }
  };

  return (
    <section className="card px-4 sm:px-5 py-4">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="label flex items-center gap-2">
            <span>Forum echipă</span>
            {syncError === 'kv-unavailable' && (
              <span
                className="num text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                style={{ background: 'rgba(251,191,36,0.12)', color: 'var(--color-warn)' }}
                title="KV nu e configurat — thread-urile rămân doar pe acest device. Vezi SOCIAL_SYNC.md."
              >
                offline
              </span>
            )}
          </div>
          <div className="text-[10px] num text-[var(--color-fg-faint)] mt-0.5">
            {loading
              ? 'se încarcă thread-urile...'
              : sorted.length === 0
                ? 'niciun thread încă · fii primul'
                : `${sorted.length} ${sorted.length === 1 ? 'thread' : 'thread-uri'} · scrie orice, e free-form`}
          </div>
        </div>
        <button
          onClick={() => setComposerOpen((o) => !o)}
          className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all"
          style={{
            background: composerOpen
              ? 'var(--color-surface)'
              : 'linear-gradient(135deg, var(--color-accent-soft), var(--color-accent-deep))',
            color: composerOpen ? 'var(--color-fg-muted)' : '#fff',
            border: composerOpen ? '1px solid var(--color-border)' : 'none',
          }}
        >
          <Plus size={12} strokeWidth={2.5} />
          {composerOpen ? 'închide' : 'thread nou'}
        </button>
      </div>

      {composerOpen && (
        <div className="mb-3 rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 p-3 space-y-2 fade-in-up">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="titlu thread (ex: cine vine la sală sâmbătă?)"
            maxLength={140}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm font-bold text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)] placeholder:font-normal focus:outline-none focus:border-[var(--color-accent)]"
          />
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="detalii (opțional)"
            rows={2}
            maxLength={2000}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)] resize-none focus:outline-none focus:border-[var(--color-accent)]"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] num text-[var(--color-fg-faint)]">
              {newTitle.length}/140 · {newBody.length}/2000
            </span>
            <button
              onClick={submitNew}
              disabled={!newTitle.trim() || posting}
              className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: !posting && newTitle.trim()
                  ? 'linear-gradient(135deg, var(--color-accent-soft), var(--color-accent-deep))'
                  : 'transparent',
                color: !posting && newTitle.trim() ? '#fff' : 'var(--color-fg-muted)',
              }}
            >
              {posting ? 'se postează...' : 'postează thread'}
            </button>
          </div>
        </div>
      )}

      {sorted.length === 0 && !loading && !composerOpen ? (
        <div className="text-xs text-[var(--color-fg-muted)] italic py-8 text-center">
          niciun thread încă. apasă{' '}
          <button
            onClick={() => setComposerOpen(true)}
            className="text-[var(--color-accent)] font-bold hover:underline"
          >
            thread nou
          </button>{' '}
          ca să deschizi primul subiect.
        </div>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              currentUser={currentUser}
              allNames={allNames}
              expanded={!!expanded[thread.id]}
              onToggleExpand={() => setExpanded((s) => ({ ...s, [thread.id]: !s[thread.id] }))}
              onLikeThread={() => likeThread(thread.id, currentUser)}
              onComment={(text) => commentOnThread(thread.id, text, currentUser)}
              onReply={(commentTs, text) => replyOnThread(thread.id, commentTs, text, currentUser)}
              onLikeComment={(commentTs, replyTs) => likeComment(thread.id, commentTs, currentUser, replyTs)}
              onDeleteThread={() => deleteThread(thread.id, currentUser)}
              onDeleteComment={(ts, parentTs) => deleteComment(thread.id, ts, currentUser, parentTs)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function lastActivity(t: Thread): number {
  let last = t.ts;
  for (const c of t.comments) {
    if (c.ts > last) last = c.ts;
    for (const r of c.replies) if (r.ts > last) last = r.ts;
  }
  return last;
}

function ThreadCard({
  thread, currentUser, allNames,
  expanded, onToggleExpand,
  onLikeThread, onComment, onReply, onLikeComment,
  onDeleteThread, onDeleteComment,
}: {
  thread: Thread;
  currentUser: string;
  allNames: string[];
  expanded: boolean;
  onToggleExpand: () => void;
  onLikeThread: () => void;
  onComment: (text: string) => void;
  onReply: (commentTs: number, text: string) => void;
  onLikeComment: (commentTs: number, replyTs?: number) => void;
  onDeleteThread: () => void;
  onDeleteComment: (ts: number, parentTs?: number) => void;
}) {
  const [commentInput, setCommentInput] = useState('');
  const authorIdx = Math.max(0, allNames.indexOf(thread.by));
  const c = PERSON_COLORS[authorIdx % PERSON_COLORS.length];
  const fn = thread.by.split(/\s+/)[0];
  const iLiked = thread.likes.includes(currentUser);
  const totalReplies =
    thread.comments.length + thread.comments.reduce((s, c) => s + c.replies.length, 0);
  const canDeleteThread = thread.by === currentUser;

  const submit = () => {
    const t = commentInput.trim();
    if (!t) return;
    onComment(t);
    setCommentInput('');
  };

  return (
    <Card
      className="overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${c}06, transparent 70%)` }}
    >
      <button
        onClick={onToggleExpand}
        className="w-full text-left px-3 sm:px-4 py-3 hover:bg-[var(--color-card-hover)] transition-colors relative"
      >
        <div className="absolute inset-y-0 left-0 w-0.5" style={{ background: c, opacity: 0.6 }} />
        <div className="flex items-start gap-2.5 pl-1">
          <span className="text-[var(--color-fg-muted)] shrink-0 mt-0.5">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="font-bold text-sm" style={{ color: c }}>{fn}</span>
              <span className="text-[10px] num text-[var(--color-fg-faint)]">{fmtDate(thread.ts ? new Date(thread.ts).toISOString().slice(0, 10) : '')} · {relativeTime(thread.ts)}</span>
            </div>
            <div className="text-sm font-bold text-[var(--color-fg)] mt-0.5 leading-snug break-words">
              {thread.title}
            </div>
            {thread.body && !expanded && (
              <div className="text-xs text-[var(--color-fg-muted)] mt-1 line-clamp-2 leading-relaxed">
                {thread.body}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 text-[10px]">
            <span className="num text-[var(--color-fg-muted)] flex items-center gap-1">
              <Heart size={11} strokeWidth={2} fill={iLiked ? '#ef4444' : 'none'} className={iLiked ? 'text-[#ef4444]' : ''} />
              {thread.likes.length || ''}
            </span>
            <span className="num text-[var(--color-fg-muted)] flex items-center gap-1">
              <MessageCircle size={11} strokeWidth={2} />
              {totalReplies || ''}
            </span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-3 sm:px-4 pb-3 border-t border-[var(--color-border)]/60 pt-2.5 space-y-3">
          {thread.body && (
            <p className="text-sm text-[var(--color-fg-dim)] whitespace-pre-line break-words leading-relaxed">
              {thread.body}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={onLikeThread}
              className="flex items-center gap-1.5 text-xs font-bold tap rounded-md px-1 -mx-1 py-0.5 transition-transform active:scale-90"
              style={{ color: iLiked ? '#ef4444' : 'var(--color-fg-muted)' }}
              aria-pressed={iLiked}
            >
              <Heart size={16} strokeWidth={2} fill={iLiked ? '#ef4444' : 'none'} />
              {thread.likes.length > 0 && <span className="num text-[11px]">{thread.likes.length}</span>}
            </button>
            {thread.likes.length > 0 && (
              <span className="text-[10px] text-[var(--color-fg-faint)] truncate">
                {thread.likes.slice(0, 3).map((u) => u.split(/\s+/)[0]).join(', ')}
                {thread.likes.length > 3 && ` +${thread.likes.length - 3}`}
              </span>
            )}
            {canDeleteThread && (
              <button
                onClick={() => { if (confirm('Sigur ștergi thread-ul?')) onDeleteThread(); }}
                className="ml-auto text-[var(--color-fg-faint)] hover:text-[var(--color-bad)] text-[10px] transition-colors"
                aria-label="Șterge thread"
              >
                șterge
              </button>
            )}
          </div>

          {thread.comments.length > 0 && (
            <div className="space-y-2">
              {thread.comments
                .slice()
                .sort((a, b) => a.ts - b.ts)
                .map((cmt) => (
                  <CommentBlock
                    key={`${cmt.from}-${cmt.ts}`}
                    comment={cmt}
                    currentUser={currentUser}
                    allNames={allNames}
                    onLike={() => onLikeComment(cmt.ts)}
                    onReply={(text) => onReply(cmt.ts, text)}
                    onLikeReply={(replyTs) => onLikeComment(cmt.ts, replyTs)}
                    onDelete={() => onDeleteComment(cmt.ts)}
                    onDeleteReply={(replyTs, by) => onDeleteComment(replyTs, cmt.ts)}
                    deleteAuthorCheck={(by) => by === currentUser}
                  />
                ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder="adaugă un comentariu..."
              maxLength={500}
              className="flex-1 min-w-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)] focus:outline-none focus:border-[var(--color-accent)]/60 transition-colors"
            />
            <button
              onClick={submit}
              disabled={!commentInput.trim()}
              className="rounded-lg p-2 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              style={{
                background: commentInput.trim()
                  ? 'linear-gradient(135deg, var(--color-accent-soft), var(--color-accent-deep))'
                  : 'transparent',
                color: commentInput.trim() ? '#fff' : 'var(--color-fg-muted)',
              }}
              aria-label="Trimite comentariu"
            >
              <Send size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

function CommentBlock({
  comment, currentUser, allNames,
  onLike, onReply, onLikeReply, onDelete, onDeleteReply, deleteAuthorCheck,
}: {
  comment: Comment;
  currentUser: string;
  allNames: string[];
  onLike: () => void;
  onReply: (text: string) => void;
  onLikeReply: (replyTs: number) => void;
  onDelete: () => void;
  onDeleteReply: (replyTs: number, by: string) => void;
  deleteAuthorCheck: (by: string) => boolean;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyInput, setReplyInput] = useState('');
  const iLiked = comment.likes.includes(currentUser);

  const submitReply = () => {
    const t = replyInput.trim();
    if (!t) return;
    onReply(t);
    setReplyInput('');
  };

  return (
    <div>
      <CommentBody
        from={comment.from}
        ts={comment.ts}
        text={comment.text}
        likes={comment.likes}
        iLiked={iLiked}
        canDelete={deleteAuthorCheck(comment.from)}
        allNames={allNames}
        onLike={onLike}
        onReplyToggle={() => setReplyOpen((o) => !o)}
        replyActive={replyOpen}
        onDelete={onDelete}
      />

      {(comment.replies.length > 0 || replyOpen) && (
        <div className="mt-1.5 pl-5 space-y-1.5 border-l border-[var(--color-border)]/60 ml-2.5">
          {comment.replies
            .slice()
            .sort((a, b) => a.ts - b.ts)
            .map((r) => (
              <CommentBody
                key={`${r.from}-${r.ts}`}
                from={r.from}
                ts={r.ts}
                text={r.text}
                likes={r.likes}
                iLiked={r.likes.includes(currentUser)}
                canDelete={deleteAuthorCheck(r.from)}
                allNames={allNames}
                onLike={() => onLikeReply(r.ts)}
                onReplyToggle={null}
                replyActive={false}
                onDelete={() => onDeleteReply(r.ts, r.from)}
                compact
              />
            ))}
          {replyOpen && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={replyInput}
                onChange={(e) => setReplyInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply(); } }}
                placeholder={`răspunde lui ${comment.from.split(/\s+/)[0]}...`}
                maxLength={500}
                autoFocus
                className="flex-1 min-w-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1 text-[11px] text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)] focus:outline-none focus:border-[var(--color-accent)]/60 transition-colors"
              />
              <button
                onClick={submitReply}
                disabled={!replyInput.trim()}
                className="rounded-lg p-1.5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                style={{
                  background: replyInput.trim()
                    ? 'linear-gradient(135deg, var(--color-accent-soft), var(--color-accent-deep))'
                    : 'transparent',
                  color: replyInput.trim() ? '#fff' : 'var(--color-fg-muted)',
                }}
                aria-label="Trimite răspuns"
              >
                <Send size={12} strokeWidth={2} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CommentBody({
  from, ts, text, likes,
  iLiked, canDelete, allNames,
  onLike, onReplyToggle, replyActive, onDelete,
  compact = false,
}: {
  from: string;
  ts: number;
  text: string;
  likes: string[];
  iLiked: boolean;
  canDelete: boolean;
  allNames: string[];
  onLike: () => void;
  onReplyToggle: (() => void) | null;
  replyActive: boolean;
  onDelete: () => void;
  compact?: boolean;
}) {
  const idx = Math.max(0, allNames.indexOf(from));
  const c = PERSON_COLORS[idx % PERSON_COLORS.length];
  const fn = from.split(/\s+/)[0];
  const ago = relativeTime(ts);
  const avSize = compact ? 'w-4 h-4 text-[9px]' : 'w-5 h-5 text-[10px]';
  const textSize = compact ? 'text-[11px]' : 'text-xs';

  return (
    <div className="flex items-start gap-2 group">
      <span
        className={`${avSize} rounded-full shrink-0 mt-0.5 flex items-center justify-center font-bold`}
        style={{ background: `${c}22`, color: c }}
        aria-hidden
      >
        {fn[0]?.toUpperCase()}
      </span>
      <div className="flex-1 min-w-0 leading-relaxed">
        <div className={textSize}>
          <span className="font-bold" style={{ color: c }}>{fn}</span>
          <span className="text-[var(--color-fg-faint)] num text-[10px] ml-1.5">{ago}</span>
        </div>
        <p className={`${textSize} text-[var(--color-fg)] mt-0.5 whitespace-pre-line break-words`}>
          {text}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={onLike}
            className="flex items-center gap-1 text-[10px] font-bold tap rounded-md px-0.5 -mx-0.5 py-0.5 transition-transform active:scale-90"
            style={{ color: iLiked ? '#ef4444' : 'var(--color-fg-muted)' }}
            aria-pressed={iLiked}
          >
            <Heart size={12} strokeWidth={2.2} fill={iLiked ? '#ef4444' : 'none'} />
            {likes.length > 0 && <span className="num">{likes.length}</span>}
          </button>
          {onReplyToggle && (
            <button
              onClick={onReplyToggle}
              aria-pressed={replyActive}
              className={`flex items-center gap-1 text-[10px] font-bold tap rounded-md px-0.5 -mx-0.5 py-0.5 transition-colors ${
                replyActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
              }`}
            >
              <CornerDownRight size={11} strokeWidth={2.2} />
              <span>răspunde</span>
            </button>
          )}
        </div>
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

function relativeTime(ts: number): string {
  if (!ts) return '';
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

