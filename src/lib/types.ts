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
}

export interface Company {
  symbol: string;
  name: string;
  sector: string;
  industry?: string;
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
  financials?: FinancialYear[];
}

export interface ValuationAssumptions {
  revenueGrowthRate: number;
  netMarginAssumption: number;
  exitPE: number;           // kept for cross-check methods (PEG, Earnings Yield)
  exitMultiple: number;     // sector-appropriate: P/E for FMCG/IT, EV/EBITDA for Metals, P/B for Banks
  years: number;
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
}
