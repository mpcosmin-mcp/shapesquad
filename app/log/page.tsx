'use client';

import { useState } from 'react';
import { useShapeData } from '@/lib/useShapeData';
import { submitEntry } from '@/lib/shape';
import { Lock, CheckCircle2, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const LOG_PIN = 'shapesquad2025';

type Gender = 'M' | 'F';

/* ─── Body composition (everyone) ───────────────────────────────────── */
const BODY_FIELDS: { key: string; label: string; sheet: string; unit: string; step: string }[] = [
  { key: 'kg',          label: 'Greutate',     sheet: 'Kg',           unit: 'kg', step: '0.1' },
  { key: 'bodyFat',     label: 'Body Fat',     sheet: 'Body Fat %',   unit: '%',  step: '0.1' },
  { key: 'visceralFat', label: 'Visceral',     sheet: 'Visceral Fat', unit: '',   step: '1' },
  { key: 'muscle',      label: 'Muscle',       sheet: 'Muscle',       unit: '%',  step: '0.1' },
  { key: 'water',       label: 'Apă',          sheet: 'Water',        unit: '%',  step: '0.1' },
];

/* ─── Measurements (gender-dependent) ──────────────────────────────── */
const MALE_FIELDS = [
  { key: 'biceps',  label: 'Biceps',  sheet: 'Biceps',  unit: 'cm' },
  { key: 'piept',   label: 'Piept',   sheet: 'Piept',   unit: 'cm' },
  { key: 'spate',   label: 'Spate',   sheet: 'Spate',   unit: 'cm' },
  { key: 'fesieri', label: 'Fesieri', sheet: 'Fesieri', unit: 'cm' },
];
const FEMALE_FIELDS = [
  { key: 'biceps',  label: 'Biceps',  sheet: 'Biceps',  unit: 'cm' },
  { key: 'piept',   label: 'Piept',   sheet: 'Piept',   unit: 'cm' },
  { key: 'talie',   label: 'Talie',   sheet: 'Talie',   unit: 'cm' },
  { key: 'fesieri', label: 'Fesieri', sheet: 'Fesieri', unit: 'cm' },
];

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
  const gender = form.gender as Gender;
  const measurementFields = gender === 'F' ? FEMALE_FIELDS : MALE_FIELDS;

  // Auto-infer gender when picking a known person (most recent entry's gender wins)
  const onPickName = (name: string) => {
    setForm((f) => {
      const p = people.find((x) => x.name === name);
      return { ...f, name, gender: p?.gender ?? f.gender };
    });
  };

  async function handleSubmit() {
    if (!form.name) return;
    setSubmitting(true);
    const entry: Record<string, any> = {
      Nume: form.name,
      Date: form.date,
      Gender: form.gender,
    };
    // Body composition — always send
    for (const f of BODY_FIELDS) {
      if (form[f.key]) entry[f.sheet] = parseFloat(form[f.key]);
    }
    // Gender-specific measurements — only those visible for the chosen gender
    for (const f of measurementFields) {
      if (form[f.key]) entry[f.sheet] = parseFloat(form[f.key]);
    }
    const ok = await submitEntry(entry);
    setSubmitting(false);
    if (ok) {
      setToast('Salvat 💪');
      setTimeout(() => {
        setToast('');
        refresh();
        // Reset measurement values, keep name + gender + date
        const cleared: Record<string, string> = {
          name: form.name,
          date: new Date().toISOString().slice(0, 10),
          gender: form.gender,
        };
        setForm(cleared);
      }, 1400);
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
            onChange={(e) => { setPin(e.target.value); setPinErr(false); }}
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
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-3">
      <div className="flex items-end justify-between fade-in-up delay-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--color-fg)]">
            Loghează măsurătoare
          </h1>
          <p className="text-[11px] text-[var(--color-fg-muted)] mt-0.5">
            o dată pe lună · retroactiv permis · măsurătorile se schimbă cu genul
          </p>
        </div>
        {toast && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-good)]/10 border border-[var(--color-good)]/30 text-[var(--color-good)] text-xs font-medium anim-scale">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {toast}
          </div>
        )}
      </div>

      <Card className="p-4 sm:p-5 space-y-5 fade-in-up delay-1">
        {/* Name + Date + Gender row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label block mb-1.5">Nume</label>
            {!newName ? (
              <div className="flex gap-1.5">
                <select
                  value={form.name}
                  onChange={(e) => onPickName(e.target.value)}
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
            <div className="flex gap-1.5" role="radiogroup" aria-label="Gen">
              {(['M', 'F'] as Gender[]).map((g) => (
                <button
                  key={g}
                  role="radio"
                  aria-checked={form.gender === g}
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

        {/* Body composition — same for everyone */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <div className="label">Body composition · pentru toți</div>
            <div className="text-[10px] num text-[var(--color-fg-faint)]">câmpurile goale se ignoră</div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {BODY_FIELDS.map((f) => (
              <FieldInput
                key={f.key}
                label={f.label}
                unit={f.unit}
                step={f.step}
                value={form[f.key] || ''}
                onChange={(v) => set(f.key, v)}
              />
            ))}
          </div>
        </div>

        {/* Measurements — gender-dynamic */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <div className="label">
              Măsurători (cm) · {gender === 'F' ? 'feminin' : 'masculin'}
            </div>
            <div className="text-[10px] num text-[var(--color-fg-faint)]">
              {gender === 'F' ? 'biceps · piept · talie · fesieri' : 'biceps · piept · spate · fesieri'}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {measurementFields.map((f) => (
              <FieldInput
                key={f.key}
                label={f.label}
                unit={f.unit}
                step="0.5"
                value={form[f.key] || ''}
                onChange={(v) => set(f.key, v)}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            onClick={handleSubmit}
            disabled={submitting || !form.name}
            variant="primary"
            size="lg"
            className="flex-1"
          >
            {submitting ? 'Se salvează...' : '💾 Salvează măsurătoarea'}
          </Button>
          <Button
            onClick={() => setForm((f) => ({ name: f.name, date: f.date, gender: f.gender }))}
            variant="ghost"
            size="md"
            title="Curăță valorile măsurate"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

function FieldInput({
  label, unit, step, value, onChange,
}: {
  label: string;
  unit: string;
  step: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-xl px-2.5 py-2 border border-[var(--color-border)] bg-[var(--color-card)] focus-within:border-[var(--color-accent)] transition-colors">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--color-fg-muted)]">{label}</span>
        <span className="text-[9px] num text-[var(--color-fg-faint)]">{unit}</span>
      </div>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        placeholder="—"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent outline-none num font-bold text-lg text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)] placeholder:font-normal"
      />
    </div>
  );
}
