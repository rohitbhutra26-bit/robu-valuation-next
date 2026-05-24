'use client';

import { useEffect, useState } from 'react';
import { getWatchlist, removeFromWatchlist, WatchlistEntry } from '@/lib/watchlist';
import { Bookmark, AlertCircle, X, Clock } from '@/lib/icons';

interface WatchlistViewProps {
  onSelectSymbol: (symbol: string) => void;
  currentSymbol?: string;
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)   return 'just now';
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 7)   return `${days}d ago`;
  return new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function WatchlistView({ onSelectSymbol, currentSymbol }: WatchlistViewProps) {
  const [list, setList] = useState<WatchlistEntry[]>([]);

  // Sync with localStorage on mount + whenever watchlist changes
  useEffect(() => {
    setList(getWatchlist());
    const handler = () => setList(getWatchlist());
    window.addEventListener('robu_watchlist_change', handler);
    return () => window.removeEventListener('robu_watchlist_change', handler);
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">

      {/* ── Page title ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
          <Bookmark size={15} className="text-gold" />
        </div>
        <div>
          <h2 className="text-base font-bold text-primary">Watchlist</h2>
          <p className="text-[11px] text-muted">
            {list.length === 0 ? 'No stocks saved yet' : `${list.length} stock${list.length > 1 ? 's' : ''} saved`}
          </p>
        </div>
      </div>

      {/* ── localStorage warning banner ─────────────────────────────────── */}
      <div className="flex gap-3 p-3.5 mb-5 bg-gold/5 border border-gold/20 rounded-xl">
        <AlertCircle size={15} className="text-gold flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-gold mb-0.5">Saved on this browser only</p>
          <p className="text-[11px] text-muted leading-relaxed">
            Your watchlist is stored locally on this device and browser.
            It will disappear if you clear browser data, use a different browser,
            or open Robu Terminal on another device. No account needed — but no sync either.
          </p>
        </div>
      </div>

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      {list.length === 0 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-border/60 flex items-center justify-center mx-auto mb-4">
            <Bookmark size={22} className="text-muted/40" />
          </div>
          <p className="text-sm font-medium text-primary mb-1">Nothing saved yet</p>
          <p className="text-xs text-muted max-w-xs mx-auto leading-relaxed">
            Search any stock and click the bookmark icon on its profile to save it here for quick access.
          </p>
        </div>
      )}

      {/* ── Watchlist entries ────────────────────────────────────────────── */}
      {list.length > 0 && (
        <div className="space-y-2">
          {list.map((entry) => {
            const isActive = entry.symbol === currentSymbol;
            return (
              <div
                key={entry.symbol}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-gold/8 border-gold/25'
                    : 'bg-card border-border hover:border-gold/20 hover:bg-gold/5'
                }`}
                onClick={() => onSelectSymbol(entry.symbol)}
              >
                {/* Symbol chip */}
                <span className="text-[11px] font-mono font-bold px-2 py-1 bg-gold/10 text-gold border border-gold/25 rounded-lg flex-shrink-0 min-w-[52px] text-center">
                  {entry.symbol}
                </span>

                {/* Name + sector */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary truncate leading-tight">
                    {entry.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {entry.sector && (
                      <span className="text-[10px] text-muted bg-border/50 px-1.5 py-0.5 rounded truncate max-w-[140px]">
                        {entry.sector}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[10px] text-muted/60">
                      <Clock size={9} />
                      {timeAgo(entry.addedAt)}
                    </span>
                  </div>
                </div>

                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromWatchlist(entry.symbol);
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted/40 hover:text-loss hover:bg-loss/10 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                  title="Remove from watchlist"
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
