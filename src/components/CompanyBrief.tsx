'use client';

import { useState } from 'react';
import { Company } from '@/lib/types';
import { Building2, Users, ChevronDown } from '@/lib/icons';

interface Props { company: Company; }

function crore(n: number): string {
  if (!n || n <= 0) return '—';
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} lakh Cr`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K Cr`;
  return `₹${Math.round(n).toLocaleString('en-IN')} Cr`;
}

// Plain-English size bucket — tells a beginner "big & steady" vs "small & risky"
function sizeBucket(mcapCr: number): { label: string; note: string } {
  if (mcapCr >= 50000) return { label: 'Large company', note: 'big, established — usually steadier' };
  if (mcapCr >= 10000) return { label: 'Mid-size company', note: 'growing — more ups and downs' };
  if (mcapCr > 0)      return { label: 'Small company', note: 'small — higher risk, higher swings' };
  return { label: 'Size unknown', note: '' };
}

export default function CompanyBrief({ company }: Props) {
  const [open, setOpen] = useState(false);
  const size = sizeBucket(company.marketCap);
  const industry = company.industry || company.sector || '';
  const desc = company.description?.trim();
  const SHORT = 180;
  const longDesc = !!desc && desc.length > SHORT;
  const shown = desc ? (open || !longDesc ? desc : desc.slice(0, SHORT).trimEnd() + '…') : '';

  // Fallback one-liner when no business summary is available
  const fallback = `${company.name} is ${/^[aeiou]/i.test(industry) ? 'an' : 'a'} ${industry || 'listed'} company${company.exchange ? ` on the ${company.exchange}` : ''}.`;

  return (
    <div className="bg-card border border-border rounded-3xl p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 text-gold flex-shrink-0">
          <Building2 size={20} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[1.5px] text-muted">About the company</p>
          <p className="text-base font-bold text-primary mt-0.5">{company.name}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {industry && <span className="text-[12px] font-medium px-2 py-0.5 rounded-full bg-border/50 text-muted">{industry}</span>}
            {company.exchange && <span className="text-[12px] font-medium px-2 py-0.5 rounded-full bg-border/50 text-muted">{company.exchange}</span>}
            <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">{size.label}</span>
          </div>
        </div>
      </div>

      {/* What it does */}
      <p className="text-sm text-muted leading-relaxed mt-4">
        {shown || fallback}
        {longDesc && (
          <button onClick={() => setOpen(o => !o)} className="ml-1 text-gold font-semibold inline-flex items-center gap-0.5 hover:underline">
            {open ? 'less' : 'more'} <ChevronDown size={13} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
        )}
      </p>

      {/* Key facts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-border">
        <div>
          <p className="text-[12px] text-muted">Market value</p>
          <p className="text-[15px] font-bold text-primary font-mono">{crore(company.marketCap)}</p>
          <p className="text-[11px] text-muted/80 mt-0.5 leading-tight">{size.note}</p>
        </div>
        <div>
          <p className="text-[12px] text-muted">Industry</p>
          <p className="text-[15px] font-semibold text-primary leading-tight">{industry || '—'}</p>
        </div>
        {company.ceo && (
          <div>
            <p className="text-[12px] text-muted flex items-center gap-1"><Users size={11} /> Run by</p>
            <p className="text-[15px] font-semibold text-primary leading-tight">{company.ceo}</p>
          </div>
        )}
      </div>
    </div>
  );
}
