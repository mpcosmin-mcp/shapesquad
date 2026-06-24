import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
// Always dynamic — never prerendered at build time, so a slow Apps Script call can't
// time out the production build (the prerender would call Sheets and fail past 60s).
// CDN caching still comes from the Cache-Control header set in the GET response below.
export const dynamic = 'force-dynamic';

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxqEkxY93XwuKtu1daSqSj_4EsILuaLGVJzoLpPEaBIKcqsLIcgSoCzk5_VeTsDNOAg/exec';

/**
 * Server-side fetch of the Google Apps Script Web App.
 *
 * The script returns either:
 *  - Pure JSON ({"data":[...]}) when called without a `callback` param
 *  - JSONP wrapper (foo({"data":[...]});) when called with `?callback=foo`
 *
 * We try plain JSON first, fall back to JSONP unwrap.
 *
 * No 8s artificial timeout — Apps Script can take 5-15s on cold start.
 * Vercel function timeout (30s default for hobby) gives us headroom.
 */
export async function GET() {
  try {
    // First try: plain JSON request
    const res = await fetch(APPS_SCRIPT_URL, {
      redirect: 'follow',
      // We want fresh data periodically; rely on Next's revalidate above
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Apps Script returned ${res.status}` },
        { status: 502 }
      );
    }

    const text = await res.text();
    const parsed = parseAppsScriptResponse(text);
    if (parsed) {
      return NextResponse.json(parsed, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      });
    }

    // Fallback: try JSONP variant with a callback param
    const cbName = `__ss_${Math.floor(Math.random() * 1e9)}`;
    const res2 = await fetch(`${APPS_SCRIPT_URL}?callback=${cbName}`, {
      redirect: 'follow',
      next: { revalidate: 60 },
    });
    if (!res2.ok) {
      return NextResponse.json(
        { error: `Apps Script (JSONP fallback) returned ${res2.status}` },
        { status: 502 }
      );
    }
    const text2 = await res2.text();
    const parsed2 = parseAppsScriptResponse(text2);
    if (parsed2) {
      return NextResponse.json(parsed2, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      });
    }

    return NextResponse.json(
      {
        error: 'Cannot parse Apps Script response',
        preview: text.slice(0, 200),
      },
      { status: 502 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Unknown fetch error' },
      { status: 502 }
    );
  }
}

function parseAppsScriptResponse(text: string): any | null {
  const trimmed = text.trim();
  // Try plain JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch {}
  }
  // Try JSONP unwrap: cbName({...}); or cbName([...]);
  const m = trimmed.match(/^[\w$]+\((.+)\);?\s*$/s);
  if (m) {
    try {
      return JSON.parse(m[1]);
    } catch {}
  }
  return null;
}
