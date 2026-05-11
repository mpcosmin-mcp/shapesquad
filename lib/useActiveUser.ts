'use client';

import { useEffect, useState, useCallback } from 'react';

const ACTIVE_USER_KEY = 'shapesquad_active_user';
const ADMIN_NAMES = ['Petrica', 'Cosmin']; // admins (case-sensitive)
const USER_CHANGE_EVENT = 'shapesquad:user-change';

export function useActiveUser() {
  const [activeUser, setActiveUserState] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      setActiveUserState(localStorage.getItem(ACTIVE_USER_KEY) || '');
    } catch {}
    setMounted(true);

    // Sync across hook instances in same tab (custom event)
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setActiveUserState(detail || '');
    };
    // Sync across tabs (native storage event)
    const onStorage = (e: StorageEvent) => {
      if (e.key === ACTIVE_USER_KEY) setActiveUserState(e.newValue || '');
    };
    window.addEventListener(USER_CHANGE_EVENT, onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(USER_CHANGE_EVENT, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const setActiveUser = useCallback((name: string) => {
    try {
      if (name) localStorage.setItem(ACTIVE_USER_KEY, name);
      else localStorage.removeItem(ACTIVE_USER_KEY);
    } catch {}
    setActiveUserState(name);
    // Notify all other hook instances in the same tab
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(USER_CHANGE_EVENT, { detail: name }));
    }
  }, []);

  const isAdmin = activeUser && ADMIN_NAMES.includes(activeUser);

  return { activeUser, setActiveUser, mounted, isAdmin };
}
