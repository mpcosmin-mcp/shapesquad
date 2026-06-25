'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getWeekStart, bookingKey } from '@/lib/activities';

type BookingsMap = Record<string, string[]>;

const POLL_MS = 30_000;
const CACHE_KEY = 'shapesquad:bookings';

function loadCache(): BookingsMap {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveCache(b: BookingsMap) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(b));
  } catch {}
}

/**
 * Activity-booking state.
 *
 * Source of truth is the Upstash KV-backed /api/activities (shared across the
 * whole squad). When KV is unavailable (local dev — the prod KV creds are
 * "sensitive" and can't be pulled), the API returns 503 and we fall back to a
 * localStorage cache so booking still works visibly on a single device.
 *
 * Same optimistic + cache pattern as the social layer.
 */
export function useActivities() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [bookings, setBookings] = useState<BookingsMap>({});
  const [loading, setLoading] = useState(true);
  const [kvLive, setKvLive] = useState(true);
  const mountedRef = useRef(true);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch('/api/activities');
      if (res.ok) {
        const data = await res.json();
        const next = (data.bookings ?? {}) as BookingsMap;
        if (mountedRef.current) {
          setKvLive(true);
          setBookings(next);
          saveCache(next);
        }
      } else if (res.status === 503) {
        // KV down — keep the localStorage cache as our view
        if (mountedRef.current) setKvLive(false);
      }
    } catch {
      if (mountedRef.current) setKvLive(false);
    }
    if (mountedRef.current) setLoading(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    // Paint cached bookings instantly, then reconcile with the server.
    setBookings(loadCache());
    fetchBookings();
    const id = setInterval(fetchBookings, POLL_MS);
    return () => { mountedRef.current = false; clearInterval(id); };
  }, [fetchBookings]);

  const toggleBooking = useCallback(async (activityId: string, date: string, user: string) => {
    const key = bookingKey(activityId, date);
    const current = bookings[key] ?? [];
    const isBooked = current.includes(user);
    const action = isBooked ? 'unbook' : 'book';

    // Optimistic update + cache immediately so it sticks even offline.
    const optimistic = isBooked
      ? current.filter((n) => n !== user)
      : [...current, user];
    setBookings((prev) => {
      const next = { ...prev, [key]: optimistic };
      saveCache(next);
      return next;
    });

    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId, date, user, action }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.names) {
          setBookings((prev) => {
            const next = { ...prev, [key]: data.names };
            saveCache(next);
            return next;
          });
        }
      } else if (res.status === 409) {
        // Class is full (someone took the last spot) — roll back.
        setBookings((prev) => {
          const next = { ...prev, [key]: current };
          saveCache(next);
          return next;
        });
      }
      // 503 (KV down): keep the optimistic value — localStorage is our store.
    } catch {
      // Network error: keep the optimistic value cached.
    }
  }, [bookings]);

  const getNames = useCallback((activityId: string, date: string): string[] => {
    return bookings[bookingKey(activityId, date)] ?? [];
  }, [bookings]);

  return { weekStart, setWeekStart, bookings, loading, kvLive, toggleBooking, getNames, refresh: fetchBookings };
}
