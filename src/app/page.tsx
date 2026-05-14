'use client';

import { useState, useEffect, useCallback } from 'react';
import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
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

const DEFAULT_SYMBOL = 'TCS';

export default function Home() {
  const [company, setCompany] = useState<Company | null>(null);
  const [financials, setFinancials] = useState<FinancialYear[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState(DEFAULT_SYMBOL);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assumptions, setAssumptions] = useState<ValuationAssumptions>({
    revenueGrowthRate: 15,
    netMarginAssumption: 20,
    exitPE: 25,
    years: 5,
  });

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
          ? growthValues.reduce((a, b) => a + b, 0) / growthValues.length
          : 15;
        setAssumptions({
          revenueGrowthRate: Math.min(Math.max(Math.round(avgGrowth), 3), 40),
          netMarginAssumption: Math.min(Math.max(Math.round(latest.netMargin), 1), 50),
          exitPE: Math.min(Math.max(Math.round(companyData.pe || 25), 5), 100),
          years: 5,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load company data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompany(selectedSymbol);
  }, [selectedSymbol, loadCompany]);

  const latest = financials.length > 0 ? financials[financials.length - 1] : null;

  return (
    <div className="h-screen bg-terminal flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold to-amber-700 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold text-primary tracking-tight">ROBU Valuation Terminal</h1>
              <p className="text-xs text-muted">Indian Equities Research Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted" suppressHydrationWarning>
              <div className="w-1.5 h-1.5 rounded-full bg-gain animate-pulse" />
              <span>Live NSE Data</span>
            </div>
            <div className="px-2 py-1 bg-gold/10 border border-gold/30 rounded text-xs text-gold font-mono">BETA v1.0</div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT SIDEBAR — search only ── */}
        <aside className="w-[240px] flex-shrink-0 border-r border-border bg-card/30 flex flex-col overflow-y-auto">
          <div className="p-3 border-b border-border">
            <p className="text-xs text-muted uppercase tracking-wide mb-2 font-medium">Search NSE</p>
            <CompanySearch onSelect={(s) => setSelectedSymbol(s)} selectedSymbol={selectedSymbol} />
          </div>

          <div className="p-3 border-b border-border">
            <p className="text-xs text-muted uppercase tracking-wide mb-2 font-medium">Quick Select</p>
            <div className="flex flex-wrap gap-1.5">
              {['RELIANCE','TCS','INFY','HDFCBANK','ICICIBANK','WIPRO','BAJFINANCE','KAYNES','TATAMOTORS','SBIN','ADANIENT','BHARTIARTL'].map((sym) => (
                <button
                  key={sym}
                  onClick={() => setSelectedSymbol(sym)}
                  className={`px-2 py-1 rounded text-xs font-mono transition-all ${
                    selectedSymbol === sym
                      ? 'bg-gold text-terminal font-semibold'
                      : 'bg-border text-muted hover:bg-border/80 hover:text-primary'
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>

        </aside>

        {/* ── CENTER — main analysis ── */}
        <main className="flex-1 overflow-y-auto min-w-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-muted">Loading {selectedSymbol}...</p>
                <p className="text-xs text-muted mt-1">Fetching live NSE data</p>
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
              {/* Company header */}
              <CompanyHeader company={company} />

              {/* Key metrics */}
              <KeyMetrics company={company} financials={financials} />

              {/* ── VALUATION ENGINE — top priority ── */}
              {financials.length > 0 && (
                <>
                  {/* Assumptions — full width */}
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                      <h3 className="text-sm font-semibold text-primary">Valuation Assumptions</h3>
                      <span className="ml-auto text-xs text-muted">Adjust below — all outputs update live</span>
                    </div>

                    {/* 4 assumption controls in a row */}
                    <div className="grid grid-cols-4 gap-4 mb-3">
                      {/* Revenue Growth */}
                      <SliderInput
                        label="Revenue Growth"
                        value={assumptions.revenueGrowthRate}
                        min={1} max={50} step={0.5} suffix="%"
                        color="text-accent"
                        onChange={(v) => setAssumptions(a => ({ ...a, revenueGrowthRate: v }))}
                        hint={`FY24 actual: ${latest?.revenueGrowth.toFixed(1)}%`}
                      />
                      {/* Net Margin */}
                      <SliderInput
                        label="Net Margin"
                        value={assumptions.netMarginAssumption}
                        min={1} max={50} step={0.5} suffix="%"
                        color="text-gain"
                        onChange={(v) => setAssumptions(a => ({ ...a, netMarginAssumption: v }))}
                        hint={`FY24 actual: ${latest?.netMargin.toFixed(1)}%`}
                      />
                      {/* Exit PE */}
                      <SliderInput
                        label="Exit P/E"
                        value={assumptions.exitPE}
                        min={5} max={100} step={1} suffix="x"
                        color="text-gold"
                        onChange={(v) => setAssumptions(a => ({ ...a, exitPE: v }))}
                        hint={`Current P/E: ${company.pe.toFixed(1)}x`}
                      />
                      {/* Years */}
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

                  {/* Scenario Analysis — full width */}
                  <ScenarioCards financials={financials} assumptions={assumptions} currentPrice={company.currentPrice} />

                  {/* Sensitivity Matrix — full width */}
                  <SensitivityMatrix financials={financials} assumptions={assumptions} currentPrice={company.currentPrice} />

                  {/* Valuation Engine — 3 methods */}
                  <ValuationEngine company={company} financials={financials} assumptions={assumptions} />

                  {/* Earnings Quality */}
                  <EarningsQuality financials={financials} />
                </>
              )}

              {/* Financials table */}
              {financials.length > 0 && (
                <FinancialsTable financials={financials} />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted text-sm">Select a company to begin</p>
            </div>
          )}
        </main>

        {/* ── RIGHT PANEL — AI + Industry ── */}
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
    </div>
  );
}

/* ── Inline SliderInput component (used only in this page) ── */
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
            type="number"
            min={min} max={max} step={step}
            value={value}
            onChange={(e) => {
              const n = parseFloat(e.target.value);
              if (!isNaN(n)) onChange(Math.min(Math.max(n, min), max));
            }}
            className={`w-14 text-right text-sm font-bold font-mono bg-transparent border-b border-border focus:border-gold focus:outline-none ${color} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
          />
          <span className={`text-sm font-bold font-mono ${color}`}>{suffix}</span>
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, #F59E0B 0%, #F59E0B ${pct}%, #2D3748 ${pct}%, #2D3748 100%)` }}
      />
      {hint && <p className="text-xs text-muted mt-1 font-mono">{hint}</p>}
    </div>
  );
}
