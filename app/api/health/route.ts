import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 *
 * Public unauthenticated health check.
 * ShapeSquad has no AI/Anthropic anymore — env checks are informational only.
 * Returns 200 as long as the endpoint serves. Real failures surface via the
 * homepage smoke + Vercel/uptime monitoring.
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // Informational env presence (none are hard requirements after AI removal)
  const tracked = ["KV_REST_API_URL", "KV_REST_API_TOKEN", "SHEETS_API_URL"];
  for (const name of tracked) {
    checks[`env.${name}`] = {
      ok: Boolean(process.env[name]),
      detail: process.env[name] ? undefined : "not set (informational)",
    };
  }

  return NextResponse.json(
    {
      ok: true,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
      checks,
      ts: new Date().toISOString(),
    },
    { status: 200 },
  );
}
