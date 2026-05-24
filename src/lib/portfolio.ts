'use client';

const STORAGE_KEY = 'robu_portfolio_v1';

export interface PortfolioEntry {
  symbol: string;
  name: string;
  sector: string;
  buyPrice: number;
  qty: number;
  addedAt: number; // timestamp ms
}

function dispatch() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('robu_portfolio_change'));
  }
}

export function getPortfolio(): PortfolioEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function isInPortfolio(symbol: string): boolean {
  return getPortfolio().some(e => e.symbol === symbol.toUpperCase());
}

export function addToPortfolio(entry: Omit<PortfolioEntry, 'addedAt'>): void {
  const list = getPortfolio().filter(e => e.symbol !== entry.symbol.toUpperCase());
  list.push({ ...entry, symbol: entry.symbol.toUpperCase(), addedAt: Date.now() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  dispatch();
}

export function updatePortfolioEntry(symbol: string, buyPrice: number, qty: number): void {
  const list = getPortfolio().map(e =>
    e.symbol === symbol.toUpperCase() ? { ...e, buyPrice, qty } : e
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  dispatch();
}

export function removeFromPortfolio(symbol: string): void {
  const list = getPortfolio().filter(e => e.symbol !== symbol.toUpperCase());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  dispatch();
}

export function getPortfolioEntry(symbol: string): PortfolioEntry | undefined {
  return getPortfolio().find(e => e.symbol === symbol.toUpperCase());
}
