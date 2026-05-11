'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Send, Sparkles, Loader2 } from 'lucide-react';
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
  'Cine a progresat cel mai mult luna asta?',
  'Cum stă echipa pe streak?',
  'Recomandă-mi pe cine să admir astăzi',
  'Cine are cel mai bun XP pe loger?',
];

export default function ChatPanel({ open, onClose, isLarge }: Props) {
  const { people } = useShapeData();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  async function send(text: string) {
    const userMsg: Message = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, people }),
      });
      const data = await res.json();
      if (data.text) {
        setMessages([...next, { role: 'assistant', content: data.text }]);
      } else {
        setMessages([...next, { role: 'assistant', content: data.error || 'Hmm, n-am putut răspunde. Încearcă din nou.' }]);
      }
    } catch (e: any) {
      setMessages([...next, { role: 'assistant', content: 'Eroare conexiune. Verifică API key-ul Anthropic.' }]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className={
        isLarge
          ? 'fixed top-0 right-0 bottom-0 w-[400px] flex flex-col z-30 border-l border-white/[0.06]'
          : 'fixed inset-0 z-50 flex flex-col'
      }
      style={{ background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(20px)' }}
    >
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-400" />
          <h2 className="font-black text-sm">AI Coach</h2>
          <span className="chip text-[9px] bg-white/5 text-slate-400">Claude Haiku</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 leading-relaxed">
              <Sparkles className="w-3 h-3 inline mr-1 text-yellow-400" />
              Salut! Pot citi datele echipei și să răspund întrebări despre progres, streaks, XP și pattern-uri.
            </p>
            <div className="space-y-1.5">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Sugestii</p>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="w-full text-left px-3 py-2 rounded-xl text-[11px] font-medium text-slate-300 hover:text-white bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-gradient-to-br from-[var(--neon-blue)] to-[var(--neon-purple)] text-white rounded-br-sm'
                  : 'bg-white/[0.04] text-slate-200 rounded-bl-sm border border-white/[0.04]'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-2xl text-xs bg-white/[0.04] border border-white/[0.04] text-slate-400 flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> gândește...
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 p-3 border-t border-white/[0.06]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim() && !loading) send(input.trim());
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Întreabă orice despre echipă..."
            disabled={loading}
            className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-[var(--neon-blue)] disabled:opacity-50"
            style={{ color: 'var(--text)' }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-3 py-2 rounded-xl bg-gradient-to-br from-[var(--neon-blue)] to-[var(--neon-purple)] text-white disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
