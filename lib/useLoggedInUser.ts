'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * Logged-in identity — WHO YOU ARE (the liker / commenter).
 *
 * Distinct from `useActiveUser`, which is WHO YOU'RE VIEWING (switchable via
 * the SquadBar). You log in once; browsing other people's progress never
 * changes your identity, so likes/comments are always attributed to you.
 */
const LOGGED_IN_KEY = 'shapesquad_logged_in_user';
const LOGIN_CHANGE_EVENT = 'shapesquad:login-change';

export function useLoggedInUser() {
  const [loggedInUser, setLoggedInState] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      setLoggedInState(localStorage.getItem(LOGGED_IN_KEY) || '');
    } catch {}
    setMounted(true);

    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setLoggedInState(detail || '');
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOGGED_IN_KEY) setLoggedInState(e.newValue || '');
    };
    window.addEventListener(LOGIN_CHANGE_EVENT, onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(LOGIN_CHANGE_EVENT, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const setLoggedInUser = useCallback((name: string) => {
    try {
      if (name) localStorage.setItem(LOGGED_IN_KEY, name);
      else localStorage.removeItem(LOGGED_IN_KEY);
    } catch {}
    setLoggedInState(name);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(LOGIN_CHANGE_EVENT, { detail: name }));
    }
  }, []);

  const logout = useCallback(() => setLoggedInUser(''), [setLoggedInUser]);

  return { loggedInUser, setLoggedInUser, logout, mounted };
}
