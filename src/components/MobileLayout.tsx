'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import {
  Search, TrendingUp, Users,
  AlertTriangle, Pencil, RotateCcw, Bookmark, Briefcase,
  ChevronRight,
} from '@/lib/icons';
import ThemeToggle from './ThemeToggle';
import { getCompanyProfile } from '@/lib/sectorModelMap';
import CompanySearch from './CompanySearch';
const AIOverview = dynamic(() => import('./AIOverview'), { ssr: false, loading: () => <div className="bg-card border border-border rounded-2xl h-40 animate-pulse" /> });
const ScenarioCards = dynamic(() => import('./ScenarioCards'), { ssr: false, loading: () => <div className="bg-card border border-border rounded-2xl h-40 animate-pulse" /> });
const FinancialsTable = dynamic(() => import('./FinancialsTable'), { ssr: false, loading: () => <div className="bg-card border border-border rounded-2xl h-40 animate-pulse" /> });
const ValuationEngine = dynamic(() => import('./ValuationEngine'), { ssr: false, loading: () => <div className="bg-card border border-border rounded-2xl h-40 animate-pulse" /> });
const EarningsQuality = dynamic(() => import('./EarningsQuality'), { ssr: false, loading: () => <div className="bg-card border border-border rounded-2xl h-40 animate-pulse" /> });
const WhatMustHappen = dynamic(() => import('./WhatMustHappen'), { ssr: false, loading: () => <div className="bg-card border border-border rounded-2xl h-40 animate-pulse" /> });
const ReverseDCF = dynamic(() => import('./ReverseDCF'), { ssr: false, loading: () => <div className="bg-card border border-border rounded-2xl h-40 animate-pulse" /> });
const MonteCarloCard = dynamic(() => import('./MonteCarloCard'), { ssr: false, loading: () => <div className="bg-card border border-border rounded-2xl h-40 animate-pulse" /> });
import RedFlagsCard from './RedFlagsCard';
const HistoricalValuationChart = dynamic(() => import('./HistoricalValuationChart'), { ssr: false, loading: () => <div className="bg-card border border-border rounded-2xl h-40 animate-pulse" /> });
const ForecastChart = dynamic(() => import('./ForecastChart'), { ssr: false, loading: () => <div className="bg-card border border-border rounded-2xl h-40 animate-pulse" /> });
const IndustryBenchmarks = dynamic(() => import('./IndustryBenchmarks'), { ssr: false, loading: () => <div className="bg-card border border-border rounded-2xl h-40 animate-pulse" /> });
const PeerCompare = dynamic(() => import('./PeerCompare'), { ssr: false, loading: () => <div className="bg-card border border-border rounded-2xl h-40 animate-pulse" /> });
import VerdictCard from './VerdictCard';
import MetricTrends from './MetricTrends';
import ValuationCaveatBanner from './ValuationCaveatBanner';
import WealthProjection from './WealthProjection';
const WatchlistView = dynamic(() => import('./WatchlistView'), { ssr: false, loading: () => <div className="bg-card border border-border rounded-2xl h-40 animate-pulse" /> });
const PortfolioView = dynamic(() => import('./PortfolioView'), { ssr: false, loading: () => <div className="bg-card border border-border rounded-2xl h-40 animate-pulse" /> });
const ROBUScoreCard = dynamic(() => import('./ROBUScoreCard'), { ssr: false, loading: () => <div className="bg-card border border-border rounded-2xl h-40 animate-pulse" /> });
const ScenarioBuilder = dynamic(() => import('./ScenarioBuilder'), { ssr: false, loading: () => <div className="bg-card border border-border rounded-2xl h-40 animate-pulse" /> });
const SectorAlternatives = dynamic(() => import('./SectorAlternatives'), { ssr: false, loading: () => <div className="bg-card border border-border rounded-2xl h-40 animate-pulse" /> });
import ThreeLensCard from './ThreeLensCard';
const StoryPotentialCard = dynamic(() => import('./StoryPotentialCard'), { ssr: false, loading: () => <div className="bg-card border border-border rounded-2xl h-40 animate-pulse" /> });
import { getBaselineFinancial, runPrimaryModel } from '@/lib/forecastUtils';
import { valuationReliability } from '@/lib/valuationReliability';
import FScoreCard from './FScoreCard';
import FreshnessNote from './FreshnessNote';
import EarningsFlash from './EarningsFlash';

// ─── Tab types ────────────────────────────────────────────────────────────────
type MainTab  = 'home' | 'watchlist' | 'portfolio' | 'stock';
type StockTab = 'valuation' | 'financials' | 'profile';

interface Props {
  company: Company | null;
  financials: FinancialYear[];
  selectedSymbol: string;
  isLoading: boolean;
  error: string | null;
  assumptions: ValuationAssumptions;
  setAssumptions: React.Dispatch<React.SetStateAction<ValuationAssumptions>>;
  onSelect: (symbol: string) => void;
  onRetry: () => void;
  onReset: () => void;
  hasChanges: boolean;
}

// ─── Logo ─────────────────────────────────────────────────────────────────────
export function RobuLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="92" height="92" rx="26" fill="#7A2238" />
      {/* The actual 'r' glyph from the robu wordmark, so the mark and the wordmark
          are the same letterform everywhere (header, favicon, app icon). */}
      <g transform="translate(31.7, 12) scale(0.41)">
        <path fill="#FFFFFF" fillRule="evenodd" d="M1,82.47 C2.4,78.87 4.08,75.84 5.15,72.61 C11.93,52.24 25.31,38.41 45.34,30.63 C57.21,26.02 69.36,24.51 81.96,25.02 C86.26,25.2 87.97,27.02 87.85,31.14 C87.75,34.47 87.89,37.8 87.83,41.13 C87.72,47.02 86.94,47.48 81.16,47.97 C73.27,48.64 65.06,48.62 57.63,50.95 C43.32,55.44 33.63,65.82 29.13,80 C26.85,87.15 26.25,95.04 26.09,102.62 C25.7,121.76 25.97,140.91 25.99,160.53 C17.7,161 9.4,161 1,161 C1,134.98 1,108.96 1,82.47 z" />
      </g>
    </svg>
  );
}

// Real "robu" wordmark (user's logo). Uses currentColor so it themes via text-* class.
export function RobuWordmark({ height = 22, className = '' }: { height?: number; className?: string }) {
  return (
    <svg height={height} viewBox="0 0 516 160" fill="currentColor" role="img" aria-label="robu"
      className={className} style={{ width: 'auto', display: 'block' }}>
      <path fillRule="evenodd" d="M281.47,161 C279.4,159.68 278.01,157.88 276.18,157.13 C253.53,147.79 239.16,131.43 234.07,107.36 C232.88,101.73 232.22,95.88 232.17,90.13 C231.98,63.83 232.06,37.54 232.12,11.24 C232.13,8.1 232.6,4.96 232.93,1.41 C239.35,1 245.71,1 252.53,1 C253.31,12.47 253.61,23.95 253.94,35.42 C254.01,37.68 254.21,39.94 254.41,43.36 C256.54,41.92 257.89,41.15 259.08,40.18 C267.35,33.42 276.89,29.77 287.18,26.95 C302.47,22.75 316.9,25.75 330.43,31.75 C348.61,39.81 361.52,53.53 367.63,73.08 C373.13,90.65 371.95,107.65 363.68,123.93 C355.7,139.63 343.33,150.75 326.75,157.07 C324.8,157.81 323.12,159.26 321.16,160.69 C307.98,161 294.96,161 281.47,161 M336.61,122.06 C345.63,109.74 349.25,96.53 344.81,81.31 C339.82,64.19 325.93,50.72 308.22,48 C290.04,45.21 275.45,52.5 265.01,67.11 C253.99,82.56 253.19,99.58 262.26,116.05 C269.64,129.46 281.51,137.93 297.16,139.75 C313.4,141.64 325.67,134.06 336.61,122.06 z"/>
      <path fillRule="evenodd" d="M136.47,161 C133.86,159.52 131.89,157.63 129.55,156.62 C107.45,147.12 93.96,130.75 88.92,107.16 C83.92,83.7 90.78,63.69 106.53,46.58 C115.85,36.46 127.97,30.4 141.46,27.47 C146.28,26.42 151.23,25.14 156.08,25.28 C176.33,25.88 193.999,32.94 208.12,47.81 C231.76,72.69 232.34,112.74 209.56,138.36 C202.02,146.84 193.2,153.34 182.33,156.98 C180.19,157.7 178.33,159.25 176.17,160.71 C162.98,161 149.96,161 136.47,161 M146.87,138.94 C171.98,144.82 199.24,125.2 201.9,98.58 C205.24,65.11 171.6,41.11 144.21,49.93 C113.04,59.97 101.41,97.79 122.22,123.1 C128.54,130.79 136.8,135.53 146.87,138.94 z"/>
      <path fillRule="evenodd" d="M428.47,161 C425.9,159.73 423.94,158.02 421.67,157.27 C402.25,150.89 389.94,136.89 381.98,118.99 C379.01,112.32 377.55,104.52 377.35,97.18 C376.74,75.7 377.08,54.19 377.12,32.69 C377.13,26.13 378.07,25.28 384.72,25.18 C387.38,25.14 390.05,25.16 392.71,25.17 C401.44,25.2 401.84,25.56 401.85,34.1 C401.87,53.27 401.8,72.43 401.9,91.6 C401.93,95.91 402.12,100.29 402.95,104.51 C407.22,126.43 434.79,147.82 461.15,137.12 C479.88,129.52 492.31,112.57 492.19,92.02 C492.07,72.52 492.15,53.03 492.18,33.53 C492.19,25.49 492.52,25.11 500.73,25.2 C505.88,25.26 511.02,25.66 516.59,25.96 C517,51.69 517,77.38 516.71,103.73 C514.71,109.4 513.36,114.56 511.23,119.37 C503.29,137.37 490.39,150.32 471.77,157.34 C469.68,158.13 467.91,159.76 466,161 C453.65,161 441.29,161 428.47,161 z"/>
      <path fillRule="evenodd" d="M1,82.47 C2.4,78.87 4.08,75.84 5.15,72.61 C11.93,52.24 25.31,38.41 45.34,30.63 C57.21,26.02 69.36,24.51 81.96,25.02 C86.26,25.2 87.97,27.02 87.85,31.14 C87.75,34.47 87.89,37.8 87.83,41.13 C87.72,47.02 86.94,47.48 81.16,47.97 C73.27,48.64 65.06,48.62 57.63,50.95 C43.32,55.44 33.63,65.82 29.13,80 C26.85,87.15 26.25,95.04 26.09,102.62 C25.7,121.76 25.97,140.91 25.99,160.53 C17.7,161 9.4,161 1,161 C1,134.98 1,108.96 1,82.47 z"/>
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L Cr`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K Cr`;
  return `₹${n.toLocaleString('en-IN')} Cr`;
}

// ─── Main Bottom Nav (5 tabs) ─────────────────────────────────────────────────
function BottomNav({
  active, onChange, hasCompany,
}: { active: MainTab; onChange: (t: MainTab) => void; hasCompany: boolean }) {
  const tabs: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <Search size={20} strokeWidth={active === 'home' ? 2.2 : 1.8} className={active === 'home' ? 'text-gold' : 'text-muted'} />,
    },

    {
      id: 'watchlist',
      label: 'Watchlist',
      icon: <Bookmark size={20} strokeWidth={active === 'watchlist' ? 2.2 : 1.8} className={active === 'watchlist' ? 'text-gold' : 'text-muted'} />,
    },
    {
      id: 'portfolio',
      label: 'Portfolio',
      icon: <Briefcase size={20} strokeWidth={active === 'portfolio' ? 2.2 : 1.8} className={active === 'portfolio' ? 'text-gold' : 'text-muted'} />,
    },
    {
      id: 'stock',
      label: hasCompany ? 'Analysis' : 'Stock',
      icon: <TrendingUp size={20} strokeWidth={active === 'stock' ? 2.2 : 1.8} className={active === 'stock' ? 'text-gold' : hasCompany ? 'text-muted' : 'text-muted/30'} />,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="bg-card backdrop-blur-xl border-t border-border flex justify-center">
        <div className="flex w-full max-w-md">
        {tabs.map(({ id, label, icon }) => {
          const disabled = id === 'stock' && !hasCompany;
          const isOn = active === id;
          return (
            <button
              key={id}
              onClick={() => !disabled && onChange(id)}
              aria-label={label}
              aria-current={isOn ? 'page' : undefined}
              aria-disabled={disabled}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors min-w-0
                ${disabled ? 'opacity-25 cursor-not-allowed' : ''}`}
            >
              {icon}
              <span className={`text-[10px] font-medium leading-none ${isOn ? 'text-gold' : 'text-muted'}`}>
                {label}
              </span>
              {isOn && <div className="w-4 h-0.5 rounded-full bg-gold mt-0.5" />}
            </button>
          );
        })}
        </div>
      </div>
    </nav>
  );
}

// ─── Stock Sub-tabs (horizontal scroll) ──────────────────────────────────────
function StockSubNav({
  active, onChange,
}: { active: StockTab; onChange: (t: StockTab) => void }) {
  const tabs: { id: StockTab; label: string }[] = [
    { id: 'valuation',  label: 'Valuation' },
    { id: 'financials', label: 'Financials' },
    { id: 'profile',    label: 'Profile' },
  ];
  return (
    <div className="flex gap-1.5 overflow-x-auto md:flex-wrap px-4 py-2 border-b border-border bg-card/95 backdrop-blur-xl no-scrollbar">
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            active === id
              ? 'bg-gold text-terminal'
              : 'bg-border/50 text-primary/70 hover:text-primary'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Mobile Header ────────────────────────────────────────────────────────────
function MobileHeader({
  company, mainTab, stockTab,
}: { company: Company | null; mainTab: MainTab; stockTab: StockTab }) {
  const isStock = mainTab === 'stock' && company;
  const isPos = company ? company.changePercent >= 0 : true;

  const pageTitle: Record<MainTab, string> = {
    home:      'Robu',
    
    watchlist: 'Watchlist',
    portfolio: 'Portfolio',
    stock:     '',
  };

  return (
    <header
      className="sticky top-0 z-40 bg-card/98 backdrop-blur-xl border-b border-border"
      style={{ paddingTop: 'max(12px, env(safe-area-inset-top, 12px))' }}
    >
      <div className="flex items-center justify-between px-4 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <RobuLogo size={26} />
          {isStock ? (
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-primary font-mono">{company.symbol}</span>
                <span className={`text-xs font-bold font-mono ${isPos ? 'text-gain' : 'text-loss'}`}>
                  {isPos ? '+' : ''}{company.changePercent.toFixed(2)}%
                </span>
              </div>
              {/* Price always visible */}
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-bold font-mono text-primary leading-tight">
                  ₹{company.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
                <span className={`text-[11px] font-mono ${isPos ? 'text-gain' : 'text-loss'}`}>
                  {isPos ? '+' : ''}₹{Math.abs(company.change).toFixed(1)}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-sm font-bold text-primary tracking-tight">
              {pageTitle[mainTab]}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isStock && (
            <>
              <span className="text-[10px] px-1.5 py-0.5 bg-accent/10 text-accent border border-accent/30 rounded-full font-mono">
                NSE
              </span>
              <div className="flex items-center gap-1 text-[10px] text-muted">
                <div className="w-1.5 h-1.5 rounded-full bg-gain animate-pulse" />
                <span>Live</span>
              </div>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>

      {/* Stock sub-tabs, rendered inside the sticky header */}
      {mainTab === 'stock' && company && (
        <StockSubNav active={stockTab} onChange={() => {}} />
      )}
    </header>
  );
}

// ─── Loader / Error ───────────────────────────────────────────────────────────
function MobileLoader({ symbol }: { symbol: string }) {
  // Ghost skeleton that mirrors the real valuation layout, so the page keeps its
  // shape while live data loads (feels far faster than a blank spinner).
  return (
    <div className="px-4 pt-4 pb-32 space-y-4 max-w-2xl mx-auto w-full" aria-busy="true" aria-label={`Loading ${symbol || ''}`}>
      {/* Verdict card */}
      <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
        <div className="skeleton h-3 w-24 rounded-cds-sm" />
        <div className="flex items-center gap-3">
          <div className="skeleton w-12 h-12 rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-7 w-40 rounded-cds-sm" />
            <div className="skeleton h-5 w-28 rounded-cds-sm" />
          </div>
        </div>
        <div className="skeleton h-2.5 w-full rounded-full" />
        <div className="flex gap-6">
          <div className="space-y-2"><div className="skeleton h-3 w-20 rounded-cds-sm" /><div className="skeleton h-5 w-24 rounded-cds-sm" /></div>
          <div className="space-y-2"><div className="skeleton h-3 w-16 rounded-cds-sm" /><div className="skeleton h-5 w-20 rounded-cds-sm" /></div>
        </div>
      </div>
      {/* Three-lens / assumptions blocks */}
      {[0, 1].map(i => (
        <div key={i} className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="skeleton h-4 w-32 rounded-cds-sm" />
          <div className="skeleton h-3 w-full rounded-cds-sm" />
          <div className="skeleton h-3 w-5/6 rounded-cds-sm" />
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="skeleton h-16 rounded-2xl" /><div className="skeleton h-16 rounded-2xl" />
          </div>
        </div>
      ))}
      <p className="text-center text-xs text-muted/60">Fetching live data for {symbol || '…'} from NSE/BSE…</p>
    </div>
  );
}

function MobileError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-loss/10 border border-loss/20 flex items-center justify-center">
        <AlertTriangle size={22} className="text-loss" />
      </div>
      <div>
        <p className="text-sm text-loss font-medium">Couldn't load data</p>
        <p className="text-xs text-muted mt-1">{message}</p>
      </div>
      <button onClick={onRetry} className="px-5 py-2.5 bg-gold/10 border border-gold/30 rounded-xl text-sm text-gold font-medium active:scale-95 transition-transform">
        Try again
      </button>
    </div>
  );
}

// ─── Home View ────────────────────────────────────────────────────────────────
function HomeView({
  onSelect, selectedSymbol, onGoTo,
}: { onSelect: (s: string) => void; selectedSymbol: string; onGoTo: (t: MainTab) => void }) {
  const chips = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'WIPRO', 'BAJFINANCE', 'TMPV', 'SBIN', 'ADANIENT', 'ANGELONE', 'KAYNES'];

  const shortcuts = [
    {
      id: 'watchlist' as MainTab,
      title: 'Watchlist',
      desc: 'Stocks you\'ve bookmarked for quick access',
      Icon: Bookmark,
      color: 'text-gold',
      bg: 'bg-gold/10',
      border: 'border-gold/20',
    },
    {
      id: 'portfolio' as MainTab,
      title: 'Portfolio',
      desc: 'Track holdings, P&L and import from broker',
      Icon: Briefcase,
      color: 'text-gain',
      bg: 'bg-gain/10',
      border: 'border-gain/20',
    },
  ];

  return (
    <div className="flex flex-col px-4 md:px-6 pb-32 w-full max-w-xl md:max-w-2xl mx-auto">
      {/* Hero — airy */}
      <div className="flex flex-col items-center pt-16 md:pt-20 pb-9 px-2">
        <RobuWordmark height={34} className="text-gold" />
        <h1 className="text-[26px] font-extrabold text-primary mt-9 tracking-tight text-center leading-[1.1]">
          Should you buy<br />this stock?
        </h1>
        <p className="text-sm text-muted mt-3.5 text-center leading-relaxed max-w-[300px]">
          Type any Indian stock — Robu tells you if it looks{' '}
          <span className="font-semibold text-gain">cheap</span>,{' '}
          <span className="font-semibold text-warning">fair</span>, or{' '}
          <span className="font-semibold text-loss">expensive</span>.
        </p>
      </div>

      {/* Search */}
      <div className="mb-6 [&_input]:rounded-full">
        <CompanySearch onSelect={onSelect} selectedSymbol={selectedSymbol} />
      </div>

      {/* Utility shortcuts — 2-up on tablet */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-5">
        {shortcuts.map(s => (
          <button
            key={s.id}
            onClick={() => onGoTo(s.id)}
            className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-3.5 hover:border-border/80 active:scale-[0.99] transition-all text-left"
          >
            <div className={`w-9 h-9 rounded-xl ${s.bg} border ${s.border} flex items-center justify-center flex-shrink-0`}>
              <s.Icon size={17} className={s.color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary">{s.title}</p>
              <p className="text-[11px] text-muted mt-0.5 leading-snug">{s.desc}</p>
            </div>
            <ChevronRight size={15} className="text-muted/40 flex-shrink-0" />
          </button>
        ))}
      </div>

      {/* Popular chips */}
      <p className="text-[10px] uppercase tracking-widest text-muted font-medium mb-2">Popular stocks</p>
      <div className="flex flex-wrap gap-2">
        {chips.map(sym => (
          <button
            key={sym}
            onClick={() => onSelect(sym)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold border transition-all active:scale-95 ${
              selectedSymbol === sym
                ? 'bg-gold border-gold text-white'
                : 'bg-transparent border-border text-muted'
            }`}
          >
            {sym}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Valuation View ───────────────────────────────────────────────────────────
function MobileSlider({
  label, value, min, max, inputMax, step, suffix, color, onChange, hint,
}: { label: string; value: number; min: number; max: number; inputMax?: number; step: number; suffix: string; color: string; onChange: (v: number) => void; hint?: string }) {
  const pct = Math.min(((value - min) / (max - min)) * 100, 100);
  const beyondSlider = value > max;
  return (
    <div className="py-1">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted">{label}</p>
        <div className="flex items-center gap-0.5">
          <input
            type="number" min={min} max={inputMax ?? max} step={step} value={value}
            onChange={e => { const n = parseFloat(e.target.value); if (!isNaN(n)) onChange(Math.min(Math.max(n, min), inputMax ?? max)); }}
            className={`w-20 text-right text-base font-bold font-mono bg-transparent border-b border-border focus:border-gold focus:outline-none ${color} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
          />
          <span className={`text-base font-bold font-mono ${color}`}>{suffix}</span>
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={Math.min(value, max)}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full appearance-none cursor-pointer robu-slider"
        style={{ '--fill': `${pct}%` } as React.CSSProperties}
      />
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-muted font-mono">{min}{suffix}</span>
        {beyondSlider
          ? <span className="text-[10px] text-gold font-mono font-semibold">▲ beyond {max}{suffix}</span>
          : <span className="text-[10px] text-muted font-mono">{max}{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-muted/70 mt-1 font-mono leading-snug">{hint}</p>}
    </div>
  );
}

function ValuationView({ company, financials, assumptions, setAssumptions, isLoading, error, onRetry, onReset, hasChanges }: {
  company: Company | null; financials: FinancialYear[]; assumptions: ValuationAssumptions;
  setAssumptions: React.Dispatch<React.SetStateAction<ValuationAssumptions>>;
  isLoading: boolean; error: string | null; onRetry: () => void; onReset: () => void; hasChanges: boolean;
}) {
  if (isLoading) return <MobileLoader symbol="…" />;
  if (error) return <MobileError message={error} onRetry={onRetry} />;
  if (!company || financials.length === 0) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 px-6 text-center">
      <p className="text-sm text-muted">No financial data available</p>
    </div>
  );

  // Use last COMPLETE fiscal year for hints — avoids showing partial-year data
  const { baseline, isPartialDetected, yearLabel } = getBaselineFinancial(financials);
  const sectorProfile = getCompanyProfile(company);

  // Live what-if target price from the user's CURRENT sliders — shown inside the
  // assumptions card so they see the impact here, NOT in Robu's (fixed) verdict.
  const whatIf = useMemo(() => {
    try {
      const r = runPrimaryModel(sectorProfile.model, financials, company,
        assumptions.revenueGrowthRate, assumptions.netMarginAssumption, assumptions.exitMultiple, assumptions.years || 5);
      return Math.max(r.fairValue, 0);
    } catch { return 0; }
  }, [company, financials, assumptions, sectorProfile.model]);
  const whatIfUp = whatIf > 0 && company.currentPrice > 0 ? ((whatIf / company.currentPrice) - 1) * 100 : 0;
  const whatIfReliable = valuationReliability(company, financials).reliable;

  return (
    <div className="px-4 pt-4 pb-32 space-y-4 max-w-2xl md:max-w-3xl mx-auto w-full">
      <FreshnessNote company={company} />
      <EarningsFlash company={company} />
      <VerdictCard company={company} financials={financials} assumptions={assumptions} />

      <ThreeLensCard company={company} financials={financials} assumptions={assumptions} />

      <ValuationCaveatBanner company={company} financials={financials} />

      <div className="bg-card border border-border rounded-2xl p-4 space-y-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <div className="w-6 h-6 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
            <Pencil size={12} className="text-accent" />
          </div>
          <h3 className="text-sm font-semibold text-primary">Your assumptions</h3>
          <div className="ml-auto flex items-center gap-1.5 min-w-0">
            {hasChanges && (
              <button onClick={onReset} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-loss border border-loss/30 bg-loss/5 active:scale-95 transition-all">
                <RotateCcw size={11} /> Reset
              </button>
            )}
            <span className="text-[10px] text-gold font-mono bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded whitespace-nowrap max-w-[55vw] truncate">
              {sectorProfile.sectorLabel}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted -mt-3">Drag the sliders — this is your own what-if, separate from Robu's verdict above.</p>
        <div className="flex items-end justify-between rounded-2xl bg-terminal/50 border border-border px-4 py-3 -mt-1">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[1.2px] text-muted">Your target price</p>
            <p className="text-[10.5px] text-muted/70 mt-0.5">on your assumptions</p>
          </div>
          <div className="text-right">
            {whatIfReliable && whatIf > 0 ? (
              <>
                <p className="text-[22px] font-bold font-mono text-primary leading-none">₹{whatIf.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                <p className={`text-[12px] font-semibold font-mono mt-1 ${whatIfUp >= 0 ? 'text-gain' : 'text-loss'}`}>
                  {whatIfUp >= 0 ? '+' : ''}{whatIfUp.toFixed(0)}% vs ₹{company.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted">can't value reliably</p>
            )}
          </div>
        </div>
        <MobileSlider
          label="Revenue Growth" value={assumptions.revenueGrowthRate}
          min={1} max={50} inputMax={200} step={0.5} suffix="%" color="text-accent"
          onChange={v => setAssumptions(a => ({ ...a, revenueGrowthRate: v }))}
          hint={`${isPartialDetected ? `⚠ Latest year partial — using ${yearLabel} · ` : ''}Base: ${yearLabel} ₹${(baseline.revenue/100).toFixed(0)}K Cr · growth ${baseline.revenueGrowth.toFixed(1)}%`}
        />
        {sectorProfile.model !== 'pb' && (
          <MobileSlider
            label="Net Margin" value={assumptions.netMarginAssumption}
            min={1} max={50} inputMax={100} step={0.5} suffix="%" color="text-gain"
            onChange={v => setAssumptions(a => ({ ...a, netMarginAssumption: v }))}
            hint={`Of ₹100 earned, how much stays as profit? Actual: ${baseline.netMargin.toFixed(1)}%`}
          />
        )}
        <MobileSlider
          label={sectorProfile.exitMultipleLabel}
          value={assumptions.exitMultiple}
          min={sectorProfile.exitMultipleMin}
          max={sectorProfile.exitMultipleMax}
          inputMax={sectorProfile.model === 'pe' ? 3000 : sectorProfile.model === 'pb' ? 50 : sectorProfile.exitMultipleMax * 10}
          step={sectorProfile.exitMultipleStep}
          suffix="x" color="text-gold"
          onChange={v => setAssumptions(a => ({ ...a, exitMultiple: v, exitPE: v }))}
          hint={
            sectorProfile.model === 'pe' ? `At what P/E will you sell? Current: ${company.pe.toFixed(1)}x` :
            sectorProfile.model === 'pb' ? `At what P/B will you sell? Current: ${company.pb.toFixed(1)}x` :
            `Sector default: ${sectorProfile.defaultExitMultiple}x · Base: ${yearLabel}`
          }
        />
        {/* Global horizon removed — verdict & what-must-happen own their own time view. */}
      </div>

      <ForecastChart financials={financials} assumptions={assumptions} />
      {/* Wealth projection — right below the assumptions that drive it */}
      <WealthProjection company={company} financials={financials} assumptions={assumptions} />

      <ScenarioCards financials={financials} assumptions={assumptions} currentPrice={company.currentPrice} company={company} compact />
      <ValuationEngine company={company} financials={financials} assumptions={assumptions} compact />
      <ReverseDCF company={company} financials={financials} assumptions={assumptions} />
      <MonteCarloCard company={company} financials={financials} assumptions={assumptions} />
      <RedFlagsCard company={company} financials={financials} />
      {financials.length >= 3 && <ROBUScoreCard company={company} financials={financials} />}
      <FScoreCard company={company} financials={financials} />
      <ScenarioBuilder company={company} financials={financials} />
      <SectorAlternatives company={company} onSelectSymbol={() => {}} />
      <WhatMustHappen company={company} financials={financials} assumptions={assumptions} />
      <StoryPotentialCard company={company} financials={financials} assumptions={assumptions} />
    </div>
  );
}

// ─── Profile View ─────────────────────────────────────────────────────────────
function ProfileView({ company, financials, isLoading, error, onRetry }: {
  company: Company | null; financials: FinancialYear[]; isLoading: boolean; error: string | null; onRetry: () => void;
}) {
  if (isLoading) return <MobileLoader symbol="…" />;
  if (error) return <MobileError message={error} onRetry={onRetry} />;
  if (!company) return null;
  return (
    <div className="px-4 pt-4 pb-32 space-y-4 max-w-2xl md:max-w-3xl mx-auto w-full">
      {/* M4: Dividend · Shareholding · Analyst cards land here */}
      <AIOverview company={company} financials={financials} />
      <HistoricalValuationChart company={company} />
      <IndustryBenchmarks company={company} financials={financials} />
    </div>
  );
}

// ─── Financials View ──────────────────────────────────────────────────────────
function FinancialsView({ company, financials, isLoading, error, onRetry }: {
  company: Company | null; financials: FinancialYear[]; isLoading: boolean; error: string | null; onRetry: () => void;
}) {
  if (isLoading) return <MobileLoader symbol="…" />;
  if (error) return <MobileError message={error} onRetry={onRetry} />;
  if (!company) return null;

  const isPos = company.changePercent >= 0;
  const low = company.week52Low;
  const high = company.week52High;
  const pct = high > low ? Math.max(2, Math.min(98, ((company.currentPrice - low) / (high - low)) * 100)) : 50;
  // Partial-year-aware baseline (a 9-month trailing year would misreport "last reported")
  const latest = financials.length > 0 ? getBaselineFinancial(financials).baseline : null;

  const has52W = low > 0 && high > 0;
  const gPos = (n: number) => Math.max(6, Math.min(94, n));
  const stats: { label: string; value: string; color?: string; gauge?: number; dot?: 'gain' | 'warning' | 'loss' }[] = [
    { label: 'Market Cap',    value: fmt(company.marketCap) },
    { label: 'P/E Ratio',    value: company.pe > 0 ? `${company.pe.toFixed(1)}x` : '—',
      color: company.pe <= 0 ? 'text-muted' : company.pe < 18 ? 'text-gain' : company.pe < 30 ? 'text-warning' : 'text-loss',
      gauge: company.pe > 0 ? gPos((company.pe / 50) * 100) : undefined,
      dot: company.pe <= 0 ? undefined : company.pe < 18 ? 'gain' : company.pe < 30 ? 'warning' : 'loss' },
    { label: 'P/B Ratio',    value: company.pb > 0 ? `${company.pb.toFixed(1)}x` : '—',
      color: company.pb <= 0 ? 'text-muted' : company.pb < 1.5 ? 'text-gain' : company.pb < 4 ? 'text-warning' : 'text-loss',
      gauge: company.pb > 0 ? gPos((company.pb / 8) * 100) : undefined,
      dot: company.pb <= 0 ? undefined : company.pb < 1.5 ? 'gain' : company.pb < 4 ? 'warning' : 'loss' },
    { label: 'ROE',          value: `${company.roe.toFixed(1)}%`,
      color: company.roe >= 20 ? 'text-gain' : company.roe >= 12 ? 'text-warning' : 'text-loss',
      gauge: company.roe > 0 ? gPos((company.roe / 40) * 100) : undefined,
      dot: company.roe <= 0 ? undefined : company.roe >= 20 ? 'gain' : company.roe >= 12 ? 'warning' : 'loss' },
    { label: 'Debt/Equity',  value: `${company.debtToEquity.toFixed(2)}x`,
      color: company.debtToEquity < 1 ? 'text-gain' : company.debtToEquity < 3 ? 'text-warning' : 'text-loss',
      gauge: company.debtToEquity > 0 ? gPos((company.debtToEquity / 5) * 100) : undefined,
      dot: company.debtToEquity <= 0 ? undefined : company.debtToEquity < 1 ? 'gain' : company.debtToEquity < 3 ? 'warning' : 'loss' },
    { label: 'Div Yield',    value: company.dividendYield > 0 ? `${company.dividendYield.toFixed(2)}%` : '—' },
  ];

  return (
    <div className="pt-4 pb-32">
      <div className="px-4 space-y-3 max-w-2xl md:max-w-3xl mx-auto w-full">
        {/* ── Company card (brief: eyebrow → name → big mono price → change) ── */}
        <div className="bg-card border border-border rounded-[20px] p-[18px]">
          <p className="text-[12px] font-medium text-muted">
            <span className="font-mono font-semibold text-gold">{company.symbol}</span>
            {company.sector ? <span> · {company.sector}</span> : null}
          </p>
          {/* min-w-0 + break-words = never collapses to one-letter-per-line */}
          <h2 className="mt-1 text-[17px] font-bold text-primary leading-snug break-words [text-wrap:balance] min-w-0">
            {company.name}
          </h2>
          <div className="mt-2.5 flex items-baseline gap-2.5 flex-wrap">
            <span className="text-[26px] font-bold font-mono text-primary leading-none">
              ₹{company.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className={`text-sm font-semibold font-mono ${isPos ? 'text-gain' : 'text-loss'}`}>
              {isPos ? '+' : ''}₹{Math.abs(company.change).toFixed(2)} ({isPos ? '+' : ''}{company.changePercent.toFixed(2)}%)
              <span className="text-muted font-normal"> today</span>
            </span>
          </div>
          {has52W && (
            <div className="mt-4">
              <div className="flex justify-between text-[10.5px] font-mono text-muted/80 mb-1.5 gap-2">
                <span className="truncate">52W ₹{low.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                <span className="flex-shrink-0">₹{high.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="relative h-2 bg-border/60 rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-loss via-warning to-gain opacity-30 rounded-full" />
                <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-gold bg-terminal"
                  style={{ left: `calc(${pct}% - 7px)` }} />
              </div>
            </div>
          )}
        </div>

        {/* ── Key ratios (brief: 2-col stat tiles, mono values) ── */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-muted/70 mb-2.5 px-0.5">Key ratios</p>
          <div className="grid grid-cols-2 gap-2.5">
            {stats.map((stat, i) => (
              <div key={i} className="bg-card border border-border rounded-[15px] px-3.5 py-3">
                <p className="text-[11.5px] text-muted mb-1.5">{stat.label}</p>
                <p className={`text-[18px] font-semibold font-mono leading-none ${stat.color || 'text-primary'}`}>{stat.value}</p>
                {typeof stat.gauge === 'number' && (
                  <div className="mt-2.5 h-1 rounded-full bg-border/70 relative" aria-hidden="true">
                    <span className="absolute top-1/2 w-2 h-2 rounded-full"
                          style={{ left: `${stat.gauge}%`, transform: 'translate(-50%, -50%)', background: `rgb(var(--color-${stat.dot || 'muted'}))` }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Last reported (brief: row list, hair dividers, mono right) ── */}
        {latest && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-muted/70 mb-2.5 px-0.5">Last reported · {latest.year}</p>
            <div className="bg-card border border-border rounded-[20px] px-[18px]">
              {[
                { label: 'Revenue',          value: fmt(latest.revenue) },
                { label: 'Net profit (PAT)', value: fmt(latest.pat), color: latest.pat > 0 ? 'text-gain' : 'text-loss' },
                { label: 'EBITDA margin',    value: `${latest.ebitdaMargin.toFixed(1)}%`, color: latest.ebitdaMargin >= 20 ? 'text-gain' : latest.ebitdaMargin >= 12 ? 'text-warning' : 'text-primary' },
                { label: 'Net margin',       value: `${latest.netMargin.toFixed(1)}%`, color: latest.netMargin >= 10 ? 'text-gain' : 'text-primary' },
                { label: 'EPS',              value: `₹${latest.eps.toFixed(1)}` },
              ].map((r, i, a) => (
                <div key={i} className={`flex items-center justify-between py-[13px] ${i < a.length - 1 ? 'border-b border-border/60' : ''}`}>
                  <span className="text-sm text-muted">{r.label}</span>
                  <span className={`text-[15px] font-semibold font-mono ${r.color || 'text-primary'}`}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <MetricTrends financials={financials} />
      </div>

      <div className="px-4 mb-3 mt-4">
        <h3 className="text-sm font-semibold text-primary">Financial History</h3>
        <p className="text-xs text-muted mt-0.5">Scroll right to see all years →</p>
      </div>
      <div className="overflow-x-auto px-4">
        <FinancialsTable financials={financials} />
      </div>
      <div className="px-4 mt-4">
        <EarningsQuality financials={financials} />
      </div>

      {/* ── Peer comparison (moved from old Peers tab) ── */}
      <div className="px-4 mb-3 mt-6">
        <h3 className="text-sm font-semibold text-primary">Peer Comparison</h3>
        <p className="text-xs text-muted mt-0.5">How {company.symbol} stacks up — scroll right →</p>
      </div>
      <div className="overflow-x-auto px-4">
        <PeerCompare company={company} />
      </div>
    </div>
  );
}

// ─── Main Mobile Layout ───────────────────────────────────────────────────────
export default function MobileLayout({
  company, financials, selectedSymbol, isLoading, error,
  assumptions, setAssumptions, onSelect, onRetry, onReset, hasChanges,
}: Props) {
  const [mainTab, setMainTab]   = useState<MainTab>('home');
  const [stockTab, setStockTab] = useState<StockTab>('valuation');
  const [scrolled, setScrolled] = useState(false);

  const mountedMain  = useRef<Set<MainTab>>(new Set<MainTab>(['home']));
  const mountedStock = useRef<Set<StockTab>>(new Set<StockTab>(['valuation']));

  // Shared links (?symbol=X) must open the stock directly, like on desktop
  useEffect(() => {
    if (company && selectedSymbol && mainTab === 'home') {
      mountedMain.current.add('stock');
      setMainTab('stock');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.symbol]);

  function handleSelect(symbol: string) {
    onSelect(symbol);
    setMainTab('stock');
    setStockTab('valuation');
    mountedMain.current.add('stock');
    mountedStock.current.add('valuation');
  }

  function handleMainTab(tab: MainTab) {
    mountedMain.current.add(tab);
    setMainTab(tab);
  }

  function handleStockTab(tab: StockTab) {
    mountedStock.current.add(tab);
    setStockTab(tab);
  }

  const showStockContent = mainTab === 'stock';

  return (
    <div className="flex flex-col h-screen bg-terminal lg:hidden" style={{ height: '100dvh' }}>

      {/* Sticky header — includes stock sub-tabs when on stock view */}
      <header
        className="sticky top-0 z-40 bg-card backdrop-blur-xl border-b border-border flex-shrink-0"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top, 12px))' }}
      >
        {/* Main header row */}
        <div className="flex items-center justify-between px-4 pb-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <RobuLogo size={26} />
            {showStockContent && company ? (
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold font-mono text-primary">{company.symbol}</span>
                  <span className={`text-xs font-bold font-mono ${company.changePercent >= 0 ? 'text-gain' : 'text-loss'}`}>
                    {company.changePercent >= 0 ? '+' : ''}{company.changePercent.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base font-bold font-mono text-primary leading-tight">
                    ₹{company.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                  <span className={`text-[11px] font-mono ${company.changePercent >= 0 ? 'text-gain' : 'text-loss'}`}>
                    {company.changePercent >= 0 ? '+' : ''}₹{Math.abs(company.change).toFixed(1)}
                  </span>
                </div>
              </div>
            ) : mainTab === 'home' ? (
              // Home hero already shows the big wordmark; keep the header brand-free at
              // the top and fade the matching wordmark in once the user scrolls.
              <RobuWordmark height={17} className={`text-gold transition-opacity duration-200 ${scrolled ? 'opacity-100' : 'opacity-0'}`} />
            ) : (
              <span className="text-sm font-bold text-primary tracking-tight">
                {{ watchlist: 'Watchlist', portfolio: 'Portfolio', stock: 'Analysis' }[mainTab as string] || ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {showStockContent && company && (
              <>
                <span className="text-[10px] px-1.5 py-0.5 bg-accent/10 text-accent border border-accent/30 rounded-full font-mono">NSE</span>
                <div className="flex items-center gap-1 text-[10px] text-muted">
                  <div className="w-1.5 h-1.5 rounded-full bg-gain animate-pulse" />
                  <span>Live</span>
                </div>
              </>
            )}

            <ThemeToggle />
          </div>
        </div>

        {/* Stock sub-tabs */}
        {showStockContent && company && (
          <div className="flex gap-1.5 overflow-x-auto md:flex-wrap px-4 pb-2.5 no-scrollbar">
            {([
              { id: 'valuation' as StockTab,  label: 'Valuation' },
              { id: 'financials' as StockTab, label: 'Financials' },
              { id: 'profile' as StockTab,    label: 'Profile' },
            ]).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => handleStockTab(id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  stockTab === id
                    ? 'bg-gold text-terminal'
                    : 'bg-border/50 text-muted hover:text-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}
        onScroll={(e) => setScrolled((e.currentTarget as HTMLElement).scrollTop > 40)}>

        {/* ── Home ── */}
        <div className={mainTab === 'home' ? '' : 'hidden'}>
          <HomeView onSelect={handleSelect} selectedSymbol={selectedSymbol} onGoTo={handleMainTab} />
        </div>

        {/* ── Watchlist ── */}
        {mountedMain.current.has('watchlist') && (
          <div className={mainTab === 'watchlist' ? '' : 'hidden'}>
            <WatchlistView onSelectSymbol={handleSelect} currentSymbol={selectedSymbol} />
          </div>
        )}

        {/* ── Portfolio ── */}
        {mountedMain.current.has('portfolio') && (
          <div className={mainTab === 'portfolio' ? '' : 'hidden'}>
            <PortfolioView onSelectSymbol={handleSelect} />
          </div>
        )}

        {/* ── Stock analysis ── */}
        {mountedMain.current.has('stock') && (
          <div className={mainTab === 'stock' ? '' : 'hidden'}>
            {/* Valuation (hero / default) */}
            {mountedStock.current.has('valuation') && (
              <div className={stockTab === 'valuation' ? '' : 'hidden'}>
                <ValuationView
                  company={company} financials={financials}
                  assumptions={assumptions} setAssumptions={setAssumptions}
                  isLoading={isLoading} error={error} onRetry={onRetry}
                  onReset={onReset} hasChanges={hasChanges}
                />
              </div>
            )}
            {/* Financials */}
            {mountedStock.current.has('financials') && (
              <div className={stockTab === 'financials' ? '' : 'hidden'}>
                <FinancialsView company={company} financials={financials} isLoading={isLoading} error={error} onRetry={onRetry} />
              </div>
            )}
            {/* Profile */}
            {mountedStock.current.has('profile') && (
              <div className={stockTab === 'profile' ? '' : 'hidden'}>
                <ProfileView company={company} financials={financials} isLoading={isLoading} error={error} onRetry={onRetry} />
              </div>
            )}

            {/* No stock loaded yet */}
            {!company && !isLoading && (
              <div className="flex flex-col items-center justify-center h-64 gap-4 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-border/60 flex items-center justify-center">
                  <Search size={22} className="text-muted/40" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary mb-1">No stock selected</p>
                  <p className="text-xs text-muted">Go to Home and search for a stock to analyse it here.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 5-tab bottom nav */}
      <BottomNav active={mainTab} onChange={handleMainTab} hasCompany={!!company} />
    </div>
  );
}
