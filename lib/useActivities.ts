'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getWeekStart, bookingKey } from '@/lib/activities';

type BookingsMap = Record<string, string[]>;

const POLL_MS = 30_000;

export function useActivities() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [bookings, setBookings] = useState<BookingsMap>({});
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch('/api/activities');
      if (res.ok) {
        const data = await res.json();
        if (mountedRef.current) setBookings(data.bookings ?? {});
      }
    } catch {}
    if (mountedRef.current) setLoading(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchBookings();
    const id = setInterval(fetchBookings, POLL_MS);
    return () => { mountedRef.current = false; clearInterval(id); };
  }, [fetchBookings]);

  const toggleBooking = useCallback(async (activityId: string, date: string, user: string) => {
    const key = bookingKey(activityId, date);
    const current = bookings[key] ?? [];
    const isBooked = current.includes(user);
    const action = isBooked ? 'unbook' : 'book';

    // optimistic
    const optimistic = isBooked
      ? current.filter((n) => n !== user)
      : [...current, user];
    setBookings((prev) => ({ ...prev, [key]: optimistic }));

    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId, date, user, action }),
      });
      const data = await res.json();
      if (data.names) {
        setBookings((prev) => ({ ...prev, [key]: data.names }));
      } else if (!res.ok) {
        // rollback
        setBookings((prev) => ({ ...prev, [key]: current }));
      }
    } catch {
      setBookings((prev) => ({ ...prev, [key]: current }));
    }
  }, [bookings]);

  const getNames = useCallback((activityId: string, date: string): string[] => {
    return bookings[bookingKey(activityId, date)] ?? [];
  }, [bookings]);

  return { weekStart, setWeekStart, bookings, loading, toggleBooking, getNames, refresh: fetchBookings };
}
