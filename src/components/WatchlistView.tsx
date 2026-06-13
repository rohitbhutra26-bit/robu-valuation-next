'use client';

import { useEffect, useState, useCallback } from 'react';
import { getWatchlist, removeFromWatchlist, WatchlistEntry } from '@/lib/watchlist';
import { Bookmark, X, Clock, RefreshCw, AlertCircle } from '@/lib/icons';

interface WatchlistViewProps {
  onSelectSymbol: (symbol: string) => void;
  currentSymbol?: string;
}

interface LiveQuote {
  price: number;
  changePct: number | null;
  pe: number | null;
  marketCap: number;
  fairValue: number | null;
  upside: number | null;
  loading: boolean;
  error: boolean;
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

function fmtCap(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L Cr`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(0)}K Cr`;
  return `₹${n.toLocaleString('en-IN')} Cr`;
}

export default function WatchlistView({ onSelectSymbol, currentSymbol }: WatchlistViewProps) {
  const [list, setList] = useState<WatchlistEntry[]>([]);
  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setList(getWatchlist());
    const handler = () => setList(getWatchlist());
    window.addEventListener('robu_watchlist_change', handler);
    return () => window.removeEventListener('robu_watchlist_change', handler);
  }, []);

  const fetchQuotes = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) return;
    setRefreshing(true);

    // Mark all as loading
    setQuotes(prev => {
      const next = { ...prev };
      for (const sym of symbols) {
        next[sym] = { price: 0, changePct: null, pe: null, marketCap: 0, fairValue: null, upside: null, loading: true, error: false };
      }
      return next;
    });

    // Fetch in parallel — /price gives the LIVE quote + day change (near real-time),
    // company-v2 supplies PE + market cap. Price never comes from a stale payload.
    await Promise.allSettled(
      symbols.map(async (sym) => {
        try {
          const [priceRes, compRes] = await Promise.allSettled([
            fetch(`/api/price/${sym}`, { cache: 'no-store' }),
            fetch(`/api/company-v2/${sym}`),
          ]);
          const pj = priceRes.status === 'fulfilled' && priceRes.value.ok ? await priceRes.value.json() : null;
          const d  = compRes.status  === 'fulfilled' && compRes.value.ok  ? await compRes.value.json()  : null;
          if (!pj && !d) throw new Error('failed');
          const price = parseFloat(pj?.price ?? d?.currentPrice ?? 0);
          setQuotes(prev => ({
            ...prev,
            [sym]: {
              price,
              changePct: pj?.changePct != null ? parseFloat(pj.changePct) : (d?.changePercent != null ? parseFloat(d.changePercent) : null),
              pe:        d?.pe ? parseFloat(d.pe) : null,
              marketCap: parseFloat(d?.marketCap || 0),
              fairValue: null,
              upside:    null,
              loading:   false,
              error:     price <= 0,
            },
          }));
        } catch {
          setQuotes(prev => ({
            ...prev,
            [sym]: { price: 0, changePct: null, pe: null, marketCap: 0, fairValue: null, upside: null, loading: false, error: true },
          }));
        }
      })
    );
    setRefreshing(false);
  }, []);

  // Fetch when list changes
  useEffect(() => {
    if (list.length > 0) {
      fetchQuotes(list.map(e => e.symbol));
    }
  }, [list, fetchQuotes]);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
            <Bookmark size={15} className="text-gold" />
          </div>
          <div>
            <h2 className="text-base font-bold text-primary">Watchlist</h2>
            <p className="text-[11px] text-muted">
              {list.length === 0 ? 'No stocks saved yet' : `${list.length} stock${list.length !== 1 ? 's' : ''} · tap to analyse`}
            </p>
          </div>
        </div>
        {list.length > 0 && (
          <button
            onClick={() => fetchQuotes(list.map(e => e.symbol))}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-primary px-2.5 py-1.5 rounded-lg border border-border hover:border-gold/30 transition-all disabled:opacity-50"
          >
            <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        )}
      </div>

      {/* ── Local storage notice (compact) ── */}
      {list.length > 0 && (
        <div className="flex gap-2 p-3 bg-border/30 border border-border/50 rounded-xl">
          <AlertCircle size={12} className="text-muted flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted leading-relaxed">
            Saved on this browser only — clears if you clear browser data or switch devices.
          </p>
        </div>
      )}

      {/* ── Empty state ── */}
      {list.length === 0 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-border/60 flex items-center justify-center mx-auto mb-4">
            <Bookmark size={22} className="text-muted/40" />
          </div>
          <p className="text-sm font-semibold text-primary mb-1">Nothing saved yet</p>
          <p className="text-xs text-muted max-w-xs mx-auto leading-relaxed">
            Search any stock and tap the bookmark icon on its profile to save it here.
          </p>
        </div>
      )}

      {/* ── Cards ── */}
      {list.length > 0 && (
        <div className="space-y-2">
          {list.map(entry => {
            const isActive = entry.symbol === currentSymbol;
            const q = quotes[entry.symbol];

            return (
              <div
                key={entry.symbol}
                onClick={() => onSelectSymbol(entry.symbol)}
                className={`group relative rounded-xl border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gold/8 border-gold/30'
                    : 'bg-card border-border hover:border-gold/25 hover:bg-gold/4'
                }`}
              >
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-3">

                    {/* Left: symbol + name + sector */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                        <span className="text-[10px] font-bold font-mono text-gold leading-tight text-center px-0.5">
                          {entry.symbol.slice(0, 4)}
                        </span>
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-sm font-bold text-primary truncate">{entry.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] font-bold font-mono text-gold">{entry.symbol}</span>
                          {entry.sector && (
                            <span className="text-[10px] text-muted bg-border/50 px-1.5 py-0.5 rounded max-w-[120px] truncate">
                              {entry.sector}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: live price + remove */}
                    <div className="flex items-start gap-2 flex-shrink-0">
                      <div className="text-right">
                        {q?.loading ? (
                          <div className="w-12 h-4 bg-border/40 rounded animate-pulse mb-1" />
                        ) : q?.error || !q ? (
                          <p className="text-xs text-muted/50">—</p>
                        ) : (
                          <>
                            <p className="text-sm font-bold font-mono text-primary">
                              ₹{q.price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </p>
                            {q.changePct != null && q.changePct !== 0 && (
                              <p className={`text-[10px] font-mono font-semibold mt-0.5 ${q.changePct >= 0 ? 'text-gain' : 'text-loss'}`}>
                                {q.changePct >= 0 ? '▲' : '▼'} {Math.abs(q.changePct).toFixed(2)}%
                              </p>
                            )}
                            {q.pe && (
                              <p className="text-[10px] font-mono text-muted mt-0.5">
                                PE {q.pe.toFixed(1)}x
                              </p>
                            )}
                          </>
                        )}
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); removeFromWatchlist(entry.symbol); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted/30 hover:text-loss hover:bg-loss/10 transition-all opacity-0 group-hover:opacity-100"
                        title="Remove"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Bottom row: market cap + added time */}
                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/30">
                    <div className="flex items-center gap-3">
                      {q && !q.loading && !q.error && q.marketCap > 0 && (
                        <span className="text-[10px] text-muted font-mono">{fmtCap(q.marketCap)}</span>
                      )}
                    </div>
                    <span className="flex items-center gap-1 text-[10px] text-muted/60">
                      <Clock size={9} />
                      Added {timeAgo(entry.addedAt)}
                    </span>
                  </div>
                </div>

                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-gold rounded-full" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
