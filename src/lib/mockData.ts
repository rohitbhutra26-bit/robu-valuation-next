import { Company } from './types';

export const COMPANIES: Company[] = [
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd',
    sector: 'Conglomerate',
    currentPrice: 2847.50,
    marketCap: 1928450,
    pe: 27.4,
    pb: 2.1,
    roe: 9.8,
    debtToEquity: 0.38,
    dividendYield: 0.35,
    change: 42.30,
    changePercent: 1.51,
    week52High: 3024.90,
    week52Low: 2220.30,
    financials: [
      { year: 'FY20', revenue: 622809, pat: 39880, ebitda: 91874, eps: 63.0, netMargin: 6.4, ebitdaMargin: 14.8, revenueGrowth: 0, shares: 6339 },
      { year: 'FY21', revenue: 486326, pat: 49128, ebitda: 89823, eps: 77.6, netMargin: 10.1, ebitdaMargin: 18.5, revenueGrowth: -21.9, shares: 6339 },
      { year: 'FY22', revenue: 721634, pat: 67845, ebitda: 118932, eps: 106.9, netMargin: 9.4, ebitdaMargin: 16.5, revenueGrowth: 48.4, shares: 6348 },
      { year: 'FY23', revenue: 877193, pat: 73670, ebitda: 141754, eps: 115.9, netMargin: 8.4, ebitdaMargin: 16.2, revenueGrowth: 21.5, shares: 6356 },
      { year: 'FY24', revenue: 899042, pat: 79020, ebitda: 155428, eps: 116.7, netMargin: 8.8, ebitdaMargin: 17.3, revenueGrowth: 2.5, shares: 6769 },
    ],
  },
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services Ltd',
    sector: 'Information Technology',
    currentPrice: 3742.60,
    marketCap: 1362800,
    pe: 29.1,
    pb: 12.8,
    roe: 47.2,
    debtToEquity: 0.04,
    dividendYield: 1.82,
    change: -18.40,
    changePercent: -0.49,
    week52High: 4255.00,
    week52Low: 3311.80,
    financials: [
      { year: 'FY20', revenue: 156949, pat: 32340, ebitda: 42440, eps: 87.2, netMargin: 20.6, ebitdaMargin: 27.0, revenueGrowth: 0, shares: 371 },
      { year: 'FY21', revenue: 164177, pat: 33388, ebitda: 44617, eps: 90.1, netMargin: 20.3, ebitdaMargin: 27.2, revenueGrowth: 4.6, shares: 370 },
      { year: 'FY22', revenue: 191754, pat: 38327, ebitda: 51861, eps: 103.6, netMargin: 20.0, ebitdaMargin: 27.0, revenueGrowth: 16.8, shares: 370 },
      { year: 'FY23', revenue: 225458, pat: 42147, ebitda: 60124, eps: 114.7, netMargin: 18.7, ebitdaMargin: 26.7, revenueGrowth: 17.6, shares: 367 },
      { year: 'FY24', revenue: 240893, pat: 45908, ebitda: 65432, eps: 127.0, netMargin: 19.1, ebitdaMargin: 27.2, revenueGrowth: 6.8, shares: 361 },
    ],
  },
  {
    symbol: 'INFY',
    name: 'Infosys Ltd',
    sector: 'Information Technology',
    currentPrice: 1482.30,
    marketCap: 615240,
    pe: 22.7,
    pb: 7.4,
    roe: 33.1,
    debtToEquity: 0.08,
    dividendYield: 2.71,
    change: 12.80,
    changePercent: 0.87,
    week52High: 1887.30,
    week52Low: 1358.90,
    financials: [
      { year: 'FY20', revenue: 90791, pat: 16594, ebitda: 22042, eps: 39.0, netMargin: 18.3, ebitdaMargin: 24.3, revenueGrowth: 0, shares: 425 },
      { year: 'FY21', revenue: 100472, pat: 19351, ebitda: 25498, eps: 45.7, netMargin: 19.3, ebitdaMargin: 25.4, revenueGrowth: 10.7, shares: 424 },
      { year: 'FY22', revenue: 121641, pat: 22110, ebitda: 29798, eps: 52.5, netMargin: 18.2, ebitdaMargin: 24.5, revenueGrowth: 21.1, shares: 421 },
      { year: 'FY23', revenue: 146767, pat: 24108, ebitda: 34289, eps: 57.9, netMargin: 16.4, ebitdaMargin: 23.4, revenueGrowth: 20.7, shares: 416 },
      { year: 'FY24', revenue: 153670, pat: 26248, ebitda: 36944, eps: 63.4, netMargin: 17.1, ebitdaMargin: 24.1, revenueGrowth: 4.7, shares: 414 },
    ],
  },
  {
    symbol: 'HDFC',
    name: 'HDFC Ltd (merged entity)',
    sector: 'Banking & Finance',
    currentPrice: 1648.70,
    marketCap: 918200,
    pe: 18.2,
    pb: 2.8,
    roe: 16.4,
    debtToEquity: 6.2,
    dividendYield: 1.12,
    change: -9.20,
    changePercent: -0.56,
    week52High: 1794.00,
    week52Low: 1363.55,
    financials: [
      { year: 'FY20', revenue: 56475, pat: 17769, ebitda: 22340, eps: 31.8, netMargin: 31.5, ebitdaMargin: 39.6, revenueGrowth: 0, shares: 559 },
      { year: 'FY21', revenue: 59026, pat: 13566, ebitda: 20189, eps: 24.0, netMargin: 23.0, ebitdaMargin: 34.2, revenueGrowth: 4.5, shares: 565 },
      { year: 'FY22', revenue: 63343, pat: 13696, ebitda: 22781, eps: 24.1, netMargin: 21.6, ebitdaMargin: 36.0, revenueGrowth: 7.3, shares: 569 },
      { year: 'FY23', revenue: 72198, pat: 17004, ebitda: 27609, eps: 29.5, netMargin: 23.5, ebitdaMargin: 38.2, revenueGrowth: 14.0, shares: 576 },
      { year: 'FY24', revenue: 89345, pat: 22073, ebitda: 34280, eps: 38.2, netMargin: 24.7, ebitdaMargin: 38.4, revenueGrowth: 23.7, shares: 578 },
    ],
  },
  {
    symbol: 'WIPRO',
    name: 'Wipro Ltd',
    sector: 'Information Technology',
    currentPrice: 448.20,
    marketCap: 233450,
    pe: 19.6,
    pb: 3.2,
    roe: 16.8,
    debtToEquity: 0.12,
    dividendYield: 0.45,
    change: 3.60,
    changePercent: 0.81,
    week52High: 576.90,
    week52Low: 412.30,
    financials: [
      { year: 'FY20', revenue: 61023, pat: 9764, ebitda: 12840, eps: 16.8, netMargin: 16.0, ebitdaMargin: 21.0, revenueGrowth: 0, shares: 581 },
      { year: 'FY21', revenue: 62378, pat: 10796, ebitda: 13844, eps: 18.6, netMargin: 17.3, ebitdaMargin: 22.2, revenueGrowth: 2.2, shares: 580 },
      { year: 'FY22', revenue: 79312, pat: 12229, ebitda: 16648, eps: 21.1, netMargin: 15.4, ebitdaMargin: 21.0, revenueGrowth: 27.2, shares: 579 },
      { year: 'FY23', revenue: 90488, pat: 11352, ebitda: 16688, eps: 20.8, netMargin: 12.5, ebitdaMargin: 18.4, revenueGrowth: 14.1, shares: 547 },
      { year: 'FY24', revenue: 89823, pat: 11474, ebitda: 16722, eps: 21.9, netMargin: 12.8, ebitdaMargin: 18.6, revenueGrowth: -0.7, shares: 524 },
    ],
  },
  {
    symbol: 'BAJFINANCE',
    name: 'Bajaj Finance Ltd',
    sector: 'NBFC',
    currentPrice: 6748.90,
    marketCap: 407320,
    pe: 28.4,
    pb: 5.6,
    roe: 21.3,
    debtToEquity: 3.8,
    dividendYield: 0.44,
    change: 78.40,
    changePercent: 1.17,
    week52High: 8192.00,
    week52Low: 6187.80,
    financials: [
      { year: 'FY20', revenue: 23067, pat: 5264, ebitda: 11880, eps: 87.6, netMargin: 22.8, ebitdaMargin: 51.5, revenueGrowth: 0, shares: 60 },
      { year: 'FY21', revenue: 24024, pat: 4420, ebitda: 12441, eps: 73.5, netMargin: 18.4, ebitdaMargin: 51.8, revenueGrowth: 4.1, shares: 60 },
      { year: 'FY22', revenue: 28032, pat: 7028, ebitda: 15618, eps: 116.6, netMargin: 25.1, ebitdaMargin: 55.7, revenueGrowth: 16.7, shares: 60 },
      { year: 'FY23', revenue: 38317, pat: 11508, ebitda: 22289, eps: 190.7, netMargin: 30.0, ebitdaMargin: 58.2, revenueGrowth: 36.7, shares: 60 },
      { year: 'FY24', revenue: 54190, pat: 14451, ebitda: 30144, eps: 237.3, netMargin: 26.7, ebitdaMargin: 55.6, revenueGrowth: 41.4, shares: 60 },
    ],
  },
  {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd',
    sector: 'Banking',
    currentPrice: 1618.40,
    marketCap: 1232100,
    pe: 17.9,
    pb: 2.5,
    roe: 14.9,
    debtToEquity: 7.1,
    dividendYield: 1.20,
    change: -6.80,
    changePercent: -0.42,
    week52High: 1794.00,
    week52Low: 1363.50,
    financials: [
      { year: 'FY20', revenue: 122189, pat: 26257, ebitda: 56490, eps: 47.9, netMargin: 21.5, ebitdaMargin: 46.2, revenueGrowth: 0, shares: 548 },
      { year: 'FY21', revenue: 135936, pat: 31116, ebitda: 63280, eps: 56.7, netMargin: 22.9, ebitdaMargin: 46.6, revenueGrowth: 11.2, shares: 548 },
      { year: 'FY22', revenue: 152337, pat: 36961, ebitda: 72480, eps: 66.8, netMargin: 24.3, ebitdaMargin: 47.6, revenueGrowth: 12.1, shares: 553 },
      { year: 'FY23', revenue: 179521, pat: 44109, ebitda: 86320, eps: 79.5, netMargin: 24.6, ebitdaMargin: 48.1, revenueGrowth: 17.8, shares: 555 },
      { year: 'FY24', revenue: 282128, pat: 60812, ebitda: 128940, eps: 83.3, netMargin: 21.6, ebitdaMargin: 45.7, revenueGrowth: 57.2, shares: 760 },
    ],
  },
  {
    symbol: 'KAYNES',
    name: 'Kaynes Technology India Ltd',
    sector: 'Electronics Manufacturing',
    currentPrice: 3124.50,
    marketCap: 17840,
    pe: 94.2,
    pb: 14.8,
    roe: 18.6,
    debtToEquity: 0.28,
    dividendYield: 0.08,
    change: 54.70,
    changePercent: 1.78,
    week52High: 4440.00,
    week52Low: 2312.15,
    financials: [
      { year: 'FY20', revenue: 694, pat: 24, ebitda: 62, eps: 4.8, netMargin: 3.5, ebitdaMargin: 8.9, revenueGrowth: 0, shares: 5 },
      { year: 'FY21', revenue: 712, pat: 31, ebitda: 74, eps: 6.2, netMargin: 4.4, ebitdaMargin: 10.4, revenueGrowth: 2.6, shares: 5 },
      { year: 'FY22', revenue: 969, pat: 56, ebitda: 112, eps: 11.2, netMargin: 5.8, ebitdaMargin: 11.6, revenueGrowth: 36.1, shares: 5 },
      { year: 'FY23', revenue: 1383, pat: 98, ebitda: 171, eps: 17.6, netMargin: 7.1, ebitdaMargin: 12.4, revenueGrowth: 42.7, shares: 5.7 },
      { year: 'FY24', revenue: 1869, pat: 178, ebitda: 261, eps: 31.1, netMargin: 9.5, ebitdaMargin: 14.0, revenueGrowth: 35.1, shares: 5.7 },
    ],
  },
];

export function getCompany(symbol: string): Company | undefined {
  return COMPANIES.find((c) => c.symbol === symbol.toUpperCase());
}

export function searchCompanies(query: string): Company[] {
  const q = query.toLowerCase();
  return COMPANIES.filter(
    (c) =>
      c.symbol.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.sector.toLowerCase().includes(q)
  );
}

export const AI_OVERVIEWS: Record<string, { bull: string; bear: string; summary: string }> = {
  RELIANCE: {
    summary:
      'Reliance Industries is India\'s largest conglomerate with diversified interests across O2C, telecom (Jio), and retail. The company\'s massive capital allocation toward new energy and 5G rollout positions it as a long-term structural compounder.',
    bull:
      'Jio\'s subscriber monetisation inflection, new energy capex cycle maturing into high-margin revenue, and retail expansion into tier-2/3 cities create a multi-year earnings runway. O2C segment benefits from refining margin recovery and petchem integration.',
    bear:
      'Debt-funded growth cycle could pressure free cash flows. Retail and Jio valuations already partially priced in. Any regulatory headwinds in telecom pricing or delays in new energy project commissioning could disappoint consensus earnings estimates.',
  },
  TCS: {
    summary:
      'TCS is India\'s premier IT services company with an unparalleled client base across BFSI, retail, and manufacturing. Its scale, talent depth, and margin profile make it the benchmark for Indian IT.',
    bull:
      'AI-led transformation driving incremental deal wins, BFSI vertical recovery in the US, and margin expansion from offshore mix shift. TCS\'s strong order book and deal pipeline signal sustained mid-teens earnings growth over FY25-27.',
    bear:
      'Discretionary IT spending compression from global macro uncertainty, visa cost headwinds, and attrition normalisation could cap revenue growth below 10%. Valuation premium versus peers leaves limited margin of safety in a risk-off environment.',
  },
  INFY: {
    summary:
      'Infosys is the second-largest Indian IT exporter, known for its strong client mining capabilities and operational excellence. Its cloud and data analytics practices are growing rapidly.',
    bull:
      'Large deal TCV momentum, Cobalt cloud framework adoption, and margin recovery toward the 21-23% band provide EPS upgrade catalysts. Infosys\'s shareholder-friendly capital return policy supports valuation floor.',
    bear:
      'Top client concentration risk, management guidance volatility, and headcount rationalisation signals point to near-term revenue softness. Hyper-automation risks cannibalising traditional application management revenues long-term.',
  },
  HDFC: {
    summary:
      'Post-merger HDFC entity combines the mortgage franchise strength of HDFC Ltd with HDFC Bank\'s distribution and CASA base, creating India\'s largest private sector lending conglomerate.',
    bull:
      'Synergy realisation from merger integration, mortgage book re-rating, and cross-sell opportunities into HDFC Bank\'s 88M customer base provide a compelling 3-year earnings acceleration story.',
    bear:
      'Integration complexity, elevated credit costs in the merged book, and near-term NIM compression as HDFC Ltd\'s high-cost borrowings reprice could suppress RoE below pre-merger HDFC Bank levels for 2-3 years.',
  },
  WIPRO: {
    summary:
      'Wipro is a global IT services company with a refocused strategy under new leadership. Its consulting-led approach and vertical-specific solutions are gaining traction in key markets.',
    bull:
      'Strategic acquisitions integrating into core verticals, cost optimisation initiatives improving EBIT margins toward 17-18%, and a recovery in BFSI and energy verticals could drive EPS re-rating.',
    bear:
      'Persistent market share loss to Infosys and HCL, muted large deal momentum, and organisational restructuring disruption remain key risks. Revenue growth lagging peers limits near-term multiple expansion.',
  },
  BAJFINANCE: {
    summary:
      'Bajaj Finance is India\'s most valuable NBFC, renowned for its consumer durable and personal loan franchise. Its data-driven underwriting and cross-sell engine are industry-leading.',
    bull:
      'Rural market penetration under BFL 2.0 strategy, secured assets scaling, and EMI card ecosystem deepening create a massive TAM expansion opportunity. AUM CAGR of 25%+ with improving asset quality supports premium valuation.',
    bear:
      'Rising funding costs compressing NIMs, unsecured lending regulatory tightening by RBI, and competition from fintechs and banks in consumer credit segments could structurally cap growth and RoE.',
  },
  HDFCBANK: {
    summary:
      'HDFC Bank is India\'s largest private sector bank by market cap, with a pristine asset quality track record and best-in-class operating metrics. Post-merger integration is the near-term focus.',
    bull:
      'CASA franchise leverage, branch expansion into semi-urban markets, and merger synergies from HDFC Ltd driving mortgage cross-sell create a compelling multi-year earnings compounding story.',
    bear:
      'Near-term NIM dilution from HDFC Ltd\'s higher-cost wholesale borrowings, deposit growth constraints limiting loan growth, and elevated credit costs in the merged book could disappoint near-term consensus.',
  },
  KAYNES: {
    summary:
      'Kaynes Technology is a leading EMES player in India, riding the PLI-led domestic electronics manufacturing boom. Its IoT, automotive, and industrial electronics focus differentiates it from commodity EMS players.',
    bull:
      'Order book visibility of 3x revenue, semiconductor ATMP foray via greenfield fab, and Apple supply chain qualification provide exponential revenue scaling potential. Domestic content localisation mandates are structural tailwinds.',
    bear:
      'Stretched valuation at 90x+ PE, customer concentration risk, working capital intensity, and execution risks around the semiconductor ATMP project could trigger significant de-rating in a risk-off environment.',
  },
};
