'use client';

import { useEffect, useRef, useState } from 'react';
import { useShapeData } from '@/lib/useShapeData';
import { useLoggedInUser } from '@/lib/useLoggedInUser';
import { submitEntry, verifyLogPassword, type Entry } from '@/lib/shape';
import { Lock, CheckCircle2, Plus, Save, RotateCcw, X, DatabaseBackup } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Gender = 'M' | 'F';

/* Columns = Sheet headers. `key` matches the Entry field; `sheet` is the
 * column name sent to Apps Script (and read back by parseRows). */
const COLS: { key: keyof Entry; label: string; sheet: string; step: string }[] = [
  { key: 'kg',          label: 'Kg',      sheet: 'Kg',           step: '0.1' },
  { key: 'bodyFat',     label: 'Fat %',   sheet: 'Body Fat %',   step: '0.1' },
  { key: 'visceralFat', label: 'Visc',    sheet: 'Visceral Fat', step: '1'   },
  { key: 'muscle',      label: 'Muscle',  sheet: 'Muscle',       step: '0.1' },
  { key: 'water',       label: 'Apă',     sheet: 'Water',        step: '0.1' },
  { key: 'biceps',      label: 'Biceps',  sheet: 'Biceps',       step: '0.5' },
  { key: 'piept',       label: 'Piept',   sheet: 'Piept',        step: '0.5' },
  { key: 'spate',       label: 'Spate',   sheet: 'Spate',        step: '0.5' },
  { key: 'talie',       label: 'Talie',   sheet: 'Talie',        step: '0.5' },
  { key: 'fesieri',     label: 'Fesieri', sheet: 'Fesieri',      step: '0.5' },
];

interface Row {
  id: string;
  name: string;
  date: string;             // ISO yyyy-mm-dd
  gender: Gender;
  vals: Record<string, string>;
  orig: Record<string, string>;
  isNew: boolean;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

function buildRows(entries: Entry[]): Row[] {
  return entries
    .map((e, i): Row => {
      const vals: Record<string, string> = {};
      for (const c of COLS) {
        const v = e[c.key] as number | null;
        vals[c.key] = v == null ? '' : String(v);
      }
      return {
        id: `${e.name}__${e.date}__${i}`,
        name: e.name,
        date: e.date,
        gender: e.gender,
        vals,
        orig: { ...vals },
        isNew: false,
      };
    })
    .sort((a, b) => (b.date.localeCompare(a.date)) || a.name.localeCompare(b.name));
}

const rowDirty = (r: Row) =>
  r.isNew ? Boolean(r.name.trim()) || COLS.some((c) => (r.vals[c.key] ?? '') !== '')
          : COLS.some((c) => (r.vals[c.key] ?? '') !== (r.orig[c.key] ?? ''));

const rowHasValue = (r: Row) => COLS.some((c) => (r.vals[c.key] ?? '').trim() !== '');

function rowToEntry(r: Row): Record<string, any> {
  const entry: Record<string, any> = { Nume: r.name.trim(), Date: r.date, Gender: r.gender };
  for (const c of COLS) {
    const raw = (r.vals[c.key] ?? '').replace(',', '.').trim();
    if (raw !== '' && !isNaN(parseFloat(raw))) entry[c.sheet] = parseFloat(raw);
  }
  return entry;
}

export default function LogPage() {
  const { entries, refresh } = useShapeData();
  const { isAdmin, mounted } = useLoggedInUser();

  // ── Unlock (server-side verified) ──────────────────────
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState(''); // kept in memory only, never persisted
  const [pinErr, setPinErr] = useState('');
  const [checking, setChecking] = useState(false);

  async function tryUnlock() {
    if (!password) return;
    setChecking(true);
    const ok = await verifyLogPassword(password);
    setChecking(false);
    if (ok) { setUnlocked(true); setPinErr(''); }
    else setPinErr('Parolă greșită (sau server neconfigurat)');
  }

  // ── Grid state ─────────────────────────────────────────
  const [rows, setRows] = useState<Row[]>([]);
  const [hasEdits, setHasEdits] = useState(false);
  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [toast, setToast] = useState('');
  const idRef = useRef(0);

  // Seed from server whenever fresh data lands AND we have no pending edits,
  // so a background refresh never clobbers what you're typing.
  useEffect(() => {
    if (!entries.length || hasEdits) return;
    setRows(buildRows(entries));
  }, [entries, hasEdits]);

  const setVal = (id: string, key: string, v: string) => {
    setHasEdits(true);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, vals: { ...r.vals, [key]: v } } : r)));
  };
  const setField = (id: string, field: 'name' | 'date' | 'gender', v: string) => {
    setHasEdits(true);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: v } : r)));
  };
  const addRow = () => {
    setHasEdits(true);
    idRef.current += 1;
    setRows((rs) => [
      { id: `new_${idRef.current}`, name: '', date: todayISO(), gender: 'M', vals: {}, orig: {}, isNew: true },
      ...rs,
    ]);
  };
  const removeNewRow = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));

  const reload = async () => {
    setHasEdits(false);
    await refresh();
    setToast('Reîncărcat');
    setTimeout(() => setToast(''), 1500);
  };

  // One-time import of the old Google Sheet into Postgres. Idempotent (upsert),
  // so a double-click is harmless. Requires the DB env var to be set on Vercel.
  async function runMigration() {
    if (!confirm('Importă datele din Google Sheets în noua bază de date? (se poate rula de mai multe ori, e sigur)')) return;
    setMigrating(true);
    try {
      const res = await fetch('/api/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setToast(`Migrat ${data.migrated}/${data.total}${data.failed ? ` (${data.failed} eșuate)` : ''} ✅`);
        await refresh();
      } else {
        setToast(`Migrare eșuată: ${data.error || res.status}`);
      }
    } catch (e: any) {
      setToast(`Migrare eșuată: ${e?.message || 'eroare'}`);
    } finally {
      setMigrating(false);
      setTimeout(() => setToast(''), 4000);
    }
  }

  async function saveAll() {
    const dirty = rows.filter(rowDirty);
    const invalid = dirty.filter((r) => r.isNew && (!r.name.trim() || !r.date));
    if (invalid.length) {
      setToast('Rândurile noi au nevoie de nume + dată');
      setTimeout(() => setToast(''), 2500);
      return;
    }
    const payloads = dirty.filter((r) => r.name.trim() && rowHasValue(r)).map(rowToEntry);
    if (!payloads.length) {
      setToast('Nimic de salvat');
      setTimeout(() => setToast(''), 1800);
      return;
    }
    setSaving(true);
    let ok = 0;
    // Sequential — Apps Script is slow and concurrent sheet writes can race.
    for (const p of payloads) {
      if (await submitEntry(p, password)) ok += 1;
    }
    setSaving(false);
    if (ok === payloads.length) {
      setToast(`Salvat ${ok} ${ok === 1 ? 'rând' : 'rânduri'} 💪`);
      setHasEdits(false);
      await refresh();
    } else {
      setToast(`Salvat ${ok}/${payloads.length} — restul au eșuat`);
    }
    setTimeout(() => setToast(''), 3000);
  }

  // ── Gates ──────────────────────────────────────────────
  if (!mounted) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card className="p-6 max-w-sm w-full text-center anim-scale">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[var(--color-bad)]/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-[var(--color-bad)]" />
          </div>
          <h2 className="text-lg font-bold text-[var(--color-fg)] mb-1">Doar admin</h2>
          <p className="text-[12px] text-[var(--color-fg-muted)] mb-4 leading-relaxed">
            Măsurătorile le loghează doar Petrică. Tu folosești liber restul aplicației.
          </p>
          <Button onClick={() => { window.location.href = '/'; }} variant="secondary" className="w-full">
            ← Înapoi la dashboard
          </Button>
        </Card>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card className="p-6 max-w-sm w-full text-center anim-scale">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[var(--color-accent)]/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-[var(--color-accent)]" />
          </div>
          <h2 className="text-lg font-bold text-[var(--color-fg)] mb-1">Parolă admin</h2>
          <p className="text-[11px] text-[var(--color-fg-muted)] mb-4">Introdu parola ca să deschizi tabelul</p>
          <Input
            type="password"
            placeholder="Parolă"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setPinErr(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') tryUnlock(); }}
            className={`text-center mb-3 w-full ${pinErr ? '!border-[var(--color-bad)]' : ''}`}
            autoFocus
          />
          {pinErr && <p className="text-xs text-[var(--color-bad)] font-medium mb-2">{pinErr}</p>}
          <Button onClick={tryUnlock} disabled={checking || !password} variant="primary" className="w-full">
            {checking ? 'Se verifică…' : 'Deblochează'}
          </Button>
        </Card>
      </div>
    );
  }

  const dirtyCount = rows.filter(rowDirty).length;

  // ── Spreadsheet ────────────────────────────────────────
  return (
    <div className="max-w-full mx-auto w-full flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2 fade-in-up delay-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--color-fg)]">
            Tabel măsurători
          </h1>
          <p className="text-[11px] text-[var(--color-fg-muted)] mt-0.5">
            editează celulele direct · adaugă rânduri · salvezi tot deodată
          </p>
        </div>
        <div className="flex items-center gap-2">
          {toast && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-good)]/10 border border-[var(--color-good)]/30 text-[var(--color-good)] text-xs font-medium anim-scale">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {toast}
            </div>
          )}
          <Button onClick={runMigration} disabled={migrating} variant="ghost" size="sm" title="Import one-time din Google Sheets în baza de date (sigur de repetat)">
            <DatabaseBackup className="w-3.5 h-3.5" /> {migrating ? 'Se importă…' : 'Import Sheets'}
          </Button>
          <Button onClick={reload} variant="ghost" size="sm" title="Reîncarcă din baza de date (renunță la editări)">
            <RotateCcw className="w-3.5 h-3.5" /> Reîncarcă
          </Button>
          <Button onClick={addRow} variant="secondary" size="sm">
            <Plus className="w-3.5 h-3.5" /> Rând nou
          </Button>
          <Button onClick={saveAll} disabled={saving || dirtyCount === 0} variant="primary" size="sm">
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Se salvează…' : dirtyCount ? `Salvează (${dirtyCount})` : 'Salvează'}
          </Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden fade-in-up delay-1">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="w-6" />
                <Th className="text-left min-w-[120px] sticky left-0 bg-[var(--color-card)]">Nume</Th>
                <Th className="min-w-[120px]">Data</Th>
                <Th className="min-w-[54px]">Gen</Th>
                {COLS.map((c) => <Th key={c.key} className="min-w-[64px]">{c.label}</Th>)}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={COLS.length + 5} className="text-center py-10 text-[var(--color-fg-muted)] text-xs">
                    Niciun rând. Apasă <span className="font-semibold">Rând nou</span> ca să adaugi.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const dirty = rowDirty(r);
                return (
                  <tr
                    key={r.id}
                    className="border-b border-[var(--color-border)]/60 hover:bg-[var(--color-card-hover)]/40 transition-colors"
                  >
                    <td className="text-center align-middle">
                      {dirty && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" title="nesalvat" />}
                    </td>

                    {/* Key columns: editable for new rows, locked for existing */}
                    <td className="px-2 py-1 sticky left-0 bg-[var(--color-card)]">
                      {r.isNew ? (
                        <input
                          type="text"
                          value={r.name}
                          placeholder="Nume"
                          onChange={(e) => setField(r.id, 'name', e.target.value)}
                          className="w-full bg-transparent outline-none font-semibold text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)]"
                        />
                      ) : (
                        <span className="font-semibold text-[var(--color-fg)] whitespace-nowrap">{r.name}</span>
                      )}
                    </td>
                    <td className="px-2 py-1">
                      {r.isNew ? (
                        <input
                          type="date"
                          value={r.date}
                          max={todayISO()}
                          onChange={(e) => setField(r.id, 'date', e.target.value)}
                          className="w-full bg-transparent outline-none num text-[var(--color-fg)]"
                        />
                      ) : (
                        <span className="num text-[var(--color-fg-muted)] whitespace-nowrap">{r.date}</span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-center">
                      {r.isNew ? (
                        <select
                          value={r.gender}
                          onChange={(e) => setField(r.id, 'gender', e.target.value as Gender)}
                          className="bg-transparent outline-none num text-[var(--color-fg)]"
                        >
                          <option value="M">♂</option>
                          <option value="F">♀</option>
                        </select>
                      ) : (
                        <span className="num text-[var(--color-fg-muted)]">{r.gender === 'F' ? '♀' : '♂'}</span>
                      )}
                    </td>

                    {COLS.map((c) => {
                      const changed = !r.isNew && (r.vals[c.key] ?? '') !== (r.orig[c.key] ?? '');
                      return (
                        <td key={c.key} className="px-1 py-1">
                          <input
                            type="number"
                            inputMode="decimal"
                            step={c.step}
                            placeholder="—"
                            value={r.vals[c.key] ?? ''}
                            onChange={(e) => setVal(r.id, c.key, e.target.value)}
                            className={`w-14 text-center bg-transparent outline-none num text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)] rounded px-1 py-0.5 focus:bg-[var(--color-bg)] focus:ring-1 focus:ring-[var(--color-accent)] ${changed ? 'text-[var(--color-accent)] font-semibold' : ''}`}
                          />
                        </td>
                      );
                    })}

                    <td className="px-1 text-center">
                      {r.isNew && (
                        <button
                          onClick={() => removeNewRow(r.id)}
                          className="text-[var(--color-fg-faint)] hover:text-[var(--color-bad)] transition-colors"
                          title="Șterge rândul nou"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-[10px] text-[var(--color-fg-faint)] px-1">
        Celulele goale se ignoră la salvare. Rândurile existente se actualizează după Nume + Dată (upsert),
        direct în baza de date Postgres. <span className="num">Import Sheets</span> aduce o dată datele vechi din Google Sheets.
      </p>
    </div>
  );
}

function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`label px-2 py-2 text-[9px] font-bold text-[var(--color-fg-muted)] ${className}`}>
      {children}
    </th>
  );
}
