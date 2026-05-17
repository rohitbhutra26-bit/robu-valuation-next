'use client';

import { useState, useCallback } from 'react';
import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import { getSectorProfile } from '@/lib/sectorModelMap';
import CompanySearch from '@/components/CompanySearch';
import CompanyHeader from '@/components/CompanyHeader';
import KeyMetrics from '@/components/KeyMetrics';
import AIOverview from '@/components/AIOverview';
import FinancialsTable from '@/components/FinancialsTable';
import ScenarioCards from '@/components/ScenarioCards';
import SensitivityMatrix from '@/components/SensitivityMatrix';
import IndustryBenchmarks from '@/components/IndustryBenchmarks';
import ValuationEngine from '@/components/ValuationEngine';
import EarningsQuality from '@/components/EarningsQuality';
import MobileLayout, { RobuLogo } from '@/components/MobileLayout';

const QUICK_PICKS = ['RELIANCE','TCS','INFY','HDFCBANK','ICICIBANK','WIPRO','BAJFINANCE','KAYNES','TATAMOTORS','SBIN','ADANIENT','BHARTIARTL'];

export default function Home() {
  const [company, setCompany]       = useState<Company | null>(null);
  const [financials, setFinancials] = useState<FinancialYear[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [homeMode, setHomeMode]     = useState(true);   // true = landing page
  const [assumptions, setAssumptions] = useState<ValuationAssumptions>({
    revenueGrowthRate: 15,
    netMarginAssumption: 20,
    exitPE: 25,
    exitMultiple: 25,   // will be set correctly once sector is known
    years: 5,
  });

  // ── Load company data ─────────────────────────────────────────────────────
  const loadCompany = useCallback(async (symbol: string) => {
    setIsLoading(true);
    setError(null);
    setCompany(null);
    setFinancials([]);

    try {
      const [companyRes, financialsRes] = await Promise.all([
        fetch(`/api/company/${symbol}`, { cache: 'no-store' }),
        fetch(`/api/financials/${symbol}`, { cache: 'no-store' }),
      ]);

      if (!companyRes.ok) {
        const err = await companyRes.json().catch(() => ({}));
        throw new Error(err.error || `Failed to load ${symbol}`);
      }

      const companyData: Company = await companyRes.json();
      setCompany(companyData);

      let fins: FinancialYear[] = [];
      if (financialsRes.ok) {
        fins = await financialsRes.json();
        const sharesInCr = companyData.shares && companyData.shares > 0 ? companyData.shares : 1;
        fins = fins.map(f => ({ ...f, shares: f.shares && f.shares > 0 ? f.shares : sharesInCr }));
      }
      setFinancials(fins);

      if (fins.length >= 2) {
        const latest = fins[fins.length - 1];
        const growthValues = fins.slice(1).map(f => f.revenueGrowth).filter(g => g !== 0);
        const avgGrowth = growthValues.length
          ? growthValues.reduce((a, b) => a + b, 0) / growthValues.length : 15;

        // Pick default exit multiple from the sector profile
        const sectorProfile = getSectorProfile(companyData.sector);
        const exitPE = Math.min(Math.max(Math.round(companyData.pe || 25), 5), 100);

        setAssumptions({
          revenueGrowthRate: Math.min(Math.max(Math.round(avgGrowth), 3), 40),
          netMarginAssumption: Math.min(Math.max(Math.round(latest.netMargin), 1), 50),
          exitPE,
          exitMultiple: sectorProfile.defaultExitMultiple,
          years: 5,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load company data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Navigation helpers ────────────────────────────────────────────────────
  function handleSelect(symbol: string) {
    setSelectedSymbol(symbol);
    setHomeMode(false);
    loadCompany(symbol);
  }

  function goHome() {
    setHomeMode(true);
    setCompany(null);
    setFinancials([]);
    setError(null);
    setSelectedSymbol('');
  }

  const latest = financials.length > 0 ? financials[financials.length - 1] : null;

  return (
    <>
    {/* ═══════════════════ MOBILE LAYOUT ═══════════════════ */}
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
    />

    {/* ═══════════════════ DESKTOP LAYOUT ══════════════════ */}
    <div className="hidden md:flex h-screen bg-terminal flex-col overflow-hidden">

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40 flex-shrink-0">
        <div className="flex items-center justify-between px-5 py-2.5">

          {/* Logo — always clickable to go home */}
          <button
            onClick={goHome}
            className="flex items-center gap-3 group"
          >
            <RobuLogo size={28} />
            <div className="text-left">
              <p className="text-sm font-bold text-primary tracking-tight group-hover:text-gold transition-colors">
                Robu Terminal
              </p>
              <p className="text-[11px] text-muted leading-none">Indian Equities Research</p>
            </div>
          </button>

          {/* Center search — only when a stock is loaded */}
          {!homeMode && (
            <div className="w-[480px]">
              <CompanySearch onSelect={handleSelect} selectedSymbol={selectedSymbol} />
            </div>
          )}

          {/* Right — intentionally empty */}
          <div className="w-[80px]" />
        </div>
      </header>

      {/* ── Home landing ───────────────────────────────────── */}
      {homeMode && (
        <main className="flex-1 flex items-center justify-center overflow-y-auto">
          <div className="w-full max-w-[740px] px-8 py-12 flex flex-col items-center">

            {/* Wordmark */}
            <RobuLogo size={72} />
            <h1 className="mt-6 text-4xl font-bold text-primary tracking-tight">Robu Terminal</h1>
            <p className="mt-3 text-base text-muted text-center">
              Institutional-grade valuation for every Indian stock
            </p>

            {/* Search bar — bigger */}
            <div className="w-full mt-12 [&_input]:text-base [&_input]:py-4 [&_input]:pl-12 [&_input]:pr-10 [&_input]:rounded-xl [&_svg]:w-5 [&_svg]:h-5">
              <CompanySearch onSelect={handleSelect} selectedSymbol={selectedSymbol} />
            </div>

            {/* Quick picks */}
            <div className="w-full mt-8">
              <p className="text-[11px] uppercase tracking-widest text-muted mb-3 font-medium">Popular</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_PICKS.map((sym) => (
                  <button
                    key={sym}
                    onClick={() => handleSelect(sym)}
                    className="px-3.5 py-2 rounded-lg text-xs font-mono font-semibold bg-card border border-border text-muted hover:text-primary hover:border-gold/40 transition-all"
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-14 text-xs text-muted/40 text-center">
              Search any NSE or BSE listed company by name or symbol
            </p>
          </div>
        </main>
      )}

      {/* ── Stock analysis layout ───────────────────────────── */}
      {!homeMode && (
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT SIDEBAR — quick picks only */}
          <aside className="w-[180px] flex-shrink-0 border-r border-border bg-card/30 flex flex-col overflow-y-auto">
            <div className="p-3">
              <p className="text-[10px] text-muted uppercase tracking-widest mb-2 font-medium">Quick Select</p>
              <div className="flex flex-col gap-1">
                {QUICK_PICKS.map((sym) => (
                  <button
                    key={sym}
                    onClick={() => handleSelect(sym)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-mono transition-all ${
                      selectedSymbol === sym
                        ? 'bg-gold text-terminal font-semibold'
                        : 'text-muted hover:bg-border/60 hover:text-primary'
                    }`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* CENTER — main analysis */}
          <main className="flex-1 overflow-y-auto min-w-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-muted">Loading {selectedSymbol}…</p>
                </div>
              </div>
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
            ) : company ? (
              <div className="p-4 space-y-4">
                <CompanyHeader company={company} />
                <KeyMetrics company={company} financials={financials} />

                {financials.length > 0 && (
                  <>
                    {/* Valuation Assumptions */}
                    {(() => {
                      const sectorProfile = getSectorProfile(company.sector);
                      return (
                        <div className="bg-card border border-border rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                            <h3 className="text-sm font-semibold text-primary">Valuation Assumptions</h3>
                            <span className="ml-auto text-[11px] text-gold font-mono bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded">
                              {sectorProfile.sectorLabel} — {sectorProfile.exitMultipleLabel}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-4">
                            <SliderInput
                              label="Revenue Growth" value={assumptions.revenueGrowthRate}
                              min={1} max={50} step={0.5} suffix="%" color="text-accent"
                              onChange={(v) => setAssumptions(a => ({ ...a, revenueGrowthRate: v }))}
                              hint={`${latest?.year} actual: ${latest?.revenueGrowth.toFixed(1)}%`}
                            />
                            {sectorProfile.model !== 'pb' && (
                              <SliderInput
                                label="Net Margin" value={assumptions.netMarginAssumption}
                                min={1} max={50} step={0.5} suffix="%" color="text-gain"
                                onChange={(v) => setAssumptions(a => ({ ...a, netMarginAssumption: v }))}
                                hint={`${latest?.year} actual: ${latest?.netMargin.toFixed(1)}%`}
                              />
                            )}
                            {sectorProfile.model === 'pb' && (
                              <SliderInput
                                label="Book Value Growth" value={assumptions.revenueGrowthRate}
                                min={1} max={40} step={0.5} suffix="%" color="text-gain"
                                onChange={(v) => setAssumptions(a => ({ ...a, revenueGrowthRate: v }))}
                                hint={`ROE: ${company.roe.toFixed(1)}% → proxy for BV growth`}
                              />
                            )}
                            <SliderInput
                              label={sectorProfile.exitMultipleLabel}
                              value={assumptions.exitMultiple}
                              min={sectorProfile.exitMultipleMin}
                              max={sectorProfile.exitMultipleMax}
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
                                      assumptions.years === y ? 'bg-gold text-terminal' : 'bg-border text-muted hover:text-primary'
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

                    <ScenarioCards financials={financials} assumptions={assumptions} currentPrice={company.currentPrice} company={company} />
                    <SensitivityMatrix financials={financials} assumptions={assumptions} currentPrice={company.currentPrice} />
                    <ValuationEngine company={company} financials={financials} assumptions={assumptions} />
                    <EarningsQuality financials={financials} />
                  </>
                )}

                {financials.length > 0 && <FinancialsTable financials={financials} />}
              </div>
            ) : null}
          </main>

          {/* RIGHT PANEL — AI + Industry */}
          <aside className="w-[300px] flex-shrink-0 border-l border-border bg-card/30 overflow-y-auto">
            {company ? (
              <div className="p-3 space-y-3">
                <AIOverview company={company} />
                <IndustryBenchmarks company={company} financials={financials} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted px-4 text-center">Select a company to view analysis</p>
              </div>
            )}
          </aside>

        </div>
      )}

    </div>
    {/* end desktop */}
    </>
  );
}

/* ── SliderInput ─────────────────────────────────────────────────────────── */
function SliderInput({
  label, value, min, max, step, suffix, color, onChange, hint,
}: {
  label: string; value: number; min: number; max: number;
  step: number; suffix: string; color: string;
  onChange: (v: number) => void; hint?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs text-muted">{label}</p>
        <div className="flex items-center gap-0.5">
          <input
            type="number" min={min} max={max} step={step} value={value}
            onChange={(e) => { const n = parseFloat(e.target.value); if (!isNaN(n)) onChange(Math.min(Math.max(n, min), max)); }}
            className={`w-14 text-right text-sm font-bold font-mono bg-transparent border-b border-border focus:border-gold focus:outline-none ${color} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
          />
          <span className={`text-sm font-bold font-mono ${color}`}>{suffix}</span>
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, #F59E0B 0%, #F59E0B ${pct}%, #1E1E1E ${pct}%, #1E1E1E 100%)` }}
      />
      {hint && <p className="text-xs text-muted mt-1 font-mono">{hint}</p>}
    </div>
  );
}
