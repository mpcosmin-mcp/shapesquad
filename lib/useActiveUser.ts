'use client';

import { useEffect, useState, useCallback } from 'react';

const ACTIVE_USER_KEY = 'shapesquad_active_user';
const ADMIN_NAMES = ['Petrica']; // admins (case-sensitive). Add others here.

export function useActiveUser() {
  const [activeUser, setActiveUserState] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ACTIVE_USER_KEY) || '';
      setActiveUserState(stored);
    } catch {}
    setMounted(true);

    // Sync across tabs
    const onStorage = (e: StorageEvent) => {
      if (e.key === ACTIVE_USER_KEY) {
        setActiveUserState(e.newValue || '');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setActiveUser = useCallback((name: string) => {
    try {
      if (name) localStorage.setItem(ACTIVE_USER_KEY, name);
      else localStorage.removeItem(ACTIVE_USER_KEY);
    } catch {}
    setActiveUserState(name);
  }, []);

  const isAdmin = activeUser && ADMIN_NAMES.includes(activeUser);

  return { activeUser, setActiveUser, mounted, isAdmin };
}
