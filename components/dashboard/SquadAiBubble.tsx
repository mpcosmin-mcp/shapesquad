'use client';
import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, X, Loader2, AlertCircle, MessageSquare, Lock } from 'lucide-react';
import { useActiveUser } from '@/lib/useActiveUser';
import { useShapeData } from '@/lib/useShapeData';
import { useForum } from '@/lib/forum';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const LIMIT = 10;
const AI_OWNER = 'Petrica';
const AI_UNLOCK_KEY = 'shapesquad_aicoach_unlocked_petrica';
const AI_PIN = '12343212';

const SUGGESTIONS = [
  '🔥 Cine a progresat cel mai mult?',
  '💡 Ce idei au apărut pe forum?',
  '🎨 Sumarizează feedback-ul de design',
  '📈 Top 3 pattern-uri din echipă',
];

/**
 * Squad AI floating bubble — bottom-right with always-visible label pill.
 *
 * Collapsed: label pill ("Squad AI Coach · vorbește live") + sparkles bubble.
 * Expanded:  full popup with history + composer. Mobile = full screen.
 *
 * Uses the existing /api/chat endpoint (Haiku 4.5, 10/zi rate limit).
 */
export function SquadAiBubble() {
  const { activeUser } = useActiveUser();
  const { people } = useShapeData();
  const { threads } = useForum();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [used, setUsed] = useState(0);
  const [remaining, setRemaining] = useState(LIMIT);
  const [unlocked, setUnlocked] = useState(false);
  const [pinPromptOpen, setPinPromptOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pinRef = useRef<HTMLInputElement>(null);

  // Hydrate unlock state from localStorage
  useEffect(() => {
    try { setUnlocked(localStorage.getItem(AI_UNLOCK_KEY) === 'true'); }
    catch { /* ignore */ }
  }, []);

  // Auto-focus PIN input when opened
  useEffect(() => {
    if (pinPromptOpen) setTimeout(() => pinRef.current?.focus(), 60);
  }, [pinPromptOpen]);

  // Fetch rate status when first opened
  useEffect(() => {
    if (!open) return;
    const user = activeUser || 'anon';
    fetch('/api/chat', { headers: { 'x-shapesquad-user': user } })
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.used === 'number') setUsed(data.used);
        if (typeof data.remaining === 'number') setRemaining(data.remaining);
      })
      .catch(() => {});
    setTimeout(() => inputRef.current?.focus(), 120);
  }, [open, activeUser]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, loading]);

  const exhausted = remaining <= 0;

  async function send(text: string) {
    if (exhausted || loading) return;
    const userMsg: Message = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    const user = activeUser || 'anon';
    try {
      // Condense forum threads to feed the AI — title/author/body/comment count
      const forumDigest = Object.values(threads)
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 12)
        .map((t) => ({
          title: t.title,
          by: t.by,
          body: t.body?.slice(0, 400) ?? '',
          comments: t.comments.slice(0, 5).map((c) => ({
            from: c.from,
            text: c.text.slice(0, 200),
          })),
          likes: t.likes.length,
          commentCount: t.comments.length,
        }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-shapesquad-user': user },
        body: JSON.stringify({ messages: next, people, forum: forumDigest }),
      });
      const data = await res.json();
      if (typeof data.used === 'number') setUsed(data.used);
      if (typeof data.remaining === 'number') setRemaining(data.remaining);

      if (data.text) {
        setMessages([...next, { role: 'assistant', content: data.text }]);
      } else if (data.rateLimited) {
        setMessages([...next, { role: 'assistant', content: data.error || 'Limită zilnică atinsă. Vorbim mâine 🫡' }]);
        setRemaining(0);
      } else {
        setMessages([...next, { role: 'assistant', content: data.error || 'Hmm, n-am putut răspunde.' }]);
      }
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Eroare conexiune.' }]);
    } finally {
      setLoading(false);
    }
  }

  // ─── ACCESS GATE — Squad AI Coach is only available to Petrica ───────
  if (!activeUser || activeUser !== AI_OWNER) return null;

  const trySubmitPin = () => {
    if (pinInput === AI_PIN) {
      try { localStorage.setItem(AI_UNLOCK_KEY, 'true'); } catch { /* ignore */ }
      setUnlocked(true);
      setPinPromptOpen(false);
      setPinInput('');
      setPinError(false);
      setOpen(true);
    } else {
      setPinError(true);
    }
  };

  const handleBubbleClick = () => {
    if (!unlocked) {
      setPinPromptOpen(true);
      return;
    }
    setOpen(true);
  };

  const counterTone = remaining >= 5 ? 'text-[var(--color-fg-muted)]' : remaining >= 2 ? 'text-[var(--color-warn)]' : 'text-[var(--color-bad)]';

  return (
    <>
      {/* PIN gate */}
      {pinPromptOpen && (
        <>
          <div
            className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-[3px] anim-fade-in"
            onClick={() => setPinPromptOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Cod acces Squad AI"
            className="fixed z-[60] inset-0 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl shadow-black/50 anim-scale p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--color-accent)]/15 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-[var(--color-accent)]" />
                </div>
                <div>
                  <div className="font-bold text-sm">Squad AI Coach</div>
                  <div className="text-[10px] text-[var(--color-fg-muted)]">privat · cod necesar</div>
                </div>
              </div>
              <input
                ref={pinRef}
                type="password"
                inputMode="numeric"
                value={pinInput}
                onChange={(e) => { setPinInput(e.target.value); setPinError(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter') trySubmitPin(); }}
                placeholder="cod acces"
                className={`w-full text-center num tracking-[0.3em] font-bold text-lg h-11 px-3 rounded-lg bg-[var(--color-surface)] border ${pinError ? 'border-[var(--color-bad)]' : 'border-[var(--color-border)]'} text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)] placeholder:tracking-normal placeholder:font-normal placeholder:text-sm focus:outline-none focus:border-[var(--color-accent)]`}
                autoFocus
              />
              {pinError && (
                <div className="text-[11px] text-[var(--color-bad)] mt-2 text-center">Cod greșit, mai încearcă.</div>
              )}
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => { setPinPromptOpen(false); setPinInput(''); setPinError(false); }}
                  className="flex-1 text-xs font-semibold py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface)] transition-colors"
                >
                  Anulează
                </button>
                <button
                  onClick={trySubmitPin}
                  disabled={!pinInput.trim()}
                  className="flex-1 text-xs font-bold py-2 rounded-lg text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  style={{ background: 'linear-gradient(135deg, var(--color-accent-soft), var(--color-accent-deep))' }}
                >
                  Deblochează
                </button>
              </div>
              <div className="text-[10px] text-[var(--color-fg-faint)] mt-2 text-center">
                doar Petrica are acces · datele Forum sunt analizate de AI
              </div>
            </div>
          </div>
        </>
      )}

      {/* Collapsed: label pill + bubble */}
      <div
        className={cn(
          'fixed bottom-4 right-4 z-50 flex items-center gap-2 transition-all duration-200',
          open ? 'opacity-0 pointer-events-none translate-y-2 scale-95' : 'opacity-100 scale-100',
        )}
      >
        <button
          onClick={handleBubbleClick}
          className="hidden sm:flex items-center gap-2 h-12 pl-3.5 pr-3 rounded-full border shadow-2xl shadow-black/40 hover:-translate-x-0.5 transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(168,85,247,0.12))',
            borderColor: 'rgba(129,140,248,0.35)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] anim-pulse" />
          <span className="text-xs font-bold">Squad AI Coach</span>
          <span className="text-[10px] text-[var(--color-fg-muted)] hidden md:inline">vorbește live</span>
        </button>

        <button
          onClick={handleBubbleClick}
          className="relative w-14 h-14 rounded-full border-2 shadow-2xl shadow-black/50 hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, var(--color-accent-soft), var(--color-accent-deep))',
            borderColor: 'rgba(255,255,255,0.20)',
          }}
          aria-label={unlocked ? 'Squad AI Coach' : 'Squad AI Coach (cod necesar)'}
        >
          <Sparkles className="w-6 h-6 text-white" strokeWidth={2.4} />
          <span className="sm:hidden absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] anim-pulse" />
        </button>
      </div>

      {/* Backdrop + popup */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setOpen(false)}
      />
      <div
        className={cn(
          'fixed z-50 flex flex-col bg-[var(--color-bg)] border border-[var(--color-border)] overflow-hidden shadow-2xl',
          'inset-0 sm:inset-auto sm:bottom-4 sm:right-4 sm:w-[420px] sm:max-w-[calc(100vw-2rem)] sm:h-[min(720px,calc(100dvh-6rem))] sm:rounded-2xl',
          'lg:w-[460px]',
          'transform-gpu transition-all duration-250 ease-out origin-bottom-right',
          open ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 translate-y-4 pointer-events-none',
        )}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]"
          style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.06), transparent 70%)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)]/15 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm leading-tight text-[var(--color-fg)] truncate">
                Squad AI Coach
              </div>
              <div className="text-[10px] text-[var(--color-fg-muted)] leading-tight">
                pt. {activeUser} · Haiku 4.5
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn('num text-[10px] font-bold tabular-nums', counterTone)}>
              {used}/{LIMIT}
            </span>
            <button
              onClick={() => setOpen(false)}
              className="tap rounded-lg flex items-center justify-center text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface)] transition-colors"
              aria-label="Închide"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {messages.length === 0 && (
          <div className="shrink-0 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-card)]/50">
            <p className="text-[10px] text-[var(--color-fg-muted)] leading-relaxed">
              💪 Despre <strong className="text-[var(--color-fg-dim)]">echipă, fitness, sport, nutriție, somn</strong>. 10 mesaje/zi · cu roast inclus 😏
            </p>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--color-fg-dim)] leading-relaxed">
                Sunt Squad AI. Citesc datele echipei, observ pattern-uri și răspund cu umor.
                Roast pe oricine — toată lumea încasează 😏
              </p>
              <div className="space-y-1.5">
                <p className="label">Încearcă</p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    disabled={exhausted || loading}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] bg-[var(--color-card)] hover:bg-[var(--color-card-hover)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[88%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
                  m.role === 'user'
                    ? 'rounded-br-sm text-white'
                    : 'bg-[var(--color-card)] text-[var(--color-fg)] border border-[var(--color-border)] rounded-bl-sm',
                )}
                style={m.role === 'user'
                  ? { background: 'linear-gradient(135deg, var(--color-accent-soft), var(--color-accent-deep))' }
                  : undefined}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="px-3.5 py-2.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-fg-muted)] text-xs flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="anim-pulse">Coach scrie...</span>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 p-3 border-t border-[var(--color-border)] bg-[var(--color-card)]/30">
          {exhausted ? (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[var(--color-bad)]/10 border border-[var(--color-bad)]/30 text-[var(--color-bad)] text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Ai folosit cele 10 mesaje pe ziua de azi. Ne vedem mâine 🫡</span>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (input.trim() && !loading) send(input.trim());
              }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Întreabă despre echipă, sport, nutriție..."
                disabled={loading || exhausted}
                className="flex-1 px-3 py-2.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)] transition-all placeholder:text-[var(--color-fg-faint)] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || exhausted || !input.trim()}
                className="rounded-lg p-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: !loading && !exhausted && input.trim()
                    ? 'linear-gradient(135deg, var(--color-accent-soft), var(--color-accent-deep))'
                    : 'transparent',
                  color: !loading && !exhausted && input.trim() ? '#fff' : 'var(--color-fg-muted)',
                }}
                aria-label="Trimite"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

// Suppress unused import lint
void MessageSquare;
