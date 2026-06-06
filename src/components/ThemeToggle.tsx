'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from '@/lib/icons';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

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
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-border/60 text-muted hover:text-primary hover:border-gold/40 text-xs font-medium transition-all"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      {theme === 'dark'
        ? <><Sun  size={13} strokeWidth={1.8} /><span className="hidden sm:inline">Light theme</span></>
        : <><Moon size={13} strokeWidth={1.8} /><span className="hidden sm:inline">Dark theme</span></>
      }
    </button>
  );
}
