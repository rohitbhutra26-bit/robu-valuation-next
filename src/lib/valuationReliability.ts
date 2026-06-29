// Honesty engine: detects stocks where multiple-based fair value is unreliable.
//
// Two patterns it catches:
//  1. Incubator/conglomerate — value sits in businesses that don't earn yet
//     (airports under construction, green hydrogen, holding structures).
//     Earnings multiples are structurally blind to that value.
//  2. Exceptional-gain earnings — reported profit jumped while operating cash
//     fell, i.e. profits came from one-offs (stake sales), not the business.
//
// Most tools silently print a fair value anyway. We tell the user the truth.

import { Company, FinancialYear } from '@/lib/types';
import { getCompanyProfile } from '@/lib/sectorModelMap';

export interface ReliabilityResult {
  reliable: boolean;
  title: string;     // short banner headline
  note: string;      // plain-English explanation
}

const OK: ReliabilityResult = { reliable: true, title: '', note: '' };

export function valuationReliability(
  company: Company,
  financials: FinancialYear[],
): ReliabilityResult {
  if (!financials.length || company.currentPrice <= 0) return OK;

  // Pattern 0 — SME / recent listing with very short public history
  if (financials.length < 3) {
    return {
      reliable: false,
      title: 'Very short financial history — treat all numbers as rough',
      note: `Only ${financials.length} year${financials.length === 1 ? '' : 's'} of published financials available (common for SME and recently listed companies). Growth rates, fair value and scores built on so little history are guesses, not analysis. For SME stocks, check the DRHP/annual report directly and weight the promoter's track record more than any model.`,
    };
  }

  const profile = getCompanyProfile(company);
  const label   = `${profile.sectorLabel} ${company.industry || ''} ${company.sector || ''}`.toLowerCase();
  const isConglomerate = /conglomerate|diversified|holding|infra/.test(label);

  const latest = financials[financials.length - 1];
  const prev   = financials.length >= 2 ? financials[financials.length - 2] : null;

  // Pattern 3 - loss-making or negative net worth: earnings/book multiples don't apply.
  const negBook    = (latest.equity ?? 0) < 0 || (company.pb ?? 0) < 0 || (company.bookValue ?? 0) < 0;
  const lossYear   = latest.pat <= 0;
  const negReturns = (company.roe ?? 0) < 0;
  if (negBook || lossYear) {
    const why = negBook ? 'has negative net worth (it owes more than it owns)' : 'is making losses';
    return {
      reliable: false,
      title: "Loss-making / negative net worth - a fair value doesn't apply",
      note: `${company.name.split(' ').slice(0, 2).join(' ')} ${why}${negReturns ? ' and earns negative returns on equity' : ''}. P/E, P/B and discounted fair-value models all assume a profitable business with positive book value - so any "fair value" or cheap/expensive verdict here is meaningless. Treat this as a turnaround/special situation: look at debt, cash burn and whether losses are narrowing, not at a multiple.`,
    };
  }

  // Pattern — FINANCIAL DISTRESS: profitable on paper, but operating profit barely
  // covers the interest bill and leverage is heavy. Catches the "positive EPS yet going
  // bankrupt" case the loss/neg-book guards miss (the spirit of an Altman distress flag,
  // built from the data we actually have: EBITDA, interest, debt, equity). Excludes
  // banks/NBFCs — borrowing IS their business and is judged on asset quality instead.
  if (profile.model !== 'pb') {
    const _ebitda = latest.ebitda ?? 0;
    const _int    = latest.interest ?? 0;
    const _eq     = latest.equity ?? 0;
    const coverage = _int > 0 ? _ebitda / _int : Infinity;
    const lev      = _eq > 0 ? (latest.borrowings ?? 0) / _eq : Infinity;
    if (_int > 0 && _ebitda > 0 && coverage < 1.5 && (lev > 1.5 || !isFinite(lev))) {
      const n = company.name.split(' ').slice(0, 2).join(' ');
      return {
        reliable: false,
        title: 'Financially stressed — interest barely covered',
        note: `${n}'s operating profit covers its interest bill only ${coverage.toFixed(1)}× (a healthy business clears 3×+)${isFinite(lev) ? `, while carrying ${lev.toFixed(1)}× debt-to-equity` : ', on very heavy debt'}. When most of the profit goes to lenders, a small dip can wipe out the equity — so an earnings-based fair value overstates what's actually safe here. Watch debt, refinancing and cash flow, not the multiple.`,
      };
    }
  }

  // Pattern 2 — exceptional-gain earnings: PAT jumps, operating cash doesn't follow
  if (prev && prev.pat > 0 && latest.pat > 0) {
    const patJump  = latest.pat / prev.pat;
    const ocfKnown = (latest.ocf ?? 0) !== 0 || (prev.ocf ?? 0) !== 0;
    const ocfFell  = (latest.ocf ?? 0) < (prev.ocf ?? 0);
    if (patJump > 1.8 && ocfKnown && ocfFell) {
      return {
        reliable: false,
        title: 'Profits may include one-off gains',
        note: `Reported profit grew ${Math.round((patJump - 1) * 100)}% but cash from operations fell. When profit comes from one-time items (like selling a stake) instead of the everyday business, P/E and fair-value numbers built on that profit can mislead. Check the red flags and cash-flow trend before trusting the fair value.`,
      };
    }
  }

  // Pattern — distorted earnings (demerger / one-off): an absurdly low P/E (<4) almost
  // always means reported EPS is not real forward earnings (e.g. a fresh demerger).
  if (company.pe > 0 && company.pe < 4) {
    return {
      reliable: false,
      title: 'Reported earnings look distorted — verdict withheld',
      note: `${company.name.split(" ").slice(0,2).join(" ")} shows a price-to-earnings of just ${company.pe.toFixed(1)}, implausibly low for a normal company — it usually means the reported profit includes a one-off item or follows a recent demerger. We hold back a confident verdict and show a book-value-based rough read instead.`,
    };
  }

  // Pattern 1 — incubator/conglomerate priced far beyond current earnings
  const peExtreme  = company.pe <= 0 || company.pe > 35;
  const thinMargin = latest.netMargin > 0 && latest.netMargin < 5;
  if (isConglomerate && (peExtreme || thinMargin)) {
    return {
      reliable: false,
      title: 'Fair value is unreliable for this stock',
      note: `${company.name.split(' ').slice(0, 2).join(' ')} is a ${profile.sectorLabel.toLowerCase()} — much of its value sits in businesses that don't earn profits yet (new projects, incubated ventures). Models based on today's earnings can't see that value, so the fair value shown here is likely too pessimistic. Serious investors value such companies by adding up each business separately (sum-of-the-parts). Treat the verdict as a caution sign, not a price target.`,
    };
  }

  return OK;
}
