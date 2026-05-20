'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SearchResult } from '@/lib/types';

interface CompanySearchProps {
  onSelect: (symbol: string) => void;
  selectedSymbol: string;
}

export default function CompanySearch({ onSelect, selectedSymbol }: CompanySearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
      setIsOpen(true);
      setActiveIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        handleSelect(results[activeIndex].symbol);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  function handleSelect(symbol: string) {
    onSelect(symbol);
    setQuery('');
    setIsOpen(false);
    setResults([]);
    inputRef.current?.blur();
  }

  return (
    <div className="relative w-full">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query && setIsOpen(true)}
          placeholder='Try "Reliance", "TCS", or any NSE/BSE symbol…'
          className="w-full bg-card border border-border rounded-lg pl-9 pr-9 py-2.5 text-sm text-primary placeholder-muted focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-3 h-3 border border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {query && !isLoading && (
          <button
            onClick={() => { setQuery(''); setIsOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg overflow-hidden z-50 fade-in"
          style={{ maxHeight: '280px', overflowY: 'auto' }}
        >
          {results.map((r, i) => {
            const isBSE = r.exchange === 'BSE';
            return (
              <button
                key={r.symbol}
                onClick={() => handleSelect(r.symbol)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
                  i === activeIndex ? 'bg-border' : 'hover:bg-border/50'
                } ${r.symbol === selectedSymbol ? 'border-l-2 border-gold' : ''}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div>
                    <span className="text-sm font-semibold text-gold font-mono">{r.symbol}</span>
                    <p className="text-xs text-muted mt-0.5 truncate max-w-[150px]">{r.name}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
                    isBSE
                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                      : 'bg-gain/10 text-gain border border-gain/20'
                  }`}>
                    {r.exchange || 'NSE'}
                  </span>
                  <p className="text-[10px] text-muted truncate max-w-[80px]">{r.sector}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {isOpen && !isLoading && results.length === 0 && query.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg px-3 py-4 text-center text-sm text-muted z-50">
          No results for &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}
