/**
 * Server-side helpers for the log password gate.
 * Kept out of the route files so it can be shared without Next.js rejecting
 * a non-handler export from a route module.
 */

/** Constant-time-ish string compare — avoids leaking length via early exit. */
export function timingSafeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
