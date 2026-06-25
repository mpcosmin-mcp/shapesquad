import { NextRequest, NextResponse } from 'next/server';
import { kvReady, getAllBookings, getBooking, setBooking } from '@/lib/activities-store';
import { ARIA_SCHEDULE, bookingKey } from '@/lib/activities';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function unavailable() {
  return NextResponse.json({ error: 'kv-unavailable', bookings: {} }, { status: 503 });
}

export async function GET() {
  if (!kvReady()) return unavailable();
  try {
    const bookings = await getAllBookings();
    return NextResponse.json({ bookings });
  } catch (err) {
    console.error('[/api/activities] GET error', err);
    return unavailable();
  }
}

export async function POST(req: NextRequest) {
  if (!kvReady()) return unavailable();
  try {
    const body = await req.json() as {
      activityId?: string;
      date?: string;
      user?: string;
      action?: 'book' | 'unbook';
    };
    const { activityId, date, user, action } = body;

    if (!activityId || !date || !user || !action) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 });
    }

    const activity = ARIA_SCHEDULE.find((a) => a.id === activityId);
    if (!activity) {
      return NextResponse.json({ error: 'unknown activity' }, { status: 400 });
    }

    const key = bookingKey(activityId, date);
    const current = await getBooking(key);

    if (action === 'book') {
      if (current.includes(user)) {
        return NextResponse.json({ key, names: current });
      }
      if (current.length >= activity.capacity) {
        return NextResponse.json({ error: 'full', key, names: current }, { status: 409 });
      }
      const next = [...current, user];
      await setBooking(key, next);
      return NextResponse.json({ key, names: next });
    }

    // unbook
    const next = current.filter((n) => n !== user);
    await setBooking(key, next);
    return NextResponse.json({ key, names: next });
  } catch (err) {
    console.error('[/api/activities] POST error', err);
    return unavailable();
  }
}
