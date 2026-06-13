import { NextRequest, NextResponse } from 'next/server';

/**
 * /api/discovery — ROBU Discovery Engine feed (Phase 1 skeleton)
 *
 * Architecture (see ROBU_Discovery_Engine_Architecture.docx):
 *   Heavy thinking runs as a NIGHTLY BATCH in the Python data server, which
 *   writes a ranked "Discovery Store". This route just reads that store and
 *   serves it to the UI — it never runs the 7 agents on a user request.
 *
 * Phase 1: the data server endpoint doesn't exist yet, so we serve curated
 * sample records in the FINAL output shape. When the batch job ships, flip
 * USE_DATA_SERVER to true — the UI contract does not change.
 */

const DATA_SERVER = process.env.DATA_SERVER_URL || 'http://localhost:8000';
// Live data server is now implemented (discovery/ package). Toggle via env:
//   DISCOVERY_USE_DATA_SERVER=true  → serve the real nightly feed
//   unset / false                   → serve the curated sample feed below
// Falls back to sample automatically if the data server is unreachable.
const USE_DATA_SERVER = process.env.DISCOVERY_USE_DATA_SERVER === 'true';

export type DiscoveryCategory =
  | 'Hidden Compounder'
  | 'Turnaround'
  | 'Emerging Leader'
  | 'Capacity Expansion'
  | 'Deep Value'
  | 'Smart Money'
  | 'Future Multibagger';

export interface DiscoveryRecord {
  symbol: string;
  name: string;
  sector: string;
  discoveryScore: number;          // 0–100
  grade: string;                   // A+ … F
  category: DiscoveryCategory;
  aiConviction: 'High' | 'Medium' | 'Low';
  isNew: boolean;
  whyFound: string;
  whyNow: string;
  futureTailwinds: string[];
  futureThreats: string[];
  hiddenOptionality: string;
  narrativeShift: string;
  whyMarketMayBeWrong: string;
  keyRisks: string[];
  industryTransformationScore: number;
  futureReadinessScore: number;
  generatedAt: string;
}

const SAMPLE: DiscoveryRecord[] = [
  {
    symbol: 'KAYNES', name: 'Kaynes Technology', sector: 'Semiconductors / EMS',
    discoveryScore: 87, grade: 'A', category: 'Hidden Compounder', aiConviction: 'High', isNew: true,
    whyFound: 'A rare listed pure-play on India’s electronics-manufacturing build-out, compounding revenue >40% while still under most institutional radars.',
    whyNow: 'Order book has stepped up sharply on the back of the national semiconductor mission, yet the stock barely appears on conventional screens.',
    futureTailwinds: ['Government chip & PLI incentives', 'Import-substitution in electronics', 'New OSAT/fab capacity coming online'],
    futureThreats: ['Execution risk on greenfield fabs', 'Customer concentration', 'Capex-heavy, working-capital intensive'],
    hiddenOptionality: 'Optionality on becoming a domestic OSAT supplier if the fab ramp succeeds.',
    narrativeShift: 'From small-cap EMS contractor → strategic node in India’s chip supply chain.',
    whyMarketMayBeWrong: 'Market still prices it as a low-margin contract manufacturer, ignoring the mix-shift to higher-value semiconductor work.',
    keyRisks: ['High valuation leaves no room for a miss', 'Fab execution timelines slip'],
    industryTransformationScore: 91, futureReadinessScore: 88, generatedAt: new Date().toISOString(),
  },
  {
    symbol: 'TATAELXSI', name: 'Tata Elxsi', sector: 'Auto + AI design services',
    discoveryScore: 79, grade: 'A-', category: 'Emerging Leader', aiConviction: 'Medium', isNew: true,
    whyFound: 'Design-led services house positioned at the intersection of automotive software, AI and media — structurally higher margin than classic IT services.',
    whyNow: 'AI-led product design demand is rising while margins quietly expand, ahead of a likely market re-rating.',
    futureTailwinds: ['Software-defined vehicles', 'Generative-AI design demand', 'Premium design margins vs IT peers'],
    futureThreats: ['Client concentration in auto', 'Wage inflation', 'Slowdown in discretionary tech spend'],
    hiddenOptionality: 'AI tooling could turn project work into repeatable, higher-margin platforms.',
    narrativeShift: 'From niche design vendor → core SDV & AI engineering partner.',
    whyMarketMayBeWrong: 'Valued like a cyclical IT name, not the design IP it actually sells.',
    keyRisks: ['Rich multiple', 'Auto demand cyclicality'],
    industryTransformationScore: 83, futureReadinessScore: 85, generatedAt: new Date().toISOString(),
  },
  {
    symbol: 'BEL', name: 'Bharat Electronics', sector: 'Defence electronics',
    discoveryScore: 81, grade: 'A', category: 'Future Multibagger', aiConviction: 'High', isNew: false,
    whyFound: 'Defence-electronics monopoly-ish position with a multi-year indigenisation order pipeline and steadily improving return ratios.',
    whyNow: 'Record order inflows plus defence-modernisation push, while the market still anchors to old PSU-style multiples.',
    futureTailwinds: ['Defence indigenisation', 'Export orders opening up', 'Strong, debt-free balance sheet'],
    futureThreats: ['Government-budget dependence', 'Order lumpiness', 'PSU re-rating may cap multiple'],
    hiddenOptionality: 'Civilian/space-electronics diversification beyond core defence.',
    narrativeShift: 'From sleepy PSU → strategic defence-tech compounder.',
    whyMarketMayBeWrong: 'Treated as a slow PSU; ignores the durability and visibility of the order book.',
    keyRisks: ['Policy/budget swings', 'Execution at scale'],
    industryTransformationScore: 76, futureReadinessScore: 80, generatedAt: new Date().toISOString(),
  },
  {
    symbol: 'TMPV', name: 'Tata Motors PV', sector: 'Automobile / EV',
    discoveryScore: 73, grade: 'B+', category: 'Turnaround', aiConviction: 'Medium', isNew: false,
    whyFound: 'EV market-share leader in India with a deleveraging story and improving free-cash-flow trajectory after years of losses.',
    whyNow: 'Margin recovery and net-debt reduction are landing faster than consensus expected.',
    futureTailwinds: ['India EV adoption curve', 'Deleveraging → re-rating', 'Premiumisation of portfolio'],
    futureThreats: ['Intensifying EV competition', 'Commodity/input cost swings', 'Demand cyclicality'],
    hiddenOptionality: 'Separate EV-business value crystallisation over time.',
    narrativeShift: 'From debt-laden laggard → profitable EV leader.',
    whyMarketMayBeWrong: 'Still discounts past losses rather than the improving cash generation.',
    keyRisks: ['Competition compresses EV margins', 'Macro auto slowdown'],
    industryTransformationScore: 79, futureReadinessScore: 74, generatedAt: new Date().toISOString(),
  },
  {
    symbol: 'COALINDIA', name: 'Coal India', sector: 'Metals & Mining / Energy',
    discoveryScore: 68, grade: 'B', category: 'Deep Value', aiConviction: 'Medium', isNew: false,
    whyFound: 'Cash-gushing, high-dividend energy backbone trading at a low single-digit multiple despite resilient demand.',
    whyNow: 'Power demand stays firm and payouts are generous, yet the market prices in terminal decline too aggressively.',
    futureTailwinds: ['Base-load power demand', 'High dividend yield', 'Diversification into mining services & renewables'],
    futureThreats: ['Energy-transition headwind', 'ESG de-rating', 'Regulated pricing'],
    hiddenOptionality: 'Land, logistics and renewable-energy diversification optionality.',
    narrativeShift: 'From “dying coal” → cash-return + transition-optionality play.',
    whyMarketMayBeWrong: 'Prices a fast decline that demand data does not yet support.',
    keyRisks: ['Long-term transition risk', 'Policy intervention on pricing'],
    industryTransformationScore: 52, futureReadinessScore: 58, generatedAt: new Date().toISOString(),
  },
  {
    symbol: 'PERSISTENT', name: 'Persistent Systems', sector: 'Technology / AI services',
    discoveryScore: 76, grade: 'A-', category: 'Emerging Leader', aiConviction: 'Medium', isNew: false,
    whyFound: 'Mid-cap IT name growing well above larger peers with an early, credible AI-engineering positioning.',
    whyNow: 'Consistent industry-leading growth while the market debates an AI threat that it is actually monetising.',
    futureTailwinds: ['Enterprise AI adoption', 'Above-peer growth', 'Strong deal pipeline'],
    futureThreats: ['Valuation premium', 'AI could compress services pricing', 'Talent costs'],
    hiddenOptionality: 'AI accelerators could lift utilisation and margins.',
    narrativeShift: 'From mid-cap IT → AI-native engineering partner.',
    whyMarketMayBeWrong: 'Lumps it with legacy IT facing AI disruption, missing that it is an AI beneficiary.',
    keyRisks: ['Rich multiple', 'Discretionary-spend slowdown'],
    industryTransformationScore: 78, futureReadinessScore: 82, generatedAt: new Date().toISOString(),
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  let records: DiscoveryRecord[] = SAMPLE;

  if (USE_DATA_SERVER) {
    try {
      const res = await fetch(`${DATA_SERVER}/discovery`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        records = (data.records ?? data) as DiscoveryRecord[];
      }
    } catch {
      // fall back to sample silently
    }
  }

  records = [...records].sort((a, b) => b.discoveryScore - a.discoveryScore);

  if (category && category !== 'All') {
    records = records.filter(r => r.category === category);
  }

  return NextResponse.json({
    generatedAt: records[0]?.generatedAt ?? new Date().toISOString(),
    newCount: SAMPLE.filter(r => r.isNew).length,
    total: records.length,
    records,
  });
}
