import { useState } from 'react';
import { Person, METRICS, submitEntry } from '../../lib/shape';

interface Props { people: Person[]; onSubmitted: () => void; }
const LOG_PIN = 'shapesquad2025';

export default function InputPage({ people, onSubmitted }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinErr, setPinErr] = useState(false);
  const names = people.map(p => p.name);
  const [form, setForm] = useState<Record<string, string>>({ name: names[0] || '', date: new Date().toISOString().slice(0, 10), gender: 'M' });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [newName, setNewName] = useState(false);

  if (!unlocked) {
    return (
      <div className="max-w-sm mx-auto mt-20">
        <div className="glass rounded-[var(--r-lg)] p-6 text-center">
          <span className="text-4xl mb-3 block">🔒</span>
          <h2 className="font-black text-lg mb-1">Admin Only</h2>
          <p className="text-xs text-slate-500 mb-4 font-medium">Enter PIN to log measurements</p>
          <input type="password" placeholder="PIN" value={pin}
            onChange={e => { setPin(e.target.value); setPinErr(false); }}
            onKeyDown={e => { if (e.key === 'Enter') { if (pin === LOG_PIN) setUnlocked(true); else setPinErr(true); }}}
            className={`w-full rounded-xl px-3 py-2.5 font-mono text-sm text-center outline-none mb-3 bg-white/5 border ${pinErr ? 'border-red-500' : 'border-white/10 focus:border-blue-500'}`}
            style={{ color: 'var(--text)' }} />
          {pinErr && <p className="text-xs text-red-400 mb-3 font-bold">Wrong PIN</p>}
          <button onClick={() => { if (pin === LOG_PIN) setUnlocked(true); else setPinErr(true); }}
            className="w-full py-2.5 rounded-xl font-black text-sm bg-blue-600 text-white shadow-lg shadow-blue-600/20">Unlock</button>
        </div>
      </div>
    );
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const handleSubmit = async () => {
    if (!form.name) return;
    setSubmitting(true);
    const entry: Record<string, any> = { Nume: form.name, Date: form.date, Gender: form.gender };
    METRICS.forEach(m => { if (form[m.key]) entry[m.label] = parseFloat(form[m.key]); });
    const ok = await submitEntry(entry);
    setSubmitting(false);
    if (ok) { setToast('Saved!'); setTimeout(() => { setToast(''); onSubmitted(); }, 1500); }
    else { setToast('API not configured — demo mode'); setTimeout(() => setToast(''), 3000); }
  };

  const inp = "w-full rounded-xl px-3 py-2.5 font-mono text-sm outline-none bg-white/5 border border-white/10 focus:border-blue-500";

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="glass rounded-[var(--r-lg)] p-6">
        <h2 className="font-black text-lg mb-4">📝 Log Measurement</h2>
        <div className="mb-4">
          <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Name</label>
          {!newName ? (
            <div className="flex gap-2">
              <select value={form.name} onChange={e => set('name', e.target.value)} className={`flex-1 ${inp}`} style={{ color: 'var(--text)' }}>
                {names.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <button onClick={() => { setNewName(true); set('name', ''); }}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white/5 text-slate-400">+ New</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input type="text" placeholder="New member" value={form.name} onChange={e => set('name', e.target.value)}
                className={`flex-1 ${inp}`} style={{ color: 'var(--text)' }} />
              <button onClick={() => { setNewName(false); set('name', names[0] || ''); }}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white/5 text-slate-400">Cancel</button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Date</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
              className={inp} style={{ color: 'var(--text)' }} />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Gender</label>
            <div className="flex gap-2">
              {['M', 'F'].map(g => (
                <button key={g} onClick={() => set('gender', g)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${
                    form.gender === g ? (g === 'M' ? 'bg-blue-600 text-white' : 'bg-pink-600 text-white') : 'bg-white/5 text-slate-400'
                  }`}>{g === 'M' ? '♂' : '♀'}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Body Composition</div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {METRICS.filter(m => m.category === 'body').map(m => (
            <div key={m.key}>
              <label className="text-[10px] text-slate-600 block mb-1 font-bold">{m.icon} {m.label}</label>
              <input type="number" step="0.1" placeholder="—" value={form[m.key] || ''}
                onChange={e => set(m.key, e.target.value)} className={inp} style={{ color: 'var(--text)' }} />
            </div>
          ))}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Measurements (cm)</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {METRICS.filter(m => m.category === 'measurement').map(m => (
            <div key={m.key}>
              <label className="text-[10px] text-slate-600 block mb-1 font-bold">{m.icon} {m.label}</label>
              <input type="number" step="0.5" placeholder="—" value={form[m.key] || ''}
                onChange={e => set(m.key, e.target.value)} className={inp} style={{ color: 'var(--text)' }} />
            </div>
          ))}
        </div>
        <button onClick={handleSubmit} disabled={submitting || !form.name}
          className="w-full py-3 rounded-2xl font-black text-sm bg-blue-600 text-white disabled:opacity-40 shadow-lg shadow-blue-600/20">
          {submitting ? 'Saving...' : '💾 Save Measurement'}
        </button>
      </div>
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 glass px-4 py-2 rounded-2xl anim-fade shadow-lg z-50">
          <span className="text-sm font-bold">{toast}</span>
        </div>
      )}
    </div>
  );
}
