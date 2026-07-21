import { NextResponse } from 'next/server';
import { timingSafeEqual } from '@/lib/logAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxqEkxY93XwuKtu1daSqSj_4EsILuaLGVJzoLpPEaBIKcqsLIcgSoCzk5_VeTsDNOAg/exec';

/**
 * Write proxy → Google Apps Script `doPost`.
 *
 * Security gate: every write must carry the correct `password`, verified here
 * against LOG_PASSWORD (server-only). The password is stripped from the payload
 * before it reaches Apps Script, so it never lands in the Sheet. Bypassing the
 * client UI is useless without the secret — this is the real gate, not the UI.
 *
 * `redirect: 'follow'` preserves the POST body across Apps Script's 302 (the
 * old no-cors path converted POST→GET and dropped the body — see EOD.md).
 */
export async function POST(req: Request) {
  try {
    const secret = process.env.LOG_PASSWORD;
    if (!secret) {
      return NextResponse.json(
        { ok: false, error: 'Logging not configured (LOG_PASSWORD unset)' },
        { status: 503 },
      );
    }

    const body = await req.json();
    const { password, ...entry } = body ?? {};

    if (typeof password !== 'string' || !timingSafeEqual(password, secret)) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });

    const text = await res.text();
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch {}

    return NextResponse.json(
      { ok: res.ok, status: res.status, body: parsed ?? text },
      { status: res.ok ? 200 : 502 },
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Unknown error' },
      { status: 502 },
    );
  }
}
