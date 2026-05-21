'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from '@/lib/icons';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Sync initial state from what the anti-flash script already applied
  useEffect(() => {
    const applied = document.documentElement.getAttribute('data-theme') as 'dark' | 'light' | null;
    if (applied) setTheme(applied);
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('robu-theme', next); } catch {}
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center justify-center w-8 h-8 rounded-lg border border-border/60 text-muted hover:text-primary hover:border-gold/40 transition-all"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      {theme === 'dark'
        ? <Sun  size={15} strokeWidth={1.8} />
        : <Moon size={15} strokeWidth={1.8} />
      }
    </button>
  );
}
