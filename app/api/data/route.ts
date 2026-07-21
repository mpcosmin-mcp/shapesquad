import { NextResponse } from 'next/server';
import { dbReady, ensureSchema, getAllRows } from '@/lib/db';

export const runtime = 'nodejs';
// Always dynamic — never prerendered at build time. CDN caching comes from the
// Cache-Control header below.
export const dynamic = 'force-dynamic';

/**
 * Read all measurements from Neon Postgres.
 *
 * Returns { data: [ { Nume, Date, Gender, Kg, "Body Fat %", ... } ] } — the same
 * shape the old Sheets backend returned, so parseRows() in lib/shape.ts is
 * unchanged. 503 when the DB isn't configured (client falls back to DEMO_DATA).
 */
export async function GET() {
  if (!dbReady()) {
    return NextResponse.json(
      { error: 'db-not-configured', data: [] },
      { status: 503 },
    );
  }
  try {
    await ensureSchema();
    const data = await getAllRows();
    return NextResponse.json(
      { data },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'db-error', data: [] },
      { status: 502 },
    );
  }
}
