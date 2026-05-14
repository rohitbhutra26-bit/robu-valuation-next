'use client';

import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';

interface ValuationEngineProps {
  company: Company;
  financials: FinancialYear[];
  assumptions: ValuationAssumptions;
}

const RISK_FREE_RATE = 6.8; // Indian 10Y G-Sec approx %

function computePEMethod(financials: FinancialYear[], assumptions: ValuationAssumptions, company: Company) {
  const latest = financials[financials.length - 1];
  const shares = Math.max(latest.shares ?? company.shares ?? 1, 0.001);
  const futureRevenue = latest.revenue * Math.pow(1 + assumptions.revenueGrowthRate / 100, assumptions.years);
  const futurePAT = futureRevenue * (assumptions.netMarginAssumption / 100);
  const futureEPS = futurePAT / shares;
  const fairValue = futureEPS * assumptions.exitPE;
  return { fairValue, method: 'Forward PE', desc: `${assumptions.years}Y Revenue × Margin ÷ Shares × ${assumptions.exitPE}x PE` };
}

function computePEGMethod(financials: FinancialYear[], company: Company) {
  // Use only years with valid EPS — yfinance often returns 0 for the current/future year
  const validEPS = financials.filter(f => f.eps > 0);

  if (validEPS.length < 2) {
    const peg = company.pe > 0 ? 0 : 0;
    return { fairValue: 0, method: 'PEG Ratio', desc: 'Insufficient EPS history', epsCAGR: 0, currentPEG: peg };
  }

  const first = validEPS[0];
  const last = validEPS[validEPS.length - 1];
  const years = Math.max(validEPS.length - 1, 1);
  const epsCAGR = (Math.pow(last.eps / first.eps, 1 / years) - 1) * 100;

  // Fair PE at PEG 1 = EPS growth rate, capped 8–60x
  const fairPE = Math.min(Math.max(epsCAGR, 8), 60);
  const fairValue = last.eps * fairPE;
  const peg = company.pe > 0 && epsCAGR > 0 ? company.pe / epsCAGR : 0;

  return {
    fairValue,
    method: 'PEG Ratio',
    desc: `EPS CAGR ${epsCAGR.toFixed(1)}% → Fair PE ~${fairPE.toFixed(0)}x (PEG=1)`,
    epsCAGR,
    currentPEG: peg,
  };
}

function computeEarningsYieldMethod(financials: FinancialYear[], company: Company) {
  // Use last year with valid EPS — ignore FY26 zeros (not reported yet)
  const validEPS = financials.filter(f => f.eps > 0);
  const lastValid = validEPS.length > 0 ? validEPS[validEPS.length - 1] : null;
  const eps = lastValid?.eps ?? 0;

  // Required yield = Risk-free rate + Equity Risk Premium (3.5% for India)
  // This gives a fair PE = 1 / requiredYield, which is growth-agnostic but anchored to bonds
  const ERP = 3.5; // India equity risk premium %
  const requiredYield = (RISK_FREE_RATE + ERP) / 100; // ~10.3% for a no-growth company
  const fairValue = eps > 0 ? eps / requiredYield : 0; // fair PE ≈ 9.7x for zero-growth
  const currentEY = company.pe > 0 ? (1 / company.pe) * 100 : 0;

  return {
    fairValue,
    method: 'Earnings Yield',
    desc: `EPS ÷ (RFR ${RISK_FREE_RATE}% + ERP ${ERP}%) — bond-equivalent floor value`,
    currentEY,
  };
}

function computeImpliedGrowth(financials: FinancialYear[], company: Company, assumptions: ValuationAssumptions): number {
  // At current price, what net margin × growth makes sense?
  // currentPrice = (latestRevenue × (1+g)^n × margin / shares) × exitPE
  // Solve for g: g = ((currentPrice × shares / exitPE / margin / latestRevenue)^(1/n)) - 1
  const latest = financials[financials.length - 1];
  const shares = Math.max(latest.shares ?? company.shares ?? 1, 0.001);
  const margin = assumptions.netMarginAssumption / 100;
  const pe = assumptions.exitPE;
  const n = assumptions.years;
  const price = company.currentPrice;

  try {
    const ratio = (price * shares) / (pe * margin * latest.revenue);
    const g = (Math.pow(Math.max(ratio, 0.01), 1 / n) - 1) * 100;
    return Math.max(g, 0);
  } catch {
    return 0;
  }
}

function MethodCard({
  method, desc, fairValue, currentPrice, highlight = false,
}: {
  method: string; desc: string; fairValue: number; currentPrice: number; highlight?: boolean;
}) {
  const upside = fairValue > 0 ? (fairValue / currentPrice - 1) * 100 : 0;
  const isUp = upside >= 0;

  return (
    <div className={`rounded-xl p-3 border ${highlight ? 'border-gold bg-gold/5' : 'border-border bg-card'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-semibold ${highlight ? 'text-gold' : 'text-muted'}`}>{method}</span>
        {highlight && <span className="text-xs text-gold bg-gold/10 px-1.5 py-0.5 rounded font-mono">Base</span>}
      </div>
      <p className="text-lg font-bold font-mono text-primary mb-0.5">
        ₹{fairValue > 0 ? fairValue.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—'}
      </p>
      <p className={`text-sm font-semibold font-mono mb-1 ${isUp ? 'text-gain' : 'text-loss'}`}>
        {fairValue > 0 ? `${isUp ? '+' : ''}${upside.toFixed(1)}%` : '—'}
      </p>
      <p className="text-xs text-muted leading-relaxed">{desc}</p>
    </div>
  );
}

export default function ValuationEngine({ company, financials, assumptions }: ValuationEngineProps) {
  if (!financials.length) return null;

  const peResult = computePEMethod(financials, assumptions, company);
  const pegResult = computePEGMethod(financials, company);
  const eyResult = computeEarningsYieldMethod(financials, company);
  const impliedGrowth = computeImpliedGrowth(financials, company, assumptions);

  // Composite = average of valid methods
  const validFVs = [peResult.fairValue, pegResult.fairValue, eyResult.fairValue].filter(v => v > 0);
  const compositeFV = validFVs.length > 0 ? validFVs.reduce((a, b) => a + b, 0) / validFVs.length : 0;
  const compositeUpside = compositeFV > 0 ? (compositeFV / company.currentPrice - 1) * 100 : 0;
  const compositeCAGR = compositeFV > 0
    ? (Math.pow(Math.max(compositeFV / company.currentPrice, 0.001), 1 / assumptions.years) - 1) * 100
    : 0;

  // Margin of safety = (Fair - Price) / Fair
  const marginOfSafety = compositeFV > 0 ? ((compositeFV - company.currentPrice) / compositeFV) * 100 : 0;

  // Current PEG
  const currentPEG = pegResult.currentPEG;

  // Verdict
  const verdict = compositeUpside >= 30
    ? { text: 'Potentially Undervalued', color: 'text-gain', bg: 'bg-gain/10 border-gain/20' }
    : compositeUpside <= -20
    ? { text: 'Potentially Overvalued', color: 'text-loss', bg: 'bg-loss/10 border-loss/20' }
    : { text: 'Fairly Valued Range', color: 'text-gold', bg: 'bg-gold/10 border-gold/20' };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
          <h3 className="text-sm font-semibold text-primary">Valuation Engine</h3>
        </div>
        <div className={`text-xs px-2 py-1 rounded border font-semibold ${verdict.bg} ${verdict.color}`}>
          {verdict.text}
        </div>
      </div>

      {/* Composite fair value — big number */}
      <div className="bg-border/20 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted mb-1">Composite Fair Value <span className="text-muted">(avg of 3 methods)</span></p>
          <p className="text-2xl font-bold font-mono text-gold">
            ₹{compositeFV.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-muted mt-1">
            Current ₹{company.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="text-right space-y-1">
          <div>
            <p className="text-xs text-muted">Upside / Downside</p>
            <p className={`text-xl font-bold font-mono ${compositeUpside >= 0 ? 'text-gain' : 'text-loss'}`}>
              {compositeUpside >= 0 ? '+' : ''}{compositeUpside.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Expected CAGR</p>
            <p className={`text-sm font-bold font-mono ${compositeCAGR >= 15 ? 'text-gain' : compositeCAGR >= 0 ? 'text-gold' : 'text-loss'}`}>
              {compositeCAGR.toFixed(1)}% p.a.
            </p>
          </div>
        </div>
      </div>

      {/* 3 method cards */}
      <div className="grid grid-cols-3 gap-3">
        <MethodCard
          method={peResult.method}
          desc={peResult.desc}
          fairValue={peResult.fairValue}
          currentPrice={company.currentPrice}
          highlight={true}
        />
        <MethodCard
          method={pegResult.method}
          desc={pegResult.desc}
          fairValue={pegResult.fairValue}
          currentPrice={company.currentPrice}
        />
        <MethodCard
          method={eyResult.method}
          desc={eyResult.desc}
          fairValue={eyResult.fairValue}
          currentPrice={company.currentPrice}
        />
      </div>

      {/* Key signals row */}
      <div className="grid grid-cols-4 gap-3">
        {/* Margin of Safety */}
        <div className="bg-border/20 rounded-lg p-3 text-center">
          <p className="text-xs text-muted mb-1">Margin of Safety</p>
          <p className={`text-base font-bold font-mono ${marginOfSafety >= 25 ? 'text-gain' : marginOfSafety >= 0 ? 'text-gold' : 'text-loss'}`}>
            {marginOfSafety.toFixed(1)}%
          </p>
          <p className="text-xs text-muted mt-0.5">
            {marginOfSafety >= 25 ? 'Good buffer' : marginOfSafety >= 0 ? 'Thin buffer' : 'Overpriced'}
          </p>
        </div>

        {/* Implied Growth */}
        <div className="bg-border/20 rounded-lg p-3 text-center">
          <p className="text-xs text-muted mb-1">Implied Growth</p>
          <p className="text-base font-bold font-mono text-accent">{impliedGrowth.toFixed(1)}%</p>
          <p className="text-xs text-muted mt-0.5">Market expects</p>
        </div>

        {/* PEG Ratio */}
        <div className="bg-border/20 rounded-lg p-3 text-center">
          <p className="text-xs text-muted mb-1">PEG Ratio</p>
          <p className={`text-base font-bold font-mono ${currentPEG < 1 ? 'text-gain' : currentPEG < 2 ? 'text-gold' : 'text-loss'}`}>
            {currentPEG > 0 ? currentPEG.toFixed(2) : '—'}
          </p>
          <p className="text-xs text-muted mt-0.5">
            {currentPEG < 1 ? '< 1 = cheap' : currentPEG < 2 ? '1–2 = fair' : '> 2 = pricey'}
          </p>
        </div>

        {/* Earnings Yield */}
        <div className="bg-border/20 rounded-lg p-3 text-center">
          <p className="text-xs text-muted mb-1">Earnings Yield</p>
          <p className={`text-base font-bold font-mono ${eyResult.currentEY > RISK_FREE_RATE ? 'text-gain' : 'text-loss'}`}>
            {eyResult.currentEY.toFixed(1)}%
          </p>
          <p className="text-xs text-muted mt-0.5">vs {RISK_FREE_RATE}% G-Sec</p>
        </div>
      </div>

      {/* Simple explanation */}
      <div className="text-xs text-muted border-t border-border pt-3 space-y-1 leading-relaxed">
        <p><span className="text-primary font-medium">Forward PE</span> — projects future profits using your assumptions above</p>
        <p><span className="text-primary font-medium">PEG Ratio</span> — if EPS grows 20%/yr, a fair PE is ~20x (PEG = 1). Below 1 = potentially cheap</p>
        <p><span className="text-primary font-medium">Earnings Yield</span> — compares stock earnings vs Indian govt bond rate ({RISK_FREE_RATE}%). Higher = better</p>
      </div>
    </div>
  );
}
