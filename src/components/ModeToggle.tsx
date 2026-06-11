'use client';

import { useEffect, useState } from 'react';

type ViewMode = 'simple' | 'analyst';

/**
 * Simple / Analyst mode toggle.
 * Works exactly like the theme toggle: sets data-mode on <html>, persisted in
 * localStorage. CSS in globals.css hides `.analyst-only` elements in Simple
 * mode and `.simple-only` elements in Analyst mode.
 *
 * Simple  → plain-English explanations, formulas hidden
 * Analyst → formulas, σ, weights and breakdowns visible
 */
export default function ModeToggle() {
  const [mode, setMode] = useState<ViewMode>('simple');

  useEffect(() => {
    const applied = document.documentElement.getAttribute('data-mode') as ViewMode | null;
    if (applied) setMode(applied);
  }, []);

  function toggle() {
    const next: ViewMode = mode === 'simple' ? 'analyst' : 'simple';
    setMode(next);
    document.documentElement.setAttribute('data-mode', next);
    try { localStorage.setItem('robu-mode', next); } catch {}
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-border/60 text-muted hover:text-primary hover:border-gold/40 text-xs font-medium transition-all"
      aria-label={mode === 'simple' ? 'Switch to analyst mode' : 'Switch to simple mode'}
      title={mode === 'simple' ? 'Show formulas and technical detail' : 'Hide formulas — plain English only'}
    >
      <span className="font-mono text-[11px]">{mode === 'simple' ? 'ƒ' : 'Aa'}</span>
      <span className="hidden sm:inline">{mode === 'simple' ? 'Analyst mode' : 'Simple mode'}</span>
    </button>
  );
}
