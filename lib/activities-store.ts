import { redis, kvReady } from '@/lib/social-store';

const BOOKINGS_KEY = 'activities:bookings';

export { kvReady };

export async function getAllBookings(): Promise<Record<string, string[]>> {
  if (!redis) return {};
  const all = await redis.hgetall<Record<string, unknown>>(BOOKINGS_KEY);
  const out: Record<string, string[]> = {};
  if (all) {
    for (const [k, v] of Object.entries(all)) {
      out[k] = decodeNames(v);
    }
  }
  return out;
}

export async function getBooking(field: string): Promise<string[]> {
  if (!redis) return [];
  return decodeNames(await redis.hget(BOOKINGS_KEY, field));
}

export async function setBooking(field: string, names: string[]): Promise<void> {
  if (!redis) return;
  if (names.length === 0) {
    await redis.hdel(BOOKINGS_KEY, field);
  } else {
    await redis.hset(BOOKINGS_KEY, { [field]: JSON.stringify(names) });
  }
}

function decodeNames(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch { return []; }
  }
  return [];
}
