'use client';

import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'shapesquad_theme';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return document.documentElement.classList.contains('light') ? 'light' : 'dark';
}

function applyTheme(t: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('light', t === 'light');
  try {
    localStorage.setItem(STORAGE_KEY, t);
  } catch {}
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  // Sync from DOM on mount
  useEffect(() => {
    setTheme(getInitialTheme());
    setMounted(true);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    applyTheme(next);
  }

  function setExplicit(t: Theme) {
    setTheme(t);
    applyTheme(t);
  }

  return { theme, toggleTheme, setTheme: setExplicit, mounted };
}
