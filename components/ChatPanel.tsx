'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Send, Sparkles, Loader2, AlertCircle, MessageSquare } from 'lucide-react';
import { useShapeData } from '@/lib/useShapeData';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  isLarge: boolean;
}

const SUGGESTIONS = [
  '🔥 Cine a progresat cel mai mult?',
  '😏 Roast Petrica un pic',
  '⚡ Cum stă echipa pe streak?',
  '💪 Sfat: cum scap de 2kg?',
];

const ACTIVE_USER_KEY = 'shapesquad_active_user';
const LIMIT = 10;

export default function ChatPanel({ open, onClose, isLarge }: Props) {
  const { people } = useShapeData();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [used, setUsed] = useState(0);
  const [remaining, setRemaining] = useState(LIMIT);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch initial rate status when panel opens
  useEffect(() => {
    if (!open) return;
    const user = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_USER_KEY) || 'anon' : 'anon';
    fetch('/api/chat', { headers: { 'x-shapesquad-user': user } })
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.used === 'number') setUsed(data.used);
        if (typeof data.remaining === 'number') setRemaining(data.remaining);
      })
      .catch(() => {});
    // Auto-focus input
    setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  // Esc closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const exhausted = remaining <= 0;
  const activeUser =
    typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_USER_KEY) || '' : '';

  async function send(text: string) {
    if (exhausted || loading) return;
    const userMsg: Message = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    const user = activeUser || 'anon';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shapesquad-user': user,
        },
        body: JSON.stringify({ messages: next, people }),
      });
      const data = await res.json();
      if (typeof data.used === 'number') setUsed(data.used);
      if (typeof data.remaining === 'number') setRemaining(data.remaining);

      if (data.text) {
        setMessages([...next, { role: 'assistant', content: data.text }]);
      } else if (data.rateLimited) {
        setMessages([
          ...next,
          { role: 'assistant', content: data.error || 'Limită zilnică atinsă. Vorbim mâine 🫡' },
        ]);
        setRemaining(0);
      } else {
        setMessages([
          ...next,
          { role: 'assistant', content: data.error || 'Hmm, n-am putut răspunde. Încearcă din nou.' },
        ]);
      }
    } catch {
      setMessages([
        ...next,
        { role: 'assistant', content: 'Eroare conexiune. Verifică internetul.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const counterTone =
    remaining >= 5 ? 'text-fg-muted' : remaining >= 2 ? 'text-amber' : 'text-rose';

  return (
    <>
      {/* Mobile backdrop */}
      {!isLarge && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 anim-fade-in"
          onClick={onClose}
        />
      )}

      <div
        className={
          isLarge
            ? 'fixed top-3 right-3 bottom-3 w-[410px] flex flex-col z-50 rounded-xl border border-border bg-bg-elevated shadow-panel-lifted anim-slide-right'
            : 'fixed inset-2 z-50 flex flex-col rounded-xl border border-border bg-bg-elevated shadow-panel-lifted anim-scale'
        }
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-bronze/[0.06] to-cyan/[0.04] rounded-t-xl">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-bronze/10 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-bronze" />
            </div>
            <div className="min-w-0">
              <div className="font-display font-bold text-sm leading-tight text-fg truncate">
                Coach Petrache
              </div>
              <div className="text-[10px] text-fg-muted leading-tight">
                {activeUser ? `pt. ${activeUser}` : 'AI · Haiku 4.5'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`font-mono text-[10px] font-bold tabular-nums ${counterTone}`}
              title={`${used}/${LIMIT} mesaje azi`}
            >
              {used}/{LIMIT}
            </span>
            <button onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Închide">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Rules banner — only show when no messages yet */}
        {messages.length === 0 && (
          <div className="shrink-0 px-4 py-2 border-b border-border bg-card/50">
            <p className="text-[10px] text-fg-muted leading-relaxed">
              💪 Despre <strong className="text-fg-dim">echipă, fitness, sport, nutriție, somn</strong>.
              10 mesaje/zi · cu roast inclus 😏
            </p>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="space-y-3 anim-fade">
              <p className="text-[12px] text-fg-dim leading-relaxed">
                Sunt Coach Petrache. Citesc datele echipei, observ pattern-uri și răspund cu umor.
                Roast pe Petrica e standard 😏
              </p>
              <div className="space-y-1.5">
                <p className="label">Încearcă</p>
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    disabled={exhausted || loading}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-[12px] font-medium text-fg-dim hover:text-fg bg-card hover:bg-card-hover border border-border hover:border-border-strong transition-all disabled:opacity-40 disabled:cursor-not-allowed anim-fade d${i + 1}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex anim-fade ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-bronze text-white rounded-br-sm shadow-glow-bronze'
                    : 'bg-card text-fg border border-border rounded-bl-sm'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start anim-fade-in">
              <div className="px-3.5 py-2.5 rounded-2xl bg-card border border-border text-fg-muted text-[12px] flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="anim-pulse">Coach Petrache scrie...</span>
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="shrink-0 p-3 border-t border-border bg-card/30 rounded-b-xl">
          {exhausted ? (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-rose/10 border border-rose/30 text-rose text-[12px] font-medium">
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
                className="flex-1 px-3 py-2.5 rounded-lg bg-bg border border-border text-[13px] text-fg outline-none focus:border-bronze focus:shadow-glow-bronze transition-all placeholder:text-fg-faint disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || exhausted || !input.trim()}
                className="btn btn-primary btn-icon"
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
