'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Entry, Person, fetchAllData, groupByPerson, isDemoData } from './shape';

/**
 * Module-level cache shared across ALL hook instances + tabs.
 *
 * Strategy:
 *  - First mount: hydrate from localStorage instantly (no flicker)
 *  - Background fetch refreshes the data
 *  - All subsequent hook instances reuse the in-memory cache
 *  - Cross-tab sync via the storage event
 *  - refresh() forces a fresh fetch (used by /log after submit)
 *
 * Cache TTL: 5 min in-memory, 24h localStorage fallback.
 */

// v2 introduces /api/data server route + DEMO_DATA pollution guard.
// Bump on any breaking change to the cached shape or fetch behavior.
const LS_KEY = 'shapesquad_entries_v2';
const OLD_LS_KEYS = ['shapesquad_entries_v1']; // legacy keys to clean
const CACHE_TTL = 5 * 60 * 1000; // 5 min — refresh in background after this
const LS_MAX_AGE = 24 * 60 * 60 * 1000; // 24h — discard cache older than this

interface CacheState {
  entries: Entry[];
  fetchedAt: number;
}

let memoryCache: CacheState | null = null;
let inflight: Promise<Entry[]> | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

function loadFromStorage(): CacheState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheState;
    if (!parsed?.entries || !parsed?.fetchedAt) return null;
    if (Date.now() - parsed.fetchedAt > LS_MAX_AGE) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveToStorage(state: CacheState) {
  if (typeof window === 'undefined') return;
  // Refuse to persist the DEMO_DATA fallback — that's how stale "Adina+Cosmin
  // only" caches happen in the wild when the network is slow.
  if (isDemoData(state.entries)) return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}

function cleanLegacyStorage() {
  if (typeof window === 'undefined') return;
  for (const key of OLD_LS_KEYS) {
    try { localStorage.removeItem(key); } catch {}
  }
}

function isStale(): boolean {
  return !memoryCache || Date.now() - memoryCache.fetchedAt > CACHE_TTL;
}

/** Initiate (or reuse) a network fetch, deduped across all callers. */
function ensureFetch(force = false): Promise<Entry[]> {
  if (!force && memoryCache && !isStale()) {
    return Promise.resolve(memoryCache.entries);
  }
  if (inflight && !force) return inflight;
  inflight = fetchAllData()
    .then((entries) => {
      memoryCache = { entries, fetchedAt: Date.now() };
      saveToStorage(memoryCache);
      notify();
      return entries;
    })
    .catch((err) => {
      throw err;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

// Init: hydrate memory from localStorage on first import (runs once per page load)
if (typeof window !== 'undefined' && !memoryCache) {
  cleanLegacyStorage();
  memoryCache = loadFromStorage();
  // Belt + suspenders: if a previous build cached demo data under the new key,
  // throw it out so the next fetch refreshes.
  if (memoryCache && isDemoData(memoryCache.entries)) {
    memoryCache = null;
    try { localStorage.removeItem(LS_KEY); } catch {}
  }
}

interface ShapeData {
  loading: boolean;
  error: string | null;
  entries: Entry[];
  people: Person[];
  refresh: () => Promise<void>;
}

export function useShapeData(): ShapeData {
  const [, force] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // First render gets cached data instantly (no loading flicker if cache exists)
  const cached = memoryCache;
  const entries = cached?.entries ?? [];
  const loading = !cached;

  useEffect(() => {
    // Subscribe to module-level cache updates
    const onUpdate = () => force((n) => n + 1);
    listeners.add(onUpdate);

    // Cross-tab: storage event fires when another tab writes
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as CacheState;
          memoryCache = parsed;
          force((n) => n + 1);
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);

    // Kick off fetch if we don't have data or it's stale
    if (!memoryCache || isStale()) {
      ensureFetch().catch((e) => setError(e?.message || 'Failed to load data'));
    }

    return () => {
      listeners.delete(onUpdate);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const people = useMemo(() => groupByPerson(entries), [entries]);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      await ensureFetch(true);
    } catch (e: any) {
      setError(e?.message || 'Failed to refresh');
    }
  }, []);

  return {
    loading,
    error,
    entries,
    people,
    refresh,
  };
}

/** Drop the cache. Useful when the user logs a new measurement. */
export function invalidateShapeData() {
  memoryCache = null;
  try {
    if (typeof window !== 'undefined') localStorage.removeItem(LS_KEY);
  } catch {}
}
