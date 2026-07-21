import { NextResponse } from 'next/server';
import { timingSafeEqual } from '@/lib/logAuth';
import { dbReady, ensureSchema, upsertRow } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * One-time import: read the existing Google Sheet (via the legacy Apps Script
 * doGet) and upsert every row into Neon Postgres. Idempotent — safe to re-run,
 * since upsertRow keys on (name, date).
 *
 * Password-gated (LOG_PASSWORD). Runs on Vercel, which can reach Google
 * (unlike the sandbox). After a successful migration the Sheet is no longer
 * used by the app — keep it as a cold backup or delete it.
 */
const LEGACY_SHEET_URL =
  'https://script.google.com/macros/s/AKfycbxqEkxY93XwuKtu1daSqSj_4EsILuaLGVJzoLpPEaBIKcqsLIcgSoCzk5_VeTsDNOAg/exec';

export async function POST(req: Request) {
  const secret = process.env.LOG_PASSWORD;
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'LOG_PASSWORD unset' }, { status: 503 });
  }

  let password = '';
  try {
    const body = await req.json();
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {}

  if (!timingSafeEqual(password, secret)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!dbReady()) {
    return NextResponse.json(
      { ok: false, error: 'DB not configured (DATABASE_URL unset)' },
      { status: 503 },
    );
  }

  try {
    await ensureSchema();

    const res = await fetch(LEGACY_SHEET_URL, { redirect: 'follow' });
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Sheet fetch returned ${res.status}` },
        { status: 502 },
      );
    }
    const rows = parseSheet(await res.text());
    if (!rows) {
      return NextResponse.json(
        { ok: false, error: 'Could not parse Sheet response' },
        { status: 502 },
      );
    }

    let migrated = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        await upsertRow(row as Record<string, unknown>);
        migrated += 1;
      } catch {
        failed += 1;
      }
    }

    return NextResponse.json({ ok: true, total: rows.length, migrated, failed });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Migration failed' },
      { status: 502 },
    );
  }
}

/** Parse the Apps Script response (plain JSON or JSONP) into a rows array. */
function parseSheet(text: string): Record<string, unknown>[] | null {
  const trimmed = text.trim();
  const tryJson = (s: string): any | null => {
    try { return JSON.parse(s); } catch { return null; }
  };
  let parsed: any = null;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) parsed = tryJson(trimmed);
  if (!parsed) {
    const m = trimmed.match(/^[\w$]+\((.+)\);?\s*$/s); // cb({...});
    if (m) parsed = tryJson(m[1]);
  }
  if (!parsed) return null;
  const data = Array.isArray(parsed) ? parsed : parsed.data;
  return Array.isArray(data) ? data : null;
}
