import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 *
 * Public unauthenticated health check.
 * Returns 200 with `ok: true` when required env present and AI is reachable.
 * Returns 503 otherwise — uptime monitors alert on this.
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};
  let allOk = true;

  // 1. Required env vars (Anthropic key for AI coach)
  const required = ["ANTHROPIC_API_KEY"];
  for (const name of required) {
    const present = Boolean(process.env[name]);
    checks[`env.${name}`] = { ok: present };
    if (!present) allOk = false;
  }

  // Optional env vars
  const optional = ["KV_REST_API_URL", "KV_REST_API_TOKEN", "SHEETS_API_URL"];
  for (const name of optional) {
    checks[`env.${name}`] = {
      ok: Boolean(process.env[name]),
      detail: process.env[name] ? undefined : "optional",
    };
  }

  // 2. Anthropic API reachable (HEAD on the docs endpoint won't burn tokens)
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const t0 = Date.now();
      // Anthropic's API doesn't expose a /health, but the messages endpoint
      // returns 405 for HEAD — that's enough to confirm DNS + TLS work.
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });
      const latencyMs = Date.now() - t0;
      checks["anthropic.reachable"] = {
        ok: res.status < 500,
        detail: `HTTP ${res.status} (${latencyMs}ms)`,
      };
      if (res.status >= 500) allOk = false;
    } catch (err) {
      checks["anthropic.reachable"] = {
        ok: false,
        detail: err instanceof Error ? err.message : "unknown error",
      };
      allOk = false;
    }
  }

  return NextResponse.json(
    {
      ok: allOk,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
      checks,
      ts: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 },
  );
}
