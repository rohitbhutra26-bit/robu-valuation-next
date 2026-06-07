'use client';

import React, { useState, useRef } from 'react';
import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import {
  Search, TrendingUp, SlidersHorizontal, Sparkles, Table2, Users,
  AlertTriangle, Pencil, RotateCcw, Bookmark, Briefcase, Filter,
  ChevronRight,
} from '@/lib/icons';
import ThemeToggle from './ThemeToggle';
import { getSectorProfile, getCompanyProfile } from '@/lib/sectorModelMap';
import CompanySearch from './CompanySearch';
import AIOverview from './AIOverview';
import ScenarioCards from './ScenarioCards';
import FinancialsTable from './FinancialsTable';
import ValuationEngine from './ValuationEngine';
import EarningsQuality from './EarningsQuality';
import WhatMustHappen from './WhatMustHappen';
import HistoricalValuationChart from './HistoricalValuationChart';
import ForecastChart from './ForecastChart';
import IndustryBenchmarks from './IndustryBenchmarks';
import PeerCompare from './PeerCompare';
import VerdictCard from './VerdictCard';
import WatchlistView from './WatchlistView';
import PortfolioView from './PortfolioView';
import StockScreener from './StockScreener';
import ROBUScoreCard from './ROBUScoreCard';
import ScenarioBuilder from './ScenarioBuilder';
import AnnouncementsFeed from './AnnouncementsFeed';
import SectorAlternatives from './SectorAlternatives';
import PriceChart from './PriceChart';
import { getBaselineFinancial } from '@/lib/forecastUtils';

// ─── Tab types ────────────────────────────────────────────────────────────────
type MainTab  = 'home' | 'watchlist' | 'portfolio' | 'stock';
type StockTab = 'overview' | 'valuation' | 'ai' | 'peers' | 'financials';

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
      <text x="50" y="79"
        fontFamily="Lora, Georgia, 'Times New Roman', serif"
        fontSize="82" fontWeight="700" fill="#C4511A"
        textAnchor="middle" dominantBaseline="auto">R</text>
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
      <div className="bg-card backdrop-blur-xl border-t border-border flex">
        {tabs.map(({ id, label, icon }) => {
          const disabled = id === 'stock' && !hasCompany;
          const isOn = active === id;
          return (
            <button
              key={id}
              onClick={() => !disabled && onChange(id)}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors min-w-0
                ${disabled ? 'opacity-25 cursor-not-allowed' : ''}`}
            >
              {icon}
              <span className={`text-[9px] font-medium leading-none ${isOn ? 'text-gold' : 'text-muted'}`}>
                {label}
              </span>
              {isOn && <div className="w-4 h-0.5 rounded-full bg-gold mt-0.5" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ─── Stock Sub-tabs (horizontal scroll) ──────────────────────────────────────
function StockSubNav({
  active, onChange,
}: { active: StockTab; onChange: (t: StockTab) => void }) {
  const tabs: { id: StockTab; label: string }[] = [
    { id: 'overview',   label: 'Overview' },
    { id: 'valuation',  label: 'Valuation' },
    { id: 'ai',         label: 'AI' },
    { id: 'peers',      label: 'Peers' },
    { id: 'financials', label: 'Data' },
  ];
  return (
    <div className="flex gap-1.5 overflow-x-auto px-4 py-2 border-b border-border bg-card/95 backdrop-blur-xl no-scrollbar">
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
    home:      'Robu Terminal',
    
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
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 px-6">
      <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      <div className="text-center">
        <p className="text-sm text-muted">Loading {symbol || '…'}</p>
        <p className="text-xs text-muted/50 mt-1">Fetching live data from NSE/BSE</p>
      </div>
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
  const chips = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'WIPRO', 'BAJFINANCE', 'TATAMOTORS', 'SBIN', 'ADANIENT', 'ANGELONE', 'KAYNES'];

  const shortcuts = [
    {
      id: 'screener' as MainTab,
      title: 'Stock Screener',
      desc: 'Filter all NSE stocks by ROE, P/E, margin & more',
      Icon: Filter,
      color: 'text-accent',
      bg: 'bg-accent/10',
      border: 'border-accent/20',
    },
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
    <div className="flex flex-col px-4 pb-32">
      {/* Hero */}
      <div className="flex flex-col items-center pt-12 pb-6 px-4">
        <RobuLogo size={60} />
        <h1 className="text-3xl font-bold text-primary mt-4 tracking-tight font-serif">Robu Terminal</h1>
        <p className="text-sm text-muted mt-2 text-center leading-relaxed">
          Find out if any Indian stock is{' '}
          <span className="font-semibold text-primary">cheap</span>,{' '}
          <span className="font-semibold text-primary">fair</span>, or{' '}
          <span className="font-semibold text-primary">expensive</span>.
        </p>
      </div>

      {/* Search */}
      <div className="mb-5">
        <CompanySearch onSelect={onSelect} selectedSymbol={selectedSymbol} />
      </div>

      {/* Utility shortcuts */}
      <div className="space-y-2 mb-5">
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
              <p className="text-[11px] text-muted mt-0.5 truncate">{s.desc}</p>
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

// ─── Overview View ────────────────────────────────────────────────────────────
function OverviewView({ company, financials, assumptions, isLoading, error, onRetry }: {
  company: Company | null; financials: FinancialYear[]; assumptions: ValuationAssumptions;
  isLoading: boolean; error: string | null; onRetry: () => void;
}) {
  if (isLoading) return <MobileLoader symbol="…" />;
  if (error) return <MobileError message={error} onRetry={onRetry} />;
  if (!company) return null;

  const isPos = company.changePercent >= 0;
  const low = company.week52Low;
  const high = company.week52High;
  const pct = high > low ? Math.max(2, Math.min(98, ((company.currentPrice - low) / (high - low)) * 100)) : 50;
  const latest = financials.length > 0 ? financials[financials.length - 1] : null;

  const stats = [
    { label: 'Market Cap',    value: fmt(company.marketCap) },
    { label: 'P/E Ratio',    value: `${company.pe.toFixed(1)}x`,             color: 'text-gold' },
    { label: 'P/B Ratio',    value: `${company.pb.toFixed(1)}x` },
    { label: 'ROE',          value: `${company.roe.toFixed(1)}%`,            color: company.roe >= 20 ? 'text-gain' : company.roe >= 12 ? 'text-gold' : 'text-loss' },
    { label: 'Debt/Equity',  value: `${company.debtToEquity.toFixed(2)}x`,   color: company.debtToEquity < 1 ? 'text-gain' : company.debtToEquity < 3 ? 'text-gold' : 'text-loss' },
    { label: 'Div Yield',    value: `${company.dividendYield.toFixed(2)}%` },
  ];

  return (
    <div className="px-4 pt-4 pb-32 space-y-3">
      <VerdictCard company={company} financials={financials} assumptions={assumptions} />

      {/* Price card */}
      <div className="bg-card rounded-2xl p-4 border border-border">
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-gold tracking-wider">{company.symbol}</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-border/60 rounded text-muted max-w-[140px] truncate">{company.sector}</span>
          </div>
          <h2 className="text-base font-bold text-primary leading-snug line-clamp-2">{company.name}</h2>
        </div>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-3xl font-bold font-mono text-primary leading-none">
            ₹{company.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className={`flex items-center flex-wrap gap-x-2 gap-y-0.5 text-sm font-semibold font-mono mb-4 ${isPos ? 'text-gain' : 'text-loss'}`}>
          <span>{isPos ? '+' : ''}₹{Math.abs(company.change).toFixed(2)}</span>
          <span>({isPos ? '+' : ''}{company.changePercent.toFixed(2)}%)</span>
          <span className="text-xs text-muted font-normal">today</span>
        </div>
        <div className="flex justify-between text-[10px] text-muted mb-1.5 gap-2">
          <span className="truncate">52W Low ₹{low.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          <span className="flex-shrink-0">52W High ₹{high.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
        </div>
        <div className="relative h-2 bg-border rounded-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-loss via-gold to-gain opacity-30 rounded-full" />
          <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-gold bg-terminal"
            style={{ left: `calc(${pct}% - 7px)` }} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {stats.map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-3">
            <p className="text-[10px] text-muted mb-1 uppercase tracking-wide">{s.label}</p>
            <p className={`text-base font-bold font-mono ${s.color || 'text-primary'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Latest Financials */}
      {latest && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[10px] text-muted uppercase tracking-wider mb-3 font-semibold">Last reported — {latest.year}</p>
          <div className="space-y-2.5">
            {[
              { label: 'Revenue',         value: fmt(latest.revenue) },
              { label: 'Net Profit (PAT)',value: fmt(latest.pat), color: latest.pat > 0 ? 'text-gain' : 'text-loss' },
              { label: 'EBITDA Margin',   value: `${latest.ebitdaMargin.toFixed(1)}%`, color: latest.ebitdaMargin >= 20 ? 'text-gain' : latest.ebitdaMargin >= 12 ? 'text-gold' : 'text-primary' },
              { label: 'Net Margin',      value: `${latest.netMargin.toFixed(1)}%` },
              { label: 'EPS',             value: `₹${latest.eps.toFixed(1)}` },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-muted">{r.label}</span>
                <span className={`text-sm font-semibold font-mono ${r.color || 'text-primary'}`}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
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

  return (
    <div className="px-4 pt-4 pb-32 space-y-4">
      <VerdictCard company={company} financials={financials} assumptions={assumptions} />

      <div className="bg-card border border-border rounded-2xl p-4 space-y-5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
            <Pencil size={12} className="text-accent" />
          </div>
          <h3 className="text-sm font-semibold text-primary">Your assumptions</h3>
          <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
            {hasChanges && (
              <button onClick={onReset} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-loss border border-loss/30 bg-loss/5 active:scale-95 transition-all">
                <RotateCcw size={11} /> Reset
              </button>
            )}
            <span className="text-[10px] text-gold font-mono bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded">
              {sectorProfile.sectorLabel}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted -mt-3">Adjust to see how the target price changes</p>
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
            hint={`Of ₹100 earned, how much stays as profit? Actual: ${latest.netMargin.toFixed(1)}%`}
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
        <div>
          <p className="text-sm text-muted mb-2">Projection horizon</p>
          <div className="flex gap-2">
            {[3, 5, 7, 10].map(y => (
              <button
                key={y}
                onClick={() => setAssumptions(a => ({ ...a, years: y }))}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold font-mono transition-all active:scale-95 ${
                  assumptions.years === y ? 'bg-gold text-terminal' : 'bg-border text-primary/70'
                }`}
              >
                {y}Y
              </button>
            ))}
          </div>
        </div>
      </div>

      <PriceChart company={company} financials={financials} />
      <ForecastChart financials={financials} assumptions={assumptions} />
      <ScenarioCards financials={financials} assumptions={assumptions} currentPrice={company.currentPrice} company={company} compact />
      <ValuationEngine company={company} financials={financials} assumptions={assumptions} compact />
      {financials.length >= 3 && <ROBUScoreCard company={company} financials={financials} />}
      <ScenarioBuilder company={company} financials={financials} />
      <AnnouncementsFeed company={company} />
      <SectorAlternatives company={company} onSelectSymbol={() => {}} />
      <WhatMustHappen company={company} financials={financials} assumptions={assumptions} />
    </div>
  );
}

// ─── AI View ──────────────────────────────────────────────────────────────────
function AIView({ company, financials, isLoading, error, onRetry }: {
  company: Company | null; financials: FinancialYear[]; isLoading: boolean; error: string | null; onRetry: () => void;
}) {
  if (isLoading) return <MobileLoader symbol="…" />;
  if (error) return <MobileError message={error} onRetry={onRetry} />;
  if (!company) return null;
  return (
    <div className="px-4 pt-4 pb-32 space-y-4">
      <AIOverview company={company} financials={financials} />
      <HistoricalValuationChart company={company} />
      <IndustryBenchmarks company={company} financials={financials} />
    </div>
  );
}

// ─── Peers View ───────────────────────────────────────────────────────────────
function PeersView({ company, isLoading, error, onRetry }: {
  company: Company | null; isLoading: boolean; error: string | null; onRetry: () => void;
}) {
  if (isLoading) return <MobileLoader symbol="…" />;
  if (error) return <MobileError message={error} onRetry={onRetry} />;
  if (!company) return null;
  return (
    <div className="pt-4 pb-32">
      <div className="px-4 mb-3">
        <h3 className="text-sm font-semibold text-primary">Peer Comparison</h3>
        <p className="text-xs text-muted mt-0.5">How {company.symbol} stacks up — scroll right →</p>
      </div>
      <div className="overflow-x-auto px-4">
        <PeerCompare company={company} />
      </div>
    </div>
  );
}

// ─── Financials View ──────────────────────────────────────────────────────────
function FinancialsView({ financials, isLoading, error, onRetry }: {
  financials: FinancialYear[]; isLoading: boolean; error: string | null; onRetry: () => void;
}) {
  if (isLoading) return <MobileLoader symbol="…" />;
  if (error) return <MobileError message={error} onRetry={onRetry} />;
  if (financials.length === 0) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-sm text-muted px-6 text-center">No financial history available</p>
    </div>
  );
  return (
    <div className="pt-4 pb-32">
      <div className="px-4 mb-3">
        <h3 className="text-sm font-semibold text-primary">Financial History</h3>
        <p className="text-xs text-muted mt-0.5">Scroll right to see all years →</p>
      </div>
      <div className="overflow-x-auto px-4">
        <FinancialsTable financials={financials} />
      </div>
      <div className="px-4 mt-4">
        <EarningsQuality financials={financials} />
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
  const [stockTab, setStockTab] = useState<StockTab>('overview');

  const mountedMain  = useRef<Set<MainTab>>(new Set<MainTab>(['home']));
  const mountedStock = useRef<Set<StockTab>>(new Set<StockTab>(['overview']));

  function handleSelect(symbol: string) {
    onSelect(symbol);
    setMainTab('stock');
    setStockTab('overview');
    mountedMain.current.add('stock');
    mountedStock.current.add('overview');
  }

  function handleMainTab(tab: MainTab) {
    mountedMain.current.add(tab);
    setMainTab(tab);
  }

  function handleStockTab(tab: StockTab) {
    mountedStock.current.add(tab);
    setStockTab(tab);
  }

  // When screener selects a symbol, go to stock tab
  function handleScreenerSelect(symbol: string) {
    handleSelect(symbol);
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
            ) : (
              <span className="text-sm font-bold text-primary tracking-tight">
                {{ home: 'Robu Terminal', watchlist: 'Watchlist', portfolio: 'Portfolio', stock: 'Analysis' }[mainTab as string] || 'Robu Terminal'}
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
          <div className="flex gap-1.5 overflow-x-auto px-4 pb-2.5 no-scrollbar">
            {([
              { id: 'overview' as StockTab,   label: 'Overview' },
              { id: 'valuation' as StockTab,  label: 'Valuation' },
              { id: 'ai' as StockTab,         label: 'AI' },
              { id: 'peers' as StockTab,      label: 'Peers' },
              { id: 'financials' as StockTab, label: 'Data' },
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
      <main className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>

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
            {/* Overview */}
            {mountedStock.current.has('overview') && (
              <div className={stockTab === 'overview' ? '' : 'hidden'}>
                <OverviewView
                  company={company} financials={financials} assumptions={assumptions}
                  isLoading={isLoading} error={error} onRetry={onRetry}
                />
              </div>
            )}
            {/* Valuation */}
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
            {/* AI */}
            {mountedStock.current.has('ai') && (
              <div className={stockTab === 'ai' ? '' : 'hidden'}>
                <AIView company={company} financials={financials} isLoading={isLoading} error={error} onRetry={onRetry} />
              </div>
            )}
            {/* Peers */}
            {mountedStock.current.has('peers') && (
              <div className={stockTab === 'peers' ? '' : 'hidden'}>
                <PeersView company={company} isLoading={isLoading} error={error} onRetry={onRetry} />
              </div>
            )}
            {/* Financials */}
            {mountedStock.current.has('financials') && (
              <div className={stockTab === 'financials' ? '' : 'hidden'}>
                <FinancialsView financials={financials} isLoading={isLoading} error={error} onRetry={onRetry} />
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
