'use client';

import { useEffect, useState } from 'react';
import { Entry, Person, fetchAllData, groupByPerson } from './shape';

interface ShapeData {
  loading: boolean;
  error: string | null;
  entries: Entry[];
  people: Person[];
  refresh: () => Promise<void>;
}

export function useShapeData(): ShapeData {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllData();
      setEntries(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return {
    loading,
    error,
    entries,
    people: groupByPerson(entries),
    refresh: load,
  };
}
