'use client';

import { useState } from 'react';
import { useShapeData } from '@/lib/useShapeData';
import { METRICS, submitEntry } from '@/lib/shape';
import { Lock, CheckCircle2 } from 'lucide-react';

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
    const entry: Record<string, any> = {
      Nume: form.name,
      Date: form.date,
      Gender: form.gender,
    };
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

  const inp =
    'w-full px-3 py-2 rounded-lg font-mono text-sm tabular-nums outline-none bg-bg border border-border focus:border-bronze focus:shadow-glow-bronze transition-all text-fg placeholder:text-fg-faint';

  if (!unlocked) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="panel panel-lifted p-6 max-w-sm w-full text-center anim-scale">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-amber/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-amber" />
          </div>
          <h2 className="font-display text-lg font-bold text-fg mb-1">Admin Only</h2>
          <p className="text-[11px] text-fg-muted mb-4">Introdu PIN-ul pentru logging</p>
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
            className={`${inp} text-center mb-3 ${pinErr ? 'border-rose' : ''}`}
          />
          {pinErr && <p className="text-xs text-rose font-medium mb-2">PIN greșit</p>}
          <button
            onClick={() => {
              if (pin === LOG_PIN) setUnlocked(true);
              else setPinErr(true);
            }}
            className="btn btn-primary w-full"
          >
            Unlock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="shrink-0 flex items-end justify-between anim-fade">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-bold tracking-tight text-fg">
            Log Measurement
          </h1>
          <p className="text-[11px] text-fg-muted mt-0.5">
            💡 Retroactiv permis · alege orice dată din trecut
          </p>
        </div>
        {toast && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald/10 border border-emerald/30 text-emerald text-xs font-medium anim-scale">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {toast}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto -mr-2 pr-2">
        <div className="panel p-4 space-y-4 anim-fade d1">
          {/* Name + Date + Gender row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label block mb-1.5">Nume</label>
              {!newName ? (
                <div className="flex gap-1.5">
                  <select
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    className={`flex-1 ${inp}`}
                  >
                    {names.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      setNewName(true);
                      set('name', '');
                    }}
                    className="btn btn-secondary"
                  >
                    + Nou
                  </button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Membru nou"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    className={`flex-1 ${inp}`}
                  />
                  <button
                    onClick={() => {
                      setNewName(false);
                      set('name', names[0] || '');
                    }}
                    className="btn btn-ghost"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="label block mb-1.5">
                Data <span className="normal-case font-normal text-fg-faint">(retroactiv OK)</span>
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className={inp}
              />
            </div>
            <div>
              <label className="label block mb-1.5">Gen</label>
              <div className="flex gap-1.5">
                {['M', 'F'].map((g) => (
                  <button
                    key={g}
                    onClick={() => set('gender', g)}
                    className={`flex-1 py-2 rounded-lg font-display text-base font-bold transition-all ${
                      form.gender === g
                        ? g === 'M'
                          ? 'bg-cyan text-bg shadow-glow-cyan'
                          : 'bg-rose text-white'
                        : 'bg-card border border-border text-fg-muted'
                    }`}
                  >
                    {g === 'M' ? '♂' : '♀'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="label mb-2">Body composition</div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {METRICS.filter((m) => m.category === 'body').map((m) => (
                <div key={m.key}>
                  <label className="text-[10px] text-fg-muted font-semibold block mb-1">
                    {m.icon} {m.label}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="—"
                    value={form[m.key] || ''}
                    onChange={(e) => set(m.key, e.target.value)}
                    className={inp}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="label mb-2">Măsurători (cm)</div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {METRICS.filter((m) => m.category === 'measurement').map((m) => (
                <div key={m.key}>
                  <label className="text-[10px] text-fg-muted font-semibold block mb-1">
                    {m.icon} {m.label}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="—"
                    value={form[m.key] || ''}
                    onChange={(e) => set(m.key, e.target.value)}
                    className={inp}
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !form.name}
            className="btn btn-primary w-full py-3 text-sm"
          >
            {submitting ? 'Se salvează...' : '💾 Salvează măsurătoarea'}
          </button>
        </div>
      </div>
    </div>
  );
}
