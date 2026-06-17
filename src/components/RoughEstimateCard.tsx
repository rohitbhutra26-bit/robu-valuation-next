'use client';
import { Company, FinancialYear } from '@/lib/types';
import { getCompanyProfile } from '@/lib/sectorModelMap';
import { simpleValuation } from '@/lib/forecastUtils';
import { valuationReliability } from '@/lib/valuationReliability';
import SectionCard from './SectionCard';
import { ShieldAlert } from '@/lib/icons';

// Fallback read — only renders when the full model CAN'T give a trustworthy verdict
// (loss-makers, demergers, REITs, very short history). Never an empty page.
export default function RoughEstimateCard({ company, financials }: {
  company: Company; financials: FinancialYear[];
}) {
  if (!company || !company.currentPrice) return null;
  const rel = valuationReliability(company, financials);
  if (rel.reliable && financials.length >= 3) return null; // full verdict handles it

  const rough = simpleValuation(company, financials, getCompanyProfile(company));
  if (!rough) return null;
  const up = rough.upsidePct;

  return (
    <SectionCard title="A rough read — limited data" eyebrow="Best estimate" Icon={ShieldAlert} tone="warning"
      desc={!rel.reliable && rel.note ? rel.note : undefined}>
      <p className="text-[15px] text-primary/90 leading-relaxed">{rough.headline}</p>

      {typeof rough.fairValue === 'number' && rough.fairValue > 0 && (
        <div className="mt-4 flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-[11px] text-muted mb-0.5">Rough fair value</p>
            <p className="text-xl font-bold font-mono text-primary">₹{rough.fairValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted mb-0.5">Trading at</p>
            <p className="text-xl font-bold font-mono text-muted">₹{company.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          </div>
          {typeof up === 'number' && (
            <div>
              <p className="text-[11px] text-muted mb-0.5">Rough gap</p>
              <p className={`text-xl font-bold font-mono ${up > 15 ? 'text-gain' : up < -15 ? 'text-loss' : 'text-warning'}`}>{up >= 0 ? '+' : ''}{up.toFixed(0)}%</p>
            </div>
          )}
        </div>
      )}

      <p className="text-[12px] text-muted/70 mt-3.5">Based on {rough.basis}. A rough estimate, not a precise call — a starting point, not a target.</p>
    </SectionCard>
  );
}
