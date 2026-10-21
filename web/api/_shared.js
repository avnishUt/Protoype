// Files starting with "_" in /api are helpers, not deployed as endpoints.
import { timingSafeEqual } from 'node:crypto';

/** Optional access code (DEMO_PASSWORD), sent by the page as `x-demo-key`. */
export function authorized(req) {
  const expected = process.env.DEMO_PASSWORD;
  if (!expected) return true;
  const given = Buffer.from(String(req.headers['x-demo-key'] ?? ''));
  const want = Buffer.from(expected);
  return given.length === want.length && timingSafeEqual(given, want);
}

// Best-effort per-instance limit; serverless instances don't share memory,
// so this slows abuse rather than guaranteeing a cap.
const hits = new Map();
export function rateLimited(req, perMinute = Number(process.env.RATE_LIMIT_PER_MIN || 20)) {
  const ip = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > perMinute;
}
