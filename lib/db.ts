/* ─────────────────────────────────────────────────────────
   Neon Postgres — measurements store (replaces the Google Sheets backend).

   Connection comes from the Vercel ↔ Neon integration env vars. When none is
   present (local dev without .env.local) `sql` is null and dbReady() is false;
   callers return 503 and the client falls back to DEMO_DATA.

   One table: `measurements`, primary key (name, date) → natural upsert key so a
   given person has one row per logged date (matches the "one entry / month"
   cadence and the editable table's edit-in-place semantics).
   ───────────────────────────────────────────────────────── */
import { neon } from '@neondatabase/serverless';

const conn =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL_UNPOOLED ??
  null;

export const sql = conn ? neon(conn) : null;
export const dbReady = (): boolean => sql !== null;

/** Create the table if it doesn't exist. Idempotent — safe to call anywhere. */
export async function ensureSchema(): Promise<void> {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS measurements (
      name          text NOT NULL,
      date          date NOT NULL,
      gender        text NOT NULL DEFAULT 'M',
      kg            real,
      body_fat      real,
      visceral_fat  real,
      muscle        real,
      water         real,
      biceps        real,
      spate         real,
      piept         real,
      talie         real,
      fesieri       real,
      updated_at    timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (name, date)
    )
  `;
}

/**
 * All rows, keyed by the SAME headers the frontend expects (`Nume`, `Date`,
 * `Body Fat %`, …) so `parseRows` in lib/shape.ts stays untouched. Date is
 * emitted as a plain YYYY-MM-DD string.
 */
export async function getAllRows(): Promise<Record<string, unknown>[]> {
  if (!sql) return [];
  const rows = await sql`
    SELECT
      name                             AS "Nume",
      to_char(date, 'YYYY-MM-DD')      AS "Date",
      gender                           AS "Gender",
      kg                               AS "Kg",
      body_fat                         AS "Body Fat %",
      visceral_fat                     AS "Visceral Fat",
      muscle                           AS "Muscle",
      water                            AS "Water",
      biceps                           AS "Biceps",
      spate                            AS "Spate",
      piept                            AS "Piept",
      talie                            AS "Talie",
      fesieri                          AS "Fesieri"
    FROM measurements
    ORDER BY date ASC, name ASC
  `;
  return rows as Record<string, unknown>[];
}

/** Normalize a date value (ISO or M/D/YYYY) to YYYY-MM-DD. */
function normDate(v: string): string {
  if (!v) return '';
  const s = String(v).trim();
  const parts = s.split('/'); // M/D/YYYY
  if (parts.length === 3) {
    const [m, d, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return s.slice(0, 10);
}

function numOrNull(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(',', '.'));
  return isNaN(n) ? null : n;
}

/**
 * Upsert one measurement row from a payload keyed by Sheet headers
 * (`Nume`, `Date`, `Gender`, `Kg`, `Body Fat %`, …). Only non-null fields
 * overwrite existing values (COALESCE) — empty cells are ignored, matching the
 * editable table's "blank = leave as is" behavior. Throws on missing key/DB.
 */
export async function upsertRow(entry: Record<string, unknown>): Promise<void> {
  if (!sql) throw new Error('db-not-configured');
  const name = String(entry['Nume'] ?? '').trim();
  const date = normDate(String(entry['Date'] ?? ''));
  if (!name || !date) throw new Error('missing-name-or-date');
  const gender = String(entry['Gender'] ?? 'M').toUpperCase() === 'F' ? 'F' : 'M';

  const kg = numOrNull(entry['Kg']);
  const bodyFat = numOrNull(entry['Body Fat %']);
  const visceral = numOrNull(entry['Visceral Fat']);
  const muscle = numOrNull(entry['Muscle']);
  const water = numOrNull(entry['Water']);
  const biceps = numOrNull(entry['Biceps']);
  const spate = numOrNull(entry['Spate']);
  const piept = numOrNull(entry['Piept']);
  const talie = numOrNull(entry['Talie']);
  const fesieri = numOrNull(entry['Fesieri']);

  await sql`
    INSERT INTO measurements
      (name, date, gender, kg, body_fat, visceral_fat, muscle, water,
       biceps, spate, piept, talie, fesieri, updated_at)
    VALUES
      (${name}, ${date}, ${gender}, ${kg}, ${bodyFat}, ${visceral}, ${muscle}, ${water},
       ${biceps}, ${spate}, ${piept}, ${talie}, ${fesieri}, now())
    ON CONFLICT (name, date) DO UPDATE SET
      gender       = EXCLUDED.gender,
      kg           = COALESCE(EXCLUDED.kg,           measurements.kg),
      body_fat     = COALESCE(EXCLUDED.body_fat,     measurements.body_fat),
      visceral_fat = COALESCE(EXCLUDED.visceral_fat, measurements.visceral_fat),
      muscle       = COALESCE(EXCLUDED.muscle,       measurements.muscle),
      water        = COALESCE(EXCLUDED.water,        measurements.water),
      biceps       = COALESCE(EXCLUDED.biceps,       measurements.biceps),
      spate        = COALESCE(EXCLUDED.spate,        measurements.spate),
      piept        = COALESCE(EXCLUDED.piept,        measurements.piept),
      talie        = COALESCE(EXCLUDED.talie,        measurements.talie),
      fesieri      = COALESCE(EXCLUDED.fesieri,      measurements.fesieri),
      updated_at   = now()
  `;
}
