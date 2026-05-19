'use client';

import { useState } from 'react';
import { useShapeData } from '@/lib/useShapeData';
import { METRICS, submitEntry } from '@/lib/shape';
import { Lock, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

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

  if (!unlocked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card className="p-6 max-w-sm w-full text-center anim-scale">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[var(--color-warn)]/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-[var(--color-warn)]" />
          </div>
          <h2 className="text-lg font-bold text-[var(--color-fg)] mb-1">Admin Only</h2>
          <p className="text-[11px] text-[var(--color-fg-muted)] mb-4">Introdu PIN-ul pentru logging</p>
          <Input
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
            className={`text-center mb-3 ${pinErr ? '!border-[var(--color-bad)]' : ''}`}
          />
          {pinErr && <p className="text-xs text-[var(--color-bad)] font-medium mb-2">PIN greșit</p>}
          <Button
            onClick={() => {
              if (pin === LOG_PIN) setUnlocked(true);
              else setPinErr(true);
            }}
            variant="primary"
            className="w-full"
          >
            Unlock
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-3">
      <div className="flex items-end justify-between fade-in-up delay-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--color-fg)]">
            Loghează măsurătoare
          </h1>
          <p className="text-[11px] text-[var(--color-fg-muted)] mt-0.5">
            💡 Retroactiv permis · alege orice dată din trecut
          </p>
        </div>
        {toast && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-good)]/10 border border-[var(--color-good)]/30 text-[var(--color-good)] text-xs font-medium anim-scale">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {toast}
          </div>
        )}
      </div>

      <Card className="p-4 sm:p-5 space-y-4 fade-in-up delay-1">
        {/* Name + Date + Gender row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label block mb-1.5">Nume</label>
            {!newName ? (
              <div className="flex gap-1.5">
                <select
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  className="flex-1 h-10 px-3 rounded-lg bg-[var(--color-card)] text-[var(--color-fg)] border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-accent)] num text-sm"
                >
                  {names.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <Button
                  onClick={() => { setNewName(true); set('name', ''); }}
                  variant="secondary"
                  size="md"
                >
                  + Nou
                </Button>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <Input
                  type="text"
                  placeholder="Membru nou"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={() => { setNewName(false); set('name', names[0] || ''); }}
                  variant="ghost"
                  size="md"
                >
                  ✕
                </Button>
              </div>
            )}
          </div>
          <div>
            <label className="label block mb-1.5">
              Data <span className="normal-case font-normal text-[var(--color-fg-faint)]">(retroactiv OK)</span>
            </label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full num"
            />
          </div>
          <div>
            <label className="label block mb-1.5">Gen</label>
            <div className="flex gap-1.5">
              {['M', 'F'].map((g) => (
                <button
                  key={g}
                  onClick={() => set('gender', g)}
                  className={`flex-1 py-2 rounded-lg text-base font-bold transition-all ${
                    form.gender === g
                      ? g === 'M'
                        ? 'bg-[var(--color-accent-soft)] text-white'
                        : 'bg-[var(--color-bad)] text-white'
                      : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-fg-muted)]'
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
                <label className="text-[10px] text-[var(--color-fg-muted)] font-semibold block mb-1">
                  {m.icon} {m.label}
                </label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="—"
                  value={form[m.key] || ''}
                  onChange={(e) => set(m.key, e.target.value)}
                  className="w-full num text-sm"
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
                <label className="text-[10px] text-[var(--color-fg-muted)] font-semibold block mb-1">
                  {m.icon} {m.label}
                </label>
                <Input
                  type="number"
                  step="0.5"
                  placeholder="—"
                  value={form[m.key] || ''}
                  onChange={(e) => set(m.key, e.target.value)}
                  className="w-full num text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting || !form.name}
          variant="primary"
          size="lg"
          className="w-full"
        >
          {submitting ? 'Se salvează...' : '💾 Salvează măsurătoarea'}
        </Button>
      </Card>
    </div>
  );
}
