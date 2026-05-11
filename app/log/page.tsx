'use client';

import { useState } from 'react';
import { useShapeData } from '@/lib/useShapeData';
import { METRICS, submitEntry } from '@/lib/shape';
import { Lock } from 'lucide-react';

const LOG_PIN = 'shapesquad2025';

export default function LogPage() {
  const { people, refresh } = useShapeData();
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinErr, setPinErr] = useState(false);
  const names = people.map((p) => p.name);
  const [form, setForm] = useState<Record<string, string>>({
    name: names[0] || '',
    date: new Date().toISOString().slice(0, 10),
    gender: 'M',
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [newName, setNewName] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit() {
    if (!form.name) return;
    setSubmitting(true);
    const entry: Record<string, any> = { Nume: form.name, Date: form.date, Gender: form.gender };
    METRICS.forEach((m) => {
      if (form[m.key]) entry[m.label] = parseFloat(form[m.key]);
    });
    const ok = await submitEntry(entry);
    setSubmitting(false);
    if (ok) {
      setToast('Salvat! 💪');
      setTimeout(() => {
        setToast('');
        refresh();
      }, 1500);
    } else {
      setToast('Demo mode — API neconfigurat');
      setTimeout(() => setToast(''), 3000);
    }
  }

  const inp = 'w-full rounded-xl px-3 py-2 font-mono text-sm outline-none bg-white/5 border border-white/10 focus:border-blue-500';

  if (!unlocked) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="glass rounded-2xl p-6 max-w-sm w-full text-center">
          <Lock className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
          <h2 className="font-black text-base mb-1">Admin Only</h2>
          <p className="text-[11px] text-slate-500 mb-3">Introdu PIN-ul pentru logging</p>
          <input
            type="password"
            placeholder="PIN"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setPinErr(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (pin === LOG_PIN) setUnlocked(true);
                else setPinErr(true);
              }
            }}
            className={`w-full rounded-xl px-3 py-2 font-mono text-sm text-center outline-none mb-3 bg-white/5 border ${
              pinErr ? 'border-red-500' : 'border-white/10 focus:border-blue-500'
            }`}
            style={{ color: 'var(--text)' }}
          />
          {pinErr && <p className="text-xs text-red-400 mb-2 font-bold">PIN greșit</p>}
          <button
            onClick={() => {
              if (pin === LOG_PIN) setUnlocked(true);
              else setPinErr(true);
            }}
            className="w-full py-2 rounded-xl font-black text-sm bg-blue-600 text-white"
          >
            Unlock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="font-black text-base">📝 Log Measurement</h1>
          <p className="text-[10px] text-slate-500 font-medium">💡 Retroactiv permis ✅</p>
        </div>
        {toast && (
          <div className="chip text-[11px] bg-green-500/10 text-green-400 border border-green-500/30">
            {toast}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="glass rounded-2xl p-4 space-y-3">
          {/* Name + Date + Gender row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Nume</label>
              {!newName ? (
                <div className="flex gap-1">
                  <select value={form.name} onChange={(e) => set('name', e.target.value)} className={`flex-1 ${inp}`} style={{ color: 'var(--text)' }}>
                    {names.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      setNewName(true);
                      set('name', '');
                    }}
                    className="px-2 py-1 rounded-xl text-[10px] font-bold bg-white/5 text-slate-400"
                  >
                    + Nou
                  </button>
                </div>
              ) : (
                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder="Membru nou"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    className={`flex-1 ${inp}`}
                    style={{ color: 'var(--text)' }}
                  />
                  <button
                    onClick={() => {
                      setNewName(false);
                      set('name', names[0] || '');
                    }}
                    className="px-2 py-1 rounded-xl text-[10px] font-bold bg-white/5 text-slate-400"
                  >
                    X
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block mb-1">
                Data <span className="font-medium normal-case tracking-normal text-slate-600">(retroactiv OK)</span>
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className={inp}
                style={{ color: 'var(--text)' }}
              />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Gen</label>
              <div className="flex gap-1">
                {['M', 'F'].map((g) => (
                  <button
                    key={g}
                    onClick={() => set('gender', g)}
                    className={`flex-1 py-2 rounded-xl text-sm font-black transition-all ${
                      form.gender === g ? (g === 'M' ? 'bg-blue-600 text-white' : 'bg-pink-600 text-white') : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    {g === 'M' ? '♂' : '♀'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Body comp */}
          <div>
            <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">Body Composition</div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {METRICS.filter((m) => m.category === 'body').map((m) => (
                <div key={m.key}>
                  <label className="text-[9px] text-slate-600 block mb-0.5 font-bold">{m.icon} {m.label}</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="—"
                    value={form[m.key] || ''}
                    onChange={(e) => set(m.key, e.target.value)}
                    className={inp}
                    style={{ color: 'var(--text)' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Measurements */}
          <div>
            <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">Măsurători (cm)</div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {METRICS.filter((m) => m.category === 'measurement').map((m) => (
                <div key={m.key}>
                  <label className="text-[9px] text-slate-600 block mb-0.5 font-bold">{m.icon} {m.label}</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="—"
                    value={form[m.key] || ''}
                    onChange={(e) => set(m.key, e.target.value)}
                    className={inp}
                    style={{ color: 'var(--text)' }}
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !form.name}
            className="w-full py-2.5 rounded-xl font-black text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white disabled:opacity-40"
          >
            {submitting ? 'Se salvează...' : '💾 Salvează'}
          </button>
        </div>
      </div>
    </div>
  );
}
