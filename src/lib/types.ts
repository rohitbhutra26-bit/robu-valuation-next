export interface FinancialYear {
  year: string;
  revenue: number;
  pat: number;
  ebitda: number;
  eps: number;
  netMargin: number;
  ebitdaMargin: number;
  revenueGrowth: number;
  shares: number;
  ocf?: number;        // Operating Cash Flow — from Screener.in (not available in Yahoo)
  interest?: number;   // Interest expense (₹ Cr) — for coverage ratio
  borrowings?: number; // Total debt from balance sheet (₹ Cr)
  equity?: number;     // Equity capital + reserves (₹ Cr)
  source?: string;     // 'screener' | 'yahoo' — which data source this year came from
}

export interface Company {
  symbol: string;
  name: string;
  sector: string;
  industry?: string;
  exchange?: string;   // 'NSE' | 'BSE' — resolved by the data server
  currentPrice: number;
  previousClose?: number;
  marketCap: number;
  pe: number;
  forwardPE?: number;
  pb: number;
  roe: number;
  roa?: number;
  debtToEquity: number;
  currentRatio?: number;
  dividendYield: number;
  change: number;
  changePercent: number;
  changePct?: number;
  week52High: number;
  week52Low: number;
  eps?: number;
  beta?: number;
  shares?: number;
  revenueGrowth?: number;
  earningsGrowth?: number;
  pledgedPct?: number;   // Promoter shares pledged % — red-flag input
  financials?: FinancialYear[];
}

export interface ValuationAssumptions {
  revenueGrowthRate: number;
  netMarginAssumption: number;
  exitPE: number;           // kept for cross-check methods (PEG, Earnings Yield)
  exitMultiple: number;     // sector-appropriate: P/E for FMCG/IT, EV/EBITDA for Metals, P/B for Banks
  years: number;
  wacc: number;             // Weighted Avg Cost of Capital — used for DCF discount rate (%)
  marginOfSafety: number;   // Min discount to fair value before considering buy (%)
}

export interface ValuationResult {
  futureRevenue: number;
  futurePAT: number;
  futurePATPerShare: number;
  fairValue: number;
  cagr: number;
  upside: number;
  currentPrice: number;
  years: number;
}

export interface ScenarioResult {
  name: 'Bear' | 'Base' | 'Bull';
  fairValue: number;
  upside: number;
  cagr: number;
  color: string;
  revenueGrowth: number;
  netMargin: number;
  exitPE: number;
}

export interface SensitivityCell {
  revenueGrowth: number;
  exitPE: number;
  fairValue: number;
  upside: number;
}

export interface ForecastData {
  label: string;
  revenue: number;
  pat: number;
  type: 'historical' | 'projected';
}

export interface SearchResult {
  symbol: string;
  name: string;
  sector: string;
  exchange?: string;
  currentPrice?: number;
  changePercent?: number;
  /** How the backend matched this row: exact | starts | contains | fuzzy.
   *  'fuzzy' rows are typo-tolerant suggestions ("did you mean…"). */
  match?: 'exact' | 'starts' | 'contains' | 'fuzzy';
}
