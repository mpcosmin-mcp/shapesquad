import { NextResponse } from 'next/server';
import { timingSafeEqual } from '@/lib/logAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Server-side password gate for the /log page.
 *
 * The password lives ONLY in the LOG_PASSWORD env var and is compared here on
 * the server — it never reaches the browser bundle. The client posts the typed
 * password; we answer ok/!ok so the UI can unlock. The real write gate is in
 * /api/submit, which re-checks the same secret on every save.
 *
 * Fail closed: if LOG_PASSWORD is unset, nothing unlocks.
 */
export async function POST(req: Request) {
  const secret = process.env.LOG_PASSWORD;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: 'not-configured' },
      { status: 503 },
    );
  }

  let password = '';
  try {
    const body = await req.json();
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {
    // malformed body → treated as wrong password below
  }

  const ok = timingSafeEqual(password, secret);
  return NextResponse.json({ ok }, { status: ok ? 200 : 401 });
}
