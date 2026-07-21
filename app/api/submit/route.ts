import { NextResponse } from 'next/server';
import { timingSafeEqual } from '@/lib/logAuth';
import { dbReady, ensureSchema, upsertRow } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Write one measurement row into Neon Postgres (upsert by name + date).
 *
 * Security gate: every write must carry the correct `password`, verified here
 * against LOG_PASSWORD (server-only) and stripped before it touches the DB.
 * Bypassing the client UI is useless without the secret — this is the real gate.
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
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!dbReady()) {
      return NextResponse.json(
        { ok: false, error: 'DB not configured (DATABASE_URL unset)' },
        { status: 503 },
      );
    }

    await ensureSchema();
    await upsertRow(entry);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Unknown error' },
      { status: 502 },
    );
  }
}
