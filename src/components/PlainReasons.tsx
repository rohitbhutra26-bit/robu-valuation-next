'use client';

import { useMemo } from 'react';
import { Company, FinancialYear, ValuationAssumptions } from '@/lib/types';
import { DollarSign, Scale, Tag, CheckCircle2, AlertTriangle, XCircle } from '@/lib/icons';
import { getCompanyProfile } from '@/lib/sectorModelMap';
import { runPrimaryModel } from '@/lib/forecastUtils';
import { valuationReliability } from '@/lib/valuationReliability';

interface Props {
  company: Company;
  financials: FinancialYear[];
  assumptions: ValuationAssumptions;
}

type Status = 'good' | 'warn' | 'bad';

const STATUS = {
  good: { label: 'Looks good',  Icon: CheckCircle2, text: 'text-gain',    chip: 'bg-gain/10 text-gain border-gain/25',       ring: 'border-gain/30' },
  warn: { label: 'Be careful',  Icon: AlertTriangle, text: 'text-warning', chip: 'bg-warning/10 text-warning border-warning/25', ring: 'border-warning/30' },
  bad:  { label: 'Watch out',   Icon: XCircle,      text: 'text-loss',    chip: 'bg-loss/10 text-loss border-loss/25',       ring: 'border-loss/30' },
} as const;

function crore(n: number): string {
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)} lakh Cr`;
  if (Math.abs(n) >= 1000)   return `₹${(n / 1000).toFixed(1)}K Cr`;
  return `₹${Math.round(n).toLocaleString('en-IN')} Cr`;
}

export default function PlainReasons({ company, financials, assumptions }: Props) {
  const reasons = useMemo(() => {
    const recent = financials.filter(f => f.revenue > 0);
    const latest = recent[recent.length - 1];
    const isFinancial = /bank|financ|nbfc|insur/i.test(company.sector || '');

    // ── Q1: Does it actually make money? ──────────────────────────────────
    let q1: Status = 'warn';
    let q1text = 'We could not read enough profit history for this one.';
    if (latest) {
      const prior = recent[recent.length - 4] ?? recent[0];
      const profitable = latest.pat > 0;
      const grew = prior && prior.pat > 0 ? latest.pat > prior.pat : profitable;
      const roe = company.roe || 0;
      q1 = !profitable ? 'bad' : (grew && roe >= 12) ? 'good' : 'warn';
      const keep = latest.netMargin > 0 ? `keeps about ₹${Math.round(latest.netMargin)}` : 'keeps very little';
      q1text = !profitable
        ? `No — it lost money last year. A business that doesn't profit can run out of cash.`
        : q1 === 'good'
          ? `Yes. It earned ${crore(latest.pat)} last year and profit has been growing. Out of every ₹100 of sales, it ${keep} as profit.`
          : `It is profitable (${crore(latest.pat)} last year), but profit is flat or returns are modest. Decent, not a star.`;
    }

    // ── Q2: Is it drowning in debt? ───────────────────────────────────────
    const de = company.debtToEquity ?? 0;
    let q2: Status = de < 0.5 ? 'good' : de <= 1.5 ? 'warn' : 'bad';
    let q2text = de <= 0
      ? `Barely any debt — it mostly runs on its own money. Very safe on this measure.`
      : `It owes about ₹${de.toFixed(2)} for every ₹1 of its own money. ${de < 0.5 ? 'That is comfortable.' : de <= 1.5 ? 'Manageable, but keep an eye on it.' : 'That is heavy — one bad year hurts more.'}`;
    if (isFinancial) {
      // Banks/NBFCs run on borrowed money by design — debt ratio isn't a red flag the same way
      q2 = de > 8 ? 'warn' : 'good';
      q2text = `This is a bank/lender, so high borrowing is normal — that's their business. Nothing unusual here.`;
    }

    // ── Q3: Am I overpaying right now? ────────────────────────────────────
    let q3: Status = 'warn';
    let q3text = 'Not enough data to judge the price.';
    if (!valuationReliability(company, financials).reliable) {
      q3 = 'warn';
      q3text = "Can't judge the price fairly - this company is loss-making or has negative net worth, so P/E, P/B and DCF fair values don't apply. Treat it as a turnaround, not a bargain.";
    } else try {
      if (latest && company.currentPrice) {
        const profile = getCompanyProfile(company);
        const r = runPrimaryModel(profile.model, financials, company,
          assumptions.revenueGrowthRate, assumptions.netMarginAssumption,
          assumptions.exitMultiple, assumptions.years);
        const fv = Math.max(r.fairValue, 0);
        if (fv > 0) {
          const upside = ((fv - company.currentPrice) / company.currentPrice) * 100;
          q3 = upside > 15 ? 'good' : upside >= -15 ? 'warn' : 'bad';
          const mag = Math.abs(upside).toFixed(0);
          q3text = upside > 15
            ? `Looks cheap — trading about ${mag}% below what the business seems worth. Room to grow.`
            : upside >= -15
              ? `Priced about right — close to what the business seems worth. No big bargain, no big trap.`
              : `Looks pricey — trading about ${mag}% above what the business seems worth. You'd be paying up.`;
        }
      }
    } catch { /* keep default */ }

    return [
      { Icon: DollarSign, q: 'Does it actually make money?', status: q1, text: q1text },
      { Icon: Scale,      q: 'Is it drowning in debt?',      status: q2, text: q2text },
      { Icon: Tag,        q: 'Am I overpaying right now?',   status: q3, text: q3text },
    ];
  }, [company, financials, assumptions]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {reasons.map((r) => {
        const s = STATUS[r.status];
        return (
          <div key={r.q} className={`bg-card border ${s.ring} rounded-2xl p-5 flex flex-col gap-3`}>
            <div className="flex items-center justify-between gap-2">
              <span className={`flex items-center justify-center w-10 h-10 rounded-xl bg-border/40 ${s.text}`}>
                <r.Icon size={20} strokeWidth={2} />
              </span>
              <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full border ${s.chip}`}>
                <s.Icon size={12} /> {s.label}
              </span>
            </div>
            <p className="text-[15px] font-bold text-primary leading-snug">{r.q}</p>
            <p className="text-sm text-muted leading-relaxed">{r.text}</p>
          </div>
        );
      })}
    </div>
  );
}
