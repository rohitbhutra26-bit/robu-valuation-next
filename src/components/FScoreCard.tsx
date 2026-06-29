'use client';
import { Company, FinancialYear } from '@/lib/types';
import { piotroskiFScore } from '@/lib/qualityScores';
import SectionCard from './SectionCard';
import { BadgeCheck } from '@/lib/icons';

export default function FScoreCard({ company, financials }: { company: Company; financials: FinancialYear[] }) {
  const f = piotroskiFScore(company, financials);
  if (!f) return null;
  const tone = f.score >= 6 ? 'gain' : f.score >= 4 ? 'warning' : 'loss';
  const toneCls = tone === 'gain' ? 'text-gain' : tone === 'warning' ? 'text-warning' : 'text-loss';
  return (
    <SectionCard title="Business quality" eyebrow="Piotroski F-score" Icon={BadgeCheck} tone={tone}>
      <div className="flex items-baseline gap-2 mb-3">
        <span className={`text-3xl font-bold font-mono ${toneCls}`}>{f.score}<span className="text-muted text-lg font-normal">/{f.max}</span></span>
        <span className={`text-sm font-semibold ${toneCls}`}>{f.label}</span>
        <span className="text-[11px] text-muted ml-auto text-right">signs of a business getting<br/>stronger year-on-year</span>
      </div>
      <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
        {f.checks.map((c, i) => (
          <li key={i} className="flex items-center gap-2 text-[12px]">
            <span className={c.ok ? 'text-gain' : 'text-muted/40'}>{c.ok ? '✓' : '✕'}</span>
            <span className={c.ok ? 'text-primary/85' : 'text-muted/55 line-through'}>{c.text}</span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-muted/60 mt-3 leading-relaxed">8 of the 9 Piotroski tests (the 9th needs current-ratio data we don&apos;t yet parse). It rewards rising returns, real cash, less debt and no dilution — a quick read on whether the business is improving, separate from whether it&apos;s cheap.</p>
    </SectionCard>
  );
}
