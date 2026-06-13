/**
 * watchlist.ts — localStorage-based watchlist for Robu.
 * No accounts, no backend. Saved per browser per device.
 */

const STORAGE_KEY = 'robu_watchlist_v1';

export interface WatchlistEntry {
  symbol:  string;
  name:    string;
  sector:  string;
  addedAt: number; // unix ms
}

// ── Read ─────────────────────────────────────────────────────────────────────

export function getWatchlist(): WatchlistEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isInWatchlist(symbol: string): boolean {
  return getWatchlist().some(e => e.symbol === symbol.toUpperCase());
}

// ── Write ────────────────────────────────────────────────────────────────────

export function addToWatchlist(entry: Omit<WatchlistEntry, 'addedAt'>): void {
  const list = getWatchlist();
  const sym  = entry.symbol.toUpperCase();
  if (list.some(e => e.symbol === sym)) return; // already saved
  const updated = [{ ...entry, symbol: sym, addedAt: Date.now() }, ...list];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('robu_watchlist_change'));
}

export function removeFromWatchlist(symbol: string): void {
  const sym     = symbol.toUpperCase();
  const updated = getWatchlist().filter(e => e.symbol !== sym);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('robu_watchlist_change'));
}

export function toggleWatchlist(entry: Omit<WatchlistEntry, 'addedAt'>): boolean {
  if (isInWatchlist(entry.symbol)) {
    removeFromWatchlist(entry.symbol);
    return false; // now removed
  } else {
    addToWatchlist(entry);
    return true;  // now added
  }
}
