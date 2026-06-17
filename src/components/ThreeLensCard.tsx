'use client';
import { useMemo } from 'react';
import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import { getCompanyProfile } from '@/lib/sectorModelMap';
import { runPrimaryModel, earningsPowerValue, impliedGrowthRate, pegModel } from '@/lib/forecastUtils';
import { valuationReliability } from '@/lib/valuationReliability';
import SectionCard from './SectionCard';
import { Activity } from '@/lib/icons';

type Sig = 'cheap' | 'fair' | 'rich';
const BG:   Record<Sig, string> = {
  cheap: 'bg-gain/10 border-gain/25 text-gain',
  fair:  'bg-warning/10 border-warning/25 text-warning',
  rich:  'bg-loss/10 border-loss/25 text-loss',
};
const WORD: Record<Sig, string> = { cheap: 'Cheap', fair: 'Fair', rich: 'Pricey' };

export default function ThreeLensCard({ company, financials, assumptions }: {
  company: Company; financials: FinancialYear[]; assumptions: ValuationAssumptions;
}) {
  const lenses = useMemo(() => {
    if (!financials.length || !company.currentPrice) return null;
    if (!valuationReliability(company, financials).reliable) return null;
    const price = company.currentPrice;
    const profile = getCompanyProfile(company);

    // Lens 1 — sector model (the headline view, vs peers)
    let modelSig: Sig = 'fair'; let modelText = '';
    try {
      const r = runPrimaryModel(profile.model, financials, company,
        assumptions.revenueGrowthRate, assumptions.netMarginAssumption, assumptions.exitMultiple, assumptions.years);
      if (r.fairValue > 0) {
        const up = (r.fairValue - price) / price * 100;
        modelSig = up > 20 ? 'cheap' : up < -15 ? 'rich' : 'fair';
        modelText = `Worth about ₹${r.fairValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} on its ${profile.exitMultipleLabel.replace('Exit ', '')} — ${up >= 0 ? '+' : ''}${up.toFixed(0)}% over ${assumptions.years}y.`;
      }
    } catch { /* ignore */ }

    // Lens 2 — earnings floor (EPV: today's profit, no growth)
    const epv = earningsPowerValue(company, financials);
    let epvSig: Sig = 'fair'; let epvText = '';
    if (epv.fairValue > 0) {
      const prem = epv.growthPremiumPct;
      epvSig = prem < 0 ? 'cheap' : prem > 75 ? 'rich' : 'fair';
      epvText = prem < 0
        ? `Trading below its earnings floor (₹${epv.fairValue.toFixed(0)}) — cheap on today's profit alone.`
        : `Today's profit alone is worth ~₹${epv.fairValue.toFixed(0)}; the other ${prem.toFixed(0)}% of the price is what you're paying for future growth.`;
    }

    // Lens 3 — the market's own bet (growth priced in vs delivered)
    let impSig: Sig = 'fair'; let impText = '';
    try {
      const implied = impliedGrowthRate(financials, company, assumptions.netMarginAssumption, company.pe > 0 ? company.pe : 25, assumptions.years);
      const delivered = pegModel(financials, company).epsCAGR;
      impSig = implied > delivered + 5 ? 'rich' : implied < delivered - 3 ? 'cheap' : 'fair';
      impText = `The price assumes about ${implied.toFixed(0)}%/yr growth; it has actually delivered ${delivered > 0 ? delivered.toFixed(0) + '%' : 'less'}.`;
    } catch { /* ignore */ }

    return [
      { name: 'Our model',      sub: 'vs sector peers',            sig: modelSig, text: modelText },
      { name: 'Earnings floor', sub: "today's profit, no growth",  sig: epvSig,   text: epvText },
      { name: "Market's bet",   sub: 'growth priced vs delivered', sig: impSig,   text: impText },
    ].filter(l => l.text);
  }, [company, financials, assumptions]);

  if (!lenses || lenses.length < 2) return null;
  const cheap = lenses.filter(l => l.sig === 'cheap').length;
  const rich  = lenses.filter(l => l.sig === 'rich').length;
  const synth = cheap === lenses.length ? { tone: 'text-gain',    msg: 'All three lenses agree — this looks cheap.' }
    : rich === lenses.length            ? { tone: 'text-loss',    msg: 'All three lenses agree — this looks expensive.' }
    : cheap > rich                      ? { tone: 'text-gain',    msg: "Leans cheap — but the lenses don't fully agree." }
    : rich > cheap                      ? { tone: 'text-loss',    msg: "Leans pricey — the lenses don't fully agree." }
    :                                     { tone: 'text-warning', msg: 'Mixed signals — the disagreement is the interesting part.' };

  return (
    <SectionCard title="Three lenses on the price" eyebrow="Cross-check" Icon={Activity} tone="neutral"
      desc="One number can fool you. We judge the price three independent ways — and tell you when they agree.">
      <div className="space-y-2.5">
        {lenses.map(l => (
          <div key={l.name} className="flex items-start gap-3 bg-terminal/40 border border-border rounded-2xl px-3.5 py-3">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 mt-0.5 ${BG[l.sig]}`}>{WORD[l.sig]}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">{l.name} <span className="text-muted font-normal text-[12px]">· {l.sub}</span></p>
              <p className="text-[13px] text-muted leading-relaxed mt-0.5">{l.text}</p>
            </div>
          </div>
        ))}
      </div>
      <p className={`text-sm font-semibold mt-4 ${synth.tone}`}>{synth.msg}</p>
    </SectionCard>
  );
}
