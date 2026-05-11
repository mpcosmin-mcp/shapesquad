'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/useTheme';

export default function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="btn btn-ghost btn-icon"
      aria-label={theme === 'light' ? 'Trecere la dark mode' : 'Trecere la light mode'}
      title={theme === 'light' ? 'Dark mode' : 'Light mode'}
    >
      {mounted ? (
        theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />
      ) : (
        <Sun className="w-4 h-4 opacity-0" />
      )}
    </button>
  );
}
