'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import { getSectorProfile, getCompanyProfile, getIndustryCagr } from '@/lib/sectorModelMap';
import { suggestAssumptions, validateFinancials, DataQualityResult } from '@/lib/forecastUtils';
import DataQualityBanner from '@/components/DataQualityBanner';
import CompanySearch from '@/components/CompanySearch';
import CompanyHeader from '@/components/CompanyHeader';
import WatchlistView from '@/components/WatchlistView';
import PortfolioView from '@/components/PortfolioView';
import QuarterlyFlash from '@/components/QuarterlyFlash';
import ExportReport, { PrintableReport } from '@/components/ExportReport';
import AddToPortfolioModal from '@/components/AddToPortfolioModal';
import KeyMetrics from '@/components/KeyMetrics';
import AIOverview from '@/components/AIOverview';
import FinancialsTable from '@/components/FinancialsTable';
import ScenarioCards from '@/components/ScenarioCards';
import SensitivityMatrix from '@/components/SensitivityMatrix';
import IndustryBenchmarks from '@/components/IndustryBenchmarks';
import ValuationEngine from '@/components/ValuationEngine';
import EarningsQuality from '@/components/EarningsQuality';
import WhatMustHappen from '@/components/WhatMustHappen';
import ReverseDCF from '@/components/ReverseDCF';
import MonteCarloCard from '@/components/MonteCarloCard';
import RedFlagsCard from '@/components/RedFlagsCard';
import HistoricalValuationChart from '@/components/HistoricalValuationChart';
import PriceChart from '@/components/PriceChart';
import ForecastChart from '@/components/ForecastChart';
import SectorAlternatives from '@/components/SectorAlternatives';
import ScenarioBuilder from '@/components/ScenarioBuilder';
import SectionHeader from '@/components/SectionHeader';
import StickyTicker from '@/components/StickyTicker';
import ROBUScoreCard from '@/components/ROBUScoreCard';
import AnnouncementsFeed from '@/components/AnnouncementsFeed';
import MobileLayout, { RobuLogo } from '@/components/MobileLayout';
import VerdictCard from '@/components/VerdictCard';
import ValuationCaveatBanner from '@/components/ValuationCaveatBanner';
import WealthProjection from '@/components/WealthProjection';
import ThemeToggle from '@/components/ThemeToggle';
import ModeToggle from '@/components/ModeToggle';
import { Calculator, BarChart3, Sparkles, SlidersHorizontal, Zap, X as XIcon, RotateCcw, Bookmark, Briefcase, Radar, ShieldAlert, LineChart, Activity, Table2, BadgeCheck, DollarSign, ChevronRight } from '@/lib/icons';
import DiscoveryView from '@/components/DiscoveryView';
import { getWatchlist, isInWatchlist, toggleWatchlist } from '@/lib/watchlist';
import { getPortfolio, isInPortfolio } from '@/lib/portfolio';

// ── Session-level cache — survives re-renders, cleared on page refresh ────────
// Like a hedge fund's in-memory data store — once fetched, instant on re-visit
const _sessionCache = new Map<string, { company: Company; financials: FinancialYear[] }>();
// Track in-flight prefetch promises to avoid duplicate network calls
const _inflight = new Map<string, Promise<void>>();

const QUICK_PICKS = ['RELIANCE','TCS','INFY','HDFCBANK','ICICIBANK','WIPRO','BAJFINANCE','KAYNES','TMPV','TMCV','SBIN','ADANIENT','BHARTIARTL'];

type ActiveView = 'discovery' | 'valuation' | 'watchlist' | 'portfolio';

// ─── Nav item definition ───────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NAV_ITEMS: { view: ActiveView; Icon: any; label: string; desc: string; badge?: string; global?: boolean }[] = [
  { view: 'discovery',  Icon: Radar,      label: 'Discovery',    desc: 'Ideas found for you', badge: 'NEW', global: true },
  { view: 'valuation',  Icon: Calculator, label: 'Report',       desc: 'Full stock analysis'        },
  { view: 'watchlist',  Icon: Bookmark,   label: 'Watchlist',    desc: 'Saved stocks',  global: true },
  { view: 'portfolio',  Icon: Briefcase,  label: 'Portfolio',    desc: 'Your holdings', global: true },

];

export default function Home() {
  const [company, setCompany]       = useState<Company | null>(null);
  const [financials, setFinancials] = useState<FinancialYear[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [homeMode, setHomeMode]     = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>('valuation');
  const [autoFillLabel, setAutoFillLabel] = useState<string | null>(null);
  const [dataQuality, setDataQuality]     = useState<DataQualityResult | null>(null);
  const [assumptions, setAssumptions] = useState<ValuationAssumptions>({
    revenueGrowthRate: 15,
    netMarginAssumption: 20,
    exitPE: 25,
    exitMultiple: 25,
    years: 5,
    wacc: 12,
    marginOfSafety: 25,
  });
  // Store the suggested defaults so Reset always goes back to what the algorithm picked
  const defaultAssumptionsRef = useRef<ValuationAssumptions>({
    revenueGrowthRate: 15,
    netMarginAssumption: 20,
    exitPE: 25,
    exitMultiple: 25,
    years: 5,
    wacc: 12,
    marginOfSafety: 25,
  });
  const defaultAutoFillLabelRef = useRef<string | null>(null);

  // ── Watchlist state ──────────────────────────────────────────────────────
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [isWatchlisted, setIsWatchlisted]   = useState(false);

  // Sync watchlist count + current-stock bookmark state
  useEffect(() => {
    const sync = () => {
      setWatchlistCount(getWatchlist().length);
      if (company) setIsWatchlisted(isInWatchlist(company.symbol));
    };
    sync();
    window.addEventListener('robu_watchlist_change', sync);
    return () => window.removeEventListener('robu_watchlist_change', sync);
  }, [company]);

  function handleWatchlistToggle() {
    if (!company) return;
    const added = toggleWatchlist({ symbol: company.symbol, name: company.name, sector: company.sector });
    setIsWatchlisted(added);
  }

  // ── Portfolio state ──────────────────────────────────────────────────────
  const [portfolioCount, setPortfolioCount] = useState(0);
  const [isPortfolioStock, setIsPortfolioStock] = useState(false);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);

  useEffect(() => {
    const sync = () => {
      setPortfolioCount(getPortfolio().length);
      if (company) setIsPortfolioStock(isInPortfolio(company.symbol));
    };
    sync();
    window.addEventListener('robu_portfolio_change', sync);
    return () => window.removeEventListener('robu_portfolio_change', sync);
  }, [company]);

  function handlePortfolioToggle() {
    if (!company) return;
    setShowPortfolioModal(true);
  }

  // Reveal the full deep-dive: flip the whole app into Analyst mode.
  // Mirrors ModeToggle — sets data-mode on <html>, persisted in localStorage.
  function switchToAnalyst() {
    document.documentElement.setAttribute('data-mode', 'analyst');
    try { localStorage.setItem('robu-mode', 'analyst'); } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── URL persistence: restore stock from ?symbol= on page load ────────────
  // Read directly from window.location — no useSearchParams/Suspense needed.
  // On refresh: URL has ?symbol=RELIANCE → we auto-load that stock.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sym = params.get('symbol');
    if (sym) {
      const clean = sym.toUpperCase();
      setSelectedSymbol(clean);
      setHomeMode(false);
      loadCompany(clean);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Core fetch logic (shared by load + prefetch) ─────────────────────────
  async function _fetchSymbol(symbol: string): Promise<{ company: Company; financials: FinancialYear[] }> {
    // Try Screener.in-backed endpoints first; fall back to Yahoo if unavailable
    const [companyRes, financialsRes] = await Promise.all([
      fetch(`/api/company-v2/${symbol}`, { cache: 'no-store' })
        .then(r => r.ok ? r : fetch(`/api/company/${symbol}`, { cache: 'no-store' }))
        .catch(() => fetch(`/api/company/${symbol}`, { cache: 'no-store' })),
      fetch(`/api/financials-v2/${symbol}`, { cache: 'no-store' })
        .then(r => r.ok ? r : fetch(`/api/financials/${symbol}`, { cache: 'no-store' }))
        .catch(() => fetch(`/api/financials/${symbol}`, { cache: 'no-store' })),
    ]);
    if (!companyRes.ok) {
      const err = await companyRes.json().catch(() => ({}));
      throw new Error(err.error || `Failed to load ${symbol}`);
    }
    const raw: any = await companyRes.json();
    // Normalize: the data server sometimes returns a partial object (missing
    // symbol/sector/eps/52w when its live source degrades). Guarantee the
    // fields the UI relies on so a thin response never white-screens the app.
    const companyData: Company = {
      ...raw,
      symbol: raw.symbol || symbol.toUpperCase(),
      name: raw.name || symbol.toUpperCase(),
      sector: raw.sector || '',
      industry: raw.industry || '',
      currentPrice: raw.currentPrice || 0,
      marketCap: raw.marketCap || 0,
      pe: raw.pe || 0,
      pb: raw.pb || 0,
      roe: raw.roe || 0,
      debtToEquity: raw.debtToEquity ?? 0,
      dividendYield: raw.dividendYield || 0,
      change: raw.change || 0,
      changePercent: raw.changePercent || 0,
      week52High: raw.week52High || 0,
      week52Low: raw.week52Low || 0,
      eps: raw.eps ?? 0,
    };
    let fins: FinancialYear[] = [];
    if (financialsRes.ok) {
      fins = await financialsRes.json();
      const sharesInCr = companyData.shares && companyData.shares > 0 ? companyData.shares : 1;
      fins = fins.map(f => ({ ...f, shares: f.shares && f.shares > 0 ? f.shares : sharesInCr }));
    }
    return { company: companyData, financials: fins };
  }

  // ── Load company — checks session cache first ─────────────────────────────
  const loadCompany = useCallback(async (symbol: string) => {
    setIsLoading(true);
    setError(null);
    setActiveView('valuation');

    // Cache hit → instant render, no spinner
    if (_sessionCache.has(symbol)) {
      const cached = _sessionCache.get(symbol)!;
      setCompany(cached.company);
      setFinancials(cached.financials);
      _applyAssumptions(cached.company, cached.financials);
      setIsLoading(false);
      return;
    }

    setCompany(null);
    setFinancials([]);

    try {
      // If a prefetch is already in-flight for this symbol, wait for it
      if (_inflight.has(symbol)) await _inflight.get(symbol);
      // Then try cache again (prefetch may have just populated it)
      if (_sessionCache.has(symbol)) {
        const cached = _sessionCache.get(symbol)!;
        setCompany(cached.company);
        setFinancials(cached.financials);
        _applyAssumptions(cached.company, cached.financials);
        setIsLoading(false);
        return;
      }
      const result = await _fetchSymbol(symbol);
      _sessionCache.set(symbol, result);
      setCompany(result.company);
      setFinancials(result.financials);
      _applyAssumptions(result.company, result.financials);
    } catch (err: any) {
      setError(err.message || 'Failed to load company data');
    } finally {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Apply assumptions — intelligent auto-fill ────────────────────────────
  // Uses suggestAssumptions() which:
  //   1. Reads analyst consensus growth from Yahoo Finance (earningsGrowth)
  //   2. Falls back to historical revenue CAGR from financials[]
  //   3. Fades that growth toward India sector CAGR over the forecast period
  //   4. Sets net margin from recent 3yr average actuals
  //   5. Sets exit multiple from sector-appropriate default
  // → User sees pre-filled, intelligent numbers on load. Zero manual input needed.
  function _applyAssumptions(companyData: Company, fins: FinancialYear[]) {
    const sectorProfile = getCompanyProfile(companyData);
    // Use sectorLabel (clean: "Conglomerate / Energy") not raw sector (may be "ril.com")
    const industryCagr  = getIndustryCagr(sectorProfile.sectorLabel);

    // Run data validator first — winsorise outlier years before feeding to model
    const dq = validateFinancials(fins, companyData);
    setDataQuality(dq);

    // Use cleaned financials (outliers capped); fall back to raw if cleaner is empty
    const cleanFins = dq.cleanedFinancials.length > 0 ? dq.cleanedFinancials : fins;

    // Single call to suggestAssumptions — uses fade model + India sector CAGR
    const suggested = suggestAssumptions(
      companyData,
      cleanFins,
      industryCagr,
      sectorProfile.defaultExitMultiple,
      5,
    );

    const freshAssumptions: ValuationAssumptions = {
      revenueGrowthRate:   suggested.revenueGrowthRate,
      netMarginAssumption: suggested.netMarginAssumption,
      exitPE:  Math.min(Math.max(Math.round(companyData.pe || 25), 5), 100),
      exitMultiple: suggested.exitMultiple,
      wacc: 12,
      marginOfSafety: 25,
      years: 5,
    };
    setAssumptions(freshAssumptions);
    // Save as the canonical defaults for this company — Reset will come back here
    defaultAssumptionsRef.current = freshAssumptions;

    const sourceLabel =
      suggested.source === 'analyst_guidance' ? '⚡ Analyst consensus' :
      suggested.source === 'historical_cagr'  ? '📈 Historical CAGR' :
                                                '🏭 Sector baseline';
    const label = `${sourceLabel} · ${suggested.confidence} confidence · ${suggested.rationale}`;
    setAutoFillLabel(label);
    defaultAutoFillLabelRef.current = label;
  }

  // ── Reset assumptions back to what the algorithm suggested on load ──────────
  function resetAssumptions() {
    setAssumptions({ ...defaultAssumptionsRef.current });
    setAutoFillLabel(defaultAutoFillLabelRef.current);
  }

  // True if user has changed any value from the algorithm's suggestion
  const hasChanges = company && (
    assumptions.revenueGrowthRate   !== defaultAssumptionsRef.current.revenueGrowthRate   ||
    assumptions.netMarginAssumption !== defaultAssumptionsRef.current.netMarginAssumption ||
    assumptions.exitMultiple        !== defaultAssumptionsRef.current.exitMultiple         ||
    assumptions.years               !== defaultAssumptionsRef.current.years
  );

  // ── Prefetch on hover — fires 200ms after hover to avoid noise ────────────
  const prefetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handlePrefetch(symbol: string) {
    if (_sessionCache.has(symbol) || _inflight.has(symbol)) return;
    prefetchTimer.current = setTimeout(() => {
      const p = _fetchSymbol(symbol)
        .then(result => { _sessionCache.set(symbol, result); })
        .catch(() => {})
        .finally(() => { _inflight.delete(symbol); });
      _inflight.set(symbol, p);
    }, 200);
  }
  function cancelPrefetch() {
    if (prefetchTimer.current) clearTimeout(prefetchTimer.current);
  }

  function handleSelect(symbol: string) {
    cancelPrefetch();
    const clean = symbol.toUpperCase();
    setSelectedSymbol(clean);
    setHomeMode(false);
    // Push symbol to URL so page refresh restores the same stock
    window.history.replaceState(null, '', `?symbol=${clean}`);
    loadCompany(clean);
  }

  function goHome() {
    setHomeMode(true);
    setCompany(null);
    setFinancials([]);
    setError(null);
    setSelectedSymbol('');
    setActiveView('valuation');
    // Clear the URL param when going back to home
    window.history.replaceState(null, '', '/');
  }

  const latest = financials.length > 0 ? financials[financials.length - 1] : null;

  return (
    <>
    {/* ── Portfolio modal (global overlay) ── */}
    {showPortfolioModal && company && (
      <AddToPortfolioModal company={company} onClose={() => setShowPortfolioModal(false)} />
    )}

    {/* ── Printable report (hidden on screen, shown when printing) ── */}
    {company && financials.length > 0 && (
      <PrintableReport company={company} financials={financials} assumptions={assumptions} />
    )}

    {/* ═══════════════════ MOBILE ═══════════════════ */}
    <MobileLayout
      company={company}
      financials={financials}
      selectedSymbol={selectedSymbol}
      isLoading={isLoading}
      error={error}
      assumptions={assumptions}
      setAssumptions={setAssumptions}
      onSelect={handleSelect}
      onRetry={() => loadCompany(selectedSymbol)}
      onReset={resetAssumptions}
      hasChanges={!!hasChanges}
    />

    {/* ═══════════════════ DESKTOP ══════════════════ */}
    <div className="hidden lg:flex h-screen bg-terminal flex-col overflow-hidden">

      {/* ── Header ────────────────────────────────────────── */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40 flex-shrink-0">
        <div className="flex items-center justify-between px-5 py-2.5">
          <button onClick={goHome} className="flex items-center gap-3 group">
            <RobuLogo size={30} />
            <div className="text-left">
              <p className="text-sm font-bold text-primary tracking-tight font-serif group-hover:text-gold transition-colors">Robu</p>
              <p className="text-[11px] text-muted leading-none">Stocks in plain English</p>
            </div>
          </button>

          {!homeMode && (
            <div className="w-[480px]">
              <CompanySearch onSelect={handleSelect} selectedSymbol={selectedSymbol} />
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Discovery — prominent primary entry point */}
            <button
              onClick={() => { setHomeMode(false); setActiveView('discovery'); }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeView === 'discovery'
                  ? 'bg-gold text-terminal shadow-sm'
                  : 'bg-gold/10 border border-gold/40 text-gold hover:bg-gold/20'
              }`}
            >
              <Radar size={13} />
              Discovery
              <span className={`text-[8px] font-bold px-1 py-0.5 rounded leading-none ${
                activeView === 'discovery' ? 'bg-terminal/20 text-terminal' : 'bg-gain/15 text-gain'
              }`}>NEW</span>
            </button>

            {/* Global nav shortcuts */}
            {([
              { view: 'watchlist' as ActiveView, Icon: Bookmark,  label: 'Watchlist', count: watchlistCount },
              { view: 'portfolio' as ActiveView, Icon: Briefcase, label: 'Portfolio',  count: portfolioCount },

            ]).map(({ view, Icon, label, count }) => (
              <button
                key={view}
                onClick={() => { setHomeMode(false); setActiveView(view); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                  activeView === view
                    ? 'bg-gold/10 border-gold/30 text-gold'
                    : 'bg-transparent border-border text-muted hover:text-primary hover:border-gold/30'
                }`}
              >
                <Icon size={12} />
                {label}
                {count > 0 && (
                  <span className="bg-gold text-terminal text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {count}
                  </span>
                )}
              </button>
            ))}
            <a
              href="/pricing"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                display: 'none',
                background: 'linear-gradient(135deg, #2962ff 0%, #1565c0 100%)',
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(41,98,255,0.35)',
                border: 'none',
              }}
            >
              ⚡ Pro
            </a>
            <ModeToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ── Home landing ──────────────────────────────────── */}
      {homeMode && (
        <main className="flex-1 flex items-center justify-center overflow-y-auto">
          <div className="w-full max-w-[680px] px-8 py-14 flex flex-col items-center">

            {/* Logo — friendly indigo R */}
            <RobuLogo size={76} />

            {/* Heading — friendly sans */}
            <h1 className="mt-6 text-6xl font-bold text-primary tracking-tight font-serif">
              Robu
            </h1>
            <p className="mt-5 text-2xl text-primary font-semibold text-center leading-snug max-w-[520px]">
              Should you buy this stock? Find out in 10 seconds.
            </p>
            <p className="mt-3 text-base text-muted text-center leading-relaxed max-w-[480px]">
              Type any Indian stock. Robu tells you if it looks{' '}
              <em className="not-italic font-semibold text-gain">cheap</em>,{' '}
              <em className="not-italic font-semibold text-warning">fair</em>, or{' '}
              <em className="not-italic font-semibold text-loss">expensive</em>{' '}
              — explained simply, no finance degree needed.
            </p>

            {/* Search — pill shape */}
            <div className="w-full mt-10 [&_input]:text-base [&_input]:py-4 [&_input]:pl-12 [&_input]:pr-10 [&_input]:rounded-2xl [&_svg]:w-5 [&_svg]:h-5">
              <CompanySearch onSelect={handleSelect} selectedSymbol={selectedSymbol} />
            </div>

            {/* Discovery — prominent hero entry point */}
            <button
              onClick={() => { setHomeMode(false); setActiveView('discovery'); }}
              className="group w-full mt-6 flex items-center gap-4 text-left bg-gold/10 border border-gold/30 rounded-2xl p-5 hover:bg-gold/15 hover:border-gold/50 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center flex-shrink-0">
                <Radar size={22} className="text-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-primary">Discovery</p>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gain/15 text-gain border border-gain/20 leading-none">NEW</span>
                </div>
                <p className="text-xs text-muted leading-snug mt-0.5">
                  Don&apos;t know what to look for? ROBU scans the market overnight and hands you ideas.
                </p>
              </div>
              <span className="flex items-center gap-1 text-xs font-bold text-gold flex-shrink-0">
                Explore <span className="text-sm leading-none group-hover:translate-x-0.5 transition-transform">→</span>
              </span>
            </button>

            {/* Feature cards — left-aligned, editorial style */}
            <div className="w-full mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                {
                  Icon: BarChart3, iconBg: 'bg-gold/10', iconColor: 'text-gold',
                  title: 'Value it',
                  body: 'Is the stock cheap or expensive?',
                  cta: 'Run valuation',
                  view: 'valuation' as ActiveView,
                },
                {
                  Icon: Sparkles, iconBg: 'bg-gain/10', iconColor: 'text-gain',
                  title: 'AI analysis',
                  body: 'Plain-English bull & bear case',
                  cta: 'Read the case',
                  view: 'valuation' as ActiveView,
                },
              ]).map(tile => (
                <div key={tile.title} className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3">
                  <div className={`w-10 h-10 rounded-xl ${tile.iconBg} border border-border flex items-center justify-center flex-shrink-0`}>
                    <tile.Icon size={18} className={tile.iconColor} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary mb-1">{tile.title}</p>
                    <p className="text-xs text-muted leading-snug">{tile.body}</p>
                  </div>
                  <button
                    onClick={() => { setHomeMode(false); setActiveView(tile.view); }}
                    className="flex items-center gap-1 text-xs font-semibold text-gold hover:text-gold/80 transition-colors self-start"
                  >
                    {tile.cta} <span className="text-sm leading-none">→</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Quick picks */}
            <div className="w-full mt-8">
              <p className="text-[10px] uppercase tracking-[1.5px] text-muted/70 mb-3 font-semibold">
                Popular stocks to try
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_PICKS.map((sym) => (
                  <button
                    key={sym}
                    onClick={() => handleSelect(sym)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold border border-border text-muted bg-transparent hover:text-primary hover:border-gold/40 hover:bg-card transition-all"
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-10 text-xs text-muted/50 text-center">
              Search any NSE or BSE listed company by name or symbol
            </p>
          </div>
        </main>
      )}

      {/* ── Stock analysis layout ─────────────────────────── */}
      {!homeMode && (
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT NAV SIDEBAR ─────────────────────────── */}
          <aside className="w-[168px] flex-shrink-0 border-r border-border bg-terminal flex flex-col overflow-hidden">

            {/* Navigation */}
            <div className="p-2 pt-3">
              <p className="text-[10px] text-muted/85 uppercase tracking-[1.5px] font-semibold px-2 mb-2">Analyse</p>
              {NAV_ITEMS.map(item => {
                const isActive = activeView === item.view;
                return (
                  <button
                    key={item.view}
                    onClick={() => setActiveView(item.view)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-left transition-all mb-0.5 ${
                      isActive
                        ? 'bg-card border border-border shadow-sm'
                        : 'hover:bg-card/60 border border-transparent'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isActive ? 'bg-gold/10 border border-gold/20' : 'bg-border/40'
                    }`}>
                      <item.Icon size={13} className={isActive ? 'text-gold' : 'text-muted'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className={`text-[11px] font-semibold leading-tight ${isActive ? 'text-primary' : 'text-muted'}`}>{item.label}</span>
                        {item.badge && (
                          <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-gold/15 text-gold border border-gold/20 leading-none">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] leading-tight mt-0.5 truncate ${isActive ? 'text-muted' : 'text-muted/75'}`}>
                        {item.desc}
                      </p>
                    </div>
                  </button>
                );
              })}

              {/* On this page — jump links into the open report.
                  Analyst-only sections auto-hide in Simple mode via CSS. */}
              {activeView === 'valuation' && company && (
                <div className="mt-3 pt-3 border-t border-border/60">
                  <p className="text-[10px] text-muted/80 uppercase tracking-[1.2px] font-semibold px-2 mb-1.5">On this page</p>
                  {([
                    { id: 'sec-verdict',      label: 'Verdict',       Icon: Sparkles },
                    { id: 'sec-danger',       label: 'Danger Check',  Icon: ShieldAlert },
                    { id: 'sec-money',        label: 'Your Money',    Icon: DollarSign },
                    { id: 'sec-assumptions',  label: 'Assumptions',   Icon: SlidersHorizontal, analyst: true },
                    { id: 'sec-evidence',     label: 'The Evidence',  Icon: LineChart,         analyst: true },
                    { id: 'sec-stress',       label: 'Stress Tests',  Icon: Activity,          analyst: true },
                    { id: 'sec-numbers',      label: 'Raw Numbers',   Icon: Table2,            analyst: true },
                    { id: 'sec-quality',      label: 'Quality Score', Icon: BadgeCheck },
                  ] as { id: string; label: string; Icon: typeof Sparkles; analyst?: boolean }[]).map(s => (
                    <button
                      key={s.id}
                      onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      className={`${s.analyst ? 'analyst-only ' : ''}w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-muted hover:text-primary hover:bg-card/60 transition-all`}
                    >
                      <s.Icon size={12} className="flex-shrink-0" />
                      <span className="text-[11px] font-medium leading-tight truncate">{s.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Quick picks — only shown when no stock is loaded */}
              {!selectedSymbol && (
                <>
                  <div className="my-3 border-t border-border/60" />
                  <p className="text-[10px] text-muted/80 uppercase tracking-[1.2px] font-medium px-2 mb-1.5">Quick Select</p>
                </>
              )}
            </div>

            {!selectedSymbol && (
              <div className="flex-1 overflow-y-auto px-2 pb-3">
                {QUICK_PICKS.map((sym) => (
                  <button
                    key={sym}
                    onClick={() => handleSelect(sym)}
                    onMouseEnter={() => handlePrefetch(sym)}
                    onMouseLeave={cancelPrefetch}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-[11px] font-mono transition-all mb-0.5 ${
                      selectedSymbol === sym
                        ? 'bg-gold text-terminal font-bold'
                        : 'text-muted hover:bg-border/60 hover:text-primary'
                    }`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            )}
          </aside>

          {/* ── CENTER MAIN CONTENT ───────────────────────── */}
          <main className="flex-1 overflow-y-auto min-w-0">
            {isLoading ? (
              <SkeletonView symbol={selectedSymbol} />
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-sm">
                  <p className="text-sm text-loss font-medium mb-1">Failed to load {selectedSymbol}</p>
                  <p className="text-xs text-muted mb-3">{error}</p>
                  <button onClick={() => loadCompany(selectedSymbol)} className="px-3 py-1.5 bg-gold/10 border border-gold/30 rounded text-xs text-gold hover:bg-gold/20">
                    Retry
                  </button>
                </div>
              </div>
            ) : activeView === 'discovery' ? (
              <DiscoveryView onSelectSymbol={(sym) => { handleSelect(sym); }} />
            ) : activeView === 'watchlist' ? (
              <div className="p-4">
                <WatchlistView
                  onSelectSymbol={(sym) => { handleSelect(sym); }}
                  currentSymbol={selectedSymbol}
                />
              </div>
            ) : activeView === 'portfolio' ? (
              <div className="p-4">
                <PortfolioView onSelectSymbol={(sym) => { handleSelect(sym); }} />
              </div>

            ) : company ? (
              <div className="px-5 sm:px-8 lg:px-10 py-7 space-y-5 max-w-4xl mx-auto">
                {/* Sticky mini-ticker — appears once you scroll past the header */}
                <StickyTicker company={company} financials={financials} assumptions={assumptions} />

                {/* Company header — always visible */}
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <CompanyHeader
                      company={company}
                      financials={financials}
                      isWatchlisted={isWatchlisted}
                      onWatchlistToggle={handleWatchlistToggle}
                      isInPortfolio={isPortfolioStock}
                      onPortfolioToggle={handlePortfolioToggle}
                    />
                  </div>
                  <div className="flex-shrink-0 pt-1">
                    <ExportReport company={company} financials={financials} assumptions={assumptions} />
                  </div>
                </div>
                {/* Sentinel: when this scrolls out of view, the mini-ticker fades in */}
                <div id="ticker-sentinel" className="h-px -mt-4" />

                {/* ── VIEW: VALUATION ── */}
                {activeView === 'valuation' && financials.length > 0 && (
                  <>
                    {/* Verdict — one-line plain-English answer at the very top */}
                    <div id="sec-verdict" className="scroll-mt-20">
                      <VerdictCard company={company} financials={financials} assumptions={assumptions} />
                    </div>

                    {/* Honesty banner — when our own models shouldn't be trusted */}
                    <ValuationCaveatBanner company={company} financials={financials} />

                    {/* Data quality banner — shown before anything else if issues exist */}
                    {dataQuality && <DataQualityBanner quality={dataQuality} />}

                    <SectionHeader
                      id="sec-danger"
                      Icon={ShieldAlert}
                      title="Danger Check"
                      desc="Quick health tests before anything else — too much debt, weak cash, pledged promoter shares. Like a doctor checking your pulse before prescribing medicine."
                    />
                    <div id="red-flags-card">
                      <RedFlagsCard company={company} financials={financials} />
                    </div>

                    {/* Beginner-friendly: money outcome shown before any sliders */}
                    <SectionHeader
                      id="sec-money"
                      Icon={DollarSign}
                      title="What your money could become"
                      desc="If things go as expected, here's what ₹1 lakh invested today could grow into. Example: 12% growth a year for 5 years turns ₹1L into roughly ₹1.8L."
                    />
                    <WealthProjection company={company} financials={financials} assumptions={assumptions} />

                    {/* ── Everything below is for users who want to go deeper.
                         In Simple mode it's hidden; the 'See the full analysis'
                         button (further down) reveals it by switching to Analyst mode. ── */}
                    <div className="analyst-only space-y-4">
                    <SectionHeader
                      id="sec-assumptions"
                      Icon={SlidersHorizontal}
                      title="Fine-tune the assumptions"
                      desc="Advanced: change the growth, margin and exit numbers to test your own view. The defaults are picked automatically from the company's sector and track record."
                    />
                    {/* Assumptions panel */}
                    {(() => {
                      const sectorProfile = getCompanyProfile(company);
                      return (
                        <div className="bg-card border border-border rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-1.5">
                            <SlidersHorizontal size={14} className="text-accent flex-shrink-0" />
                            <h3 className="text-sm font-semibold text-primary min-w-0">Your Assumptions — adjust to see your target price</h3>
                            <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                              {hasChanges && (
                                <button
                                  onClick={resetAssumptions}
                                  title="Reset to algorithm-suggested defaults"
                                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-loss border border-loss/30 bg-loss/5 hover:bg-loss/10 transition-all active:scale-95"
                                >
                                  <RotateCcw size={10} />
                                  Reset
                                </button>
                              )}
                              <span className="text-[11px] text-gold font-mono bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded max-w-[180px] truncate" title={`${sectorProfile.sectorLabel} — ${sectorProfile.exitMultipleLabel}`}>
                                {sectorProfile.sectorLabel} — {sectorProfile.exitMultipleLabel}
                              </span>
                            </div>
                          </div>
                          {/* Auto-fill badge — shows where the numbers came from */}
                          {autoFillLabel && (
                            <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 rounded-lg bg-border/30 border border-border">
                              <Zap size={10} className="text-accent flex-shrink-0" />
                              <p className="text-[10px] text-muted leading-tight flex-1">{autoFillLabel}</p>
                              <button
                                onClick={() => setAutoFillLabel(null)}
                                className="text-muted/50 hover:text-muted ml-1 flex-shrink-0"
                                title="Dismiss"
                              >
                                <XIcon size={10} />
                              </button>
                            </div>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                            <SliderInput
                              label="Revenue Growth" value={assumptions.revenueGrowthRate}
                              min={1} max={50} inputMax={200} step={0.5} suffix="%" color="text-accent"
                              onChange={(v) => setAssumptions(a => ({ ...a, revenueGrowthRate: v }))}
                              hint={`Fades to ${getIndustryCagr(sectorProfile.sectorLabel)}% India ${sectorProfile.sectorLabel} CAGR`}
                            />
                            {sectorProfile.model !== 'pb' && (
                              <SliderInput
                                label="Net Margin" value={assumptions.netMarginAssumption}
                                min={1} max={50} inputMax={100} step={0.5} suffix="%" color="text-gain"
                                onChange={(v) => setAssumptions(a => ({ ...a, netMarginAssumption: v }))}
                                hint={`${latest?.year} actual: ${latest?.netMargin.toFixed(1)}%`}
                              />
                            )}
                            {sectorProfile.model === 'pb' && (
                              <SliderInput
                                label="Book Value Growth" value={assumptions.revenueGrowthRate}
                                min={1} max={40} inputMax={100} step={0.5} suffix="%" color="text-gain"
                                onChange={(v) => setAssumptions(a => ({ ...a, revenueGrowthRate: v }))}
                                hint={`ROE: ${company.roe.toFixed(1)}% → proxy for BV growth`}
                              />
                            )}
                            <SliderInput
                              label={sectorProfile.exitMultipleLabel}
                              value={assumptions.exitMultiple}
                              min={sectorProfile.exitMultipleMin}
                              max={sectorProfile.exitMultipleMax}
                              inputMax={sectorProfile.model === 'pe' ? 3000 : sectorProfile.model === 'pb' ? 50 : sectorProfile.exitMultipleMax * 10}
                              step={sectorProfile.exitMultipleStep}
                              suffix="x"
                              color="text-gold"
                              onChange={(v) => setAssumptions(a => ({ ...a, exitMultiple: v, exitPE: v }))}
                              hint={
                                sectorProfile.model === 'pe' ? `Current P/E: ${company.pe.toFixed(1)}x` :
                                sectorProfile.model === 'pb' ? `Current P/B: ${company.pb.toFixed(1)}x` :
                                `Sector default: ${sectorProfile.defaultExitMultiple}x`
                              }
                            />
                            <div>
                              <p className="text-xs text-muted mb-1.5">Horizon</p>
                              <div className="flex gap-1.5 flex-wrap">
                                {[3,5,7,10].map(y => (
                                  <button
                                    key={y}
                                    onClick={() => setAssumptions(a => ({ ...a, years: y }))}
                                    className={`flex-1 min-w-[36px] py-1.5 rounded text-xs font-semibold transition-all ${
                                      assumptions.years === y ? 'bg-gold text-terminal' : 'bg-border text-primary/70 hover:text-primary'
                                    }`}
                                  >
                                    {y}Y
                                  </button>
                                ))}
                              </div>
                              <p className="text-xs text-muted mt-2">Projection years</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <SectionHeader
                      id="sec-evidence"
                      Icon={LineChart}
                      title="The Evidence"
                      desc="Price history with cheap/fair/pricey bands, the forecast your assumptions imply, and three futures — bear (things go wrong), base (your inputs), bull (things go right)."
                    />
                    <PriceChart company={company} financials={financials} />
                    <ForecastChart financials={financials} assumptions={assumptions} />
                    <ScenarioCards financials={financials} assumptions={assumptions} currentPrice={company.currentPrice} company={company} />

                    <SectionHeader
                      id="sec-stress"
                      Icon={Activity}
                      title="Stress Tests"
                      desc="We attack our own answer to see if it survives. Example: 'what growth does today's price silently assume — and has the company ever delivered it?'"
                    />
                    {/* Proof tier — stress-tests of the story above */}
                    <ReverseDCF company={company} financials={financials} assumptions={assumptions} />
                    <MonteCarloCard company={company} financials={financials} assumptions={assumptions} />
                    <WhatMustHappen company={company} financials={financials} assumptions={assumptions} />

                    {/* Expert tier — collapsed by default, halves the page for casual users */}
                    <details className="group bg-card border border-border rounded-xl">
                      <summary className="cursor-pointer list-none p-4 flex items-center gap-2 select-none">
                        <SlidersHorizontal size={14} className="text-muted group-open:text-gold transition-colors" />
                        <span className="text-sm font-semibold text-primary">Advanced analysis</span>
                        <span className="text-[11px] text-muted">sensitivity matrix · valuation engine · custom scenarios</span>
                        <span className="ml-auto text-muted text-xs group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <div className="p-4 pt-0 space-y-4">
                        <SensitivityMatrix financials={financials} assumptions={assumptions} currentPrice={company.currentPrice} company={company} />
                        <ValuationEngine company={company} financials={financials} assumptions={assumptions} />
                        <ScenarioBuilder company={company} financials={financials} />
                      </div>
                    </details>
                    </div>{/* end .analyst-only */}

                    {/* Simple mode only: invite beginners to reveal the deep-dive */}
                    <button
                      onClick={switchToAnalyst}
                      className="simple-only group w-full flex items-center gap-3 text-left bg-gold/10 border border-gold/30 rounded-2xl p-4 hover:bg-gold/15 hover:border-gold/50 transition-all"
                    >
                      <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 text-gold flex-shrink-0">
                        <SlidersHorizontal size={18} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-bold text-primary">See the full analysis</span>
                        <span className="block text-xs text-muted leading-snug mt-0.5">
                          Charts, forecasts, stress tests and the raw 10-year numbers. For when you want to dig deeper.
                        </span>
                      </span>
                      <ChevronRight size={18} className="text-gold flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </>
                )}

                {activeView === 'valuation' && financials.length === 0 && (
                  <p className="text-sm text-muted text-center py-8">No financial data available for {company.symbol}</p>
                )}

                {/* ── SECTION: FINANCIALS — advanced, hidden in Simple mode ── */}
                {activeView === 'valuation' && (
                  <div className="analyst-only space-y-4">
                    <SectionHeader
                      id="sec-numbers"
                      Icon={Table2}
                      title="The Raw Numbers"
                      desc="Ten years of revenue, profit and margins — the actual track record everything above is built on. Example: steady margins = a business in control of its prices."
                    />
                    <QuarterlyFlash company={company} />
                    <KeyMetrics company={company} financials={financials} />
                    {financials.length > 0 && (
                      <>
                        <FinancialsTable financials={financials} />
                        <EarningsQuality financials={financials} />
                      </>
                    )}
                  </div>
                )}

                {/* ── Quality score — friendly grade, shown in both modes ── */}
                {activeView === 'valuation' && company && financials.length >= 3 && (
                  <>
                    <SectionHeader
                      id="sec-quality"
                      Icon={BadgeCheck}
                      title="Quality Score & Alternatives"
                      desc="One grade for overall business quality, recent company announcements, and stronger options in the same sector if this one doesn't convince you."
                    />
                    <ROBUScoreCard company={company} financials={financials} />
                  </>
                )}
                {activeView === 'valuation' && company && (
                  <AnnouncementsFeed company={company} />
                )}
                {activeView === 'valuation' && company && (
                  <SectorAlternatives company={company} onSelectSymbol={handleSelect} />
                )}

                {/* ── At lg (1024–1279px): inline AI panel below main content since right panel is hidden ── */}
                {company && (
                  <div className="xl:hidden space-y-4 pt-2">
                    <AIOverview company={company} financials={financials} />
                    <HistoricalValuationChart company={company} />
                    <IndustryBenchmarks company={company} financials={financials} />
                  </div>
                )}
              </div>
            ) : (
              /* No company loaded — show prompt based on active view */
              <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-border/40 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted/40">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary mb-1">
                    {activeView === 'valuation' ? 'Search a stock to see the full report' :
                     'Search any Indian stock above'}
                  </p>
                  <p className="text-xs text-muted max-w-xs">
                    Type a company name or NSE symbol in the search bar to start your analysis.
                  </p>
                </div>
              </div>
            )}
          </main>

          {/* ── RIGHT PANEL — only on stock views, never on screener/watchlist/portfolio ── */}
          {!['watchlist', 'portfolio', 'discovery'].includes(activeView) && (
            <aside className="hidden xl:flex w-[280px] flex-shrink-0 border-l border-border bg-terminal overflow-y-auto flex-col">
              {company ? (
                <div className="p-3 space-y-3">
                  <AIOverview company={company} financials={financials} />
                  <IndustryBenchmarks company={company} financials={financials} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted px-4 text-center">Select a company to view analysis</p>
                </div>
              )}
            </aside>
          )}

        </div>
      )}

    </div>
    {/* end desktop */}
    </>
  );
}

/* ── SkeletonView — responsive loading skeleton ── */
function SkeletonView({ symbol }: { symbol: string }) {
  return (
    <div className="p-3 sm:p-4 space-y-3">
      {/* Company header */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="skeleton w-10 h-10 rounded-cds-lg flex-shrink-0" />
          <div className="space-y-2">
            <div className="skeleton h-4 w-28 sm:w-36 rounded-cds-sm" />
            <div className="skeleton h-3 w-16 sm:w-24 rounded-cds-sm" />
          </div>
        </div>
        <div className="text-right space-y-2">
          <div className="skeleton h-6 w-20 sm:w-28 rounded-cds-sm ml-auto" />
          <div className="skeleton h-3 w-14 rounded-cds-sm ml-auto" />
        </div>
      </div>

      {/* Key metrics — 2 col on small, 4 col on wider */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-3 space-y-2">
            <div className="h-3 w-12 rounded bg-border/40" />
            <div className="h-5 w-14 rounded bg-border/60" />
          </div>
        ))}
      </div>

      {/* Assumptions — 1 col on small, 2 col on sm, 4 col on wider */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="h-4 w-40 rounded bg-border/60 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 rounded bg-border/40" />
              <div className="h-1.5 w-full rounded bg-border/60" />
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="h-4 w-44 rounded bg-border/60 mb-4" />
        <div className="h-36 sm:h-44 w-full rounded bg-border/30 flex items-end gap-1.5 sm:gap-2 px-2 pb-2">
          {[60,80,55,90,70,85,65,95].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-border/50" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>

      {/* Scenario cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {['Bear','Base','Bull'].map(s => (
          <div key={s} className="bg-card border border-border rounded-xl p-3 sm:p-4 space-y-2">
            <div className="h-3 w-12 rounded bg-border/40" />
            <div className="h-5 sm:h-6 w-16 sm:w-24 rounded bg-border/60" />
            <div className="h-3 w-10 rounded bg-border/40" />
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-muted/40 pt-1 font-mono">
        loading {symbol}…
      </p>
    </div>
  );
}

/* ── SliderInput ─────────────────────────────────────────────────────────── */
const SLIDER_TOOLTIPS: Record<string, string> = {
  'Revenue Growth':      'How fast do you expect sales to grow each year? Higher = more optimistic',
  'Net Margin':          'Of every ₹100 the company earns, how much stays as profit?',
  'Book Value Growth':   'How fast is the company growing its own net worth per share?',
  'Exit P/E':            'At what price-to-earnings multiple will you sell in the future?',
  'Exit P/B':            'At what price-to-book multiple will you sell in the future?',
  'Exit EV/EBITDA':      'A valuation multiple used for comparing companies with different debt levels',
  'Horizon':             'How many years into the future are you projecting?',
};

function SliderInput({
  label, value, min, max, inputMax, step, suffix, color, onChange, hint,
}: {
  label: string; value: number; min: number; max: number; inputMax?: number;
  step: number; suffix: string; color: string;
  onChange: (v: number) => void; hint?: string;
}) {
  const effectiveInputMax = inputMax ?? max;
  const pct = Math.min(((value - min) / (max - min)) * 100, 100);
  const beyondSlider = value > max;
  const tooltip = SLIDER_TOOLTIPS[label];
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-xs text-muted truncate">{label}</p>
          {tooltip && (
            <span
              title={tooltip}
              className="flex-shrink-0 w-3.5 h-3.5 rounded-full bg-border text-muted/70 text-[8px] font-bold flex items-center justify-center cursor-help hover:bg-gold/20 hover:text-gold transition-colors"
            >
              ?
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <input
            type="number" min={min} max={effectiveInputMax} step={step} value={value}
            onChange={(e) => { const n = parseFloat(e.target.value); if (!isNaN(n)) onChange(Math.min(Math.max(n, min), effectiveInputMax)); }}
            className={`w-16 text-right text-sm font-bold font-mono bg-transparent border-b border-border focus:border-gold focus:outline-none ${color} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
          />
          <span className={`text-sm font-bold font-mono ${color}`}>{suffix}</span>
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={Math.min(value, max)}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer"
        style={{ '--fill': beyondSlider ? '100%' : `${pct}%` } as React.CSSProperties}
      />
      {beyondSlider && (
        <p className="text-[10px] text-gold font-mono mt-0.5">▲ beyond {max}{suffix} — custom value</p>
      )}
      {hint && <p className="text-[10px] text-muted/70 mt-0.5 font-mono leading-snug">{hint}</p>}
    </div>
  );
}
