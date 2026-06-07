/**
 * sectorModelMap.ts
 *
 * Maps each sector → the valuation model that institutional analysts actually use.
 *
 * Why this matters:
 *  - HDFC Bank valued on P/E is meaningless — banks are priced on P/B
 *  - Tata Steel on P/E is misleading — cyclicals use EV/EBITDA to strip out D&A
 *  - Kaynes Technology on P/E is fine — high-growth tech sometimes uses EV/Sales
 *
 * Every sector profile also carries the scenario deltas used by ScenarioCards.
 */

export type ValuationModel = 'pe' | 'ev_ebitda' | 'pb' | 'ev_sales';

export interface SectorProfile {
  model: ValuationModel;
  sectorLabel: string;
  exitMultipleLabel: string;     // "Exit P/E" | "Exit EV/EBITDA" | "Exit P/B" | "Exit EV/Sales"
  defaultExitMultiple: number;
  exitMultipleMin: number;
  exitMultipleMax: number;
  exitMultipleStep: number;
  multipleRationale: string;     // one-line "why this model"

  // Scenario deltas from base assumptions
  bearGrowthDelta: number;
  bearMarginDelta: number;
  bearMultipleDelta: number;
  bullGrowthDelta: number;
  bullMarginDelta: number;
  bullMultipleDelta: number;
}

// ─── Helper factories ────────────────────────────────────────────────────────

function peProfile(label: string, defaultPE: number): SectorProfile {
  return {
    model: 'pe',
    sectorLabel: label,
    exitMultipleLabel: 'Exit P/E',
    defaultExitMultiple: defaultPE,
    exitMultipleMin: 5,
    exitMultipleMax: 100,
    exitMultipleStep: 1,
    multipleRationale: 'Market prices this sector on earnings — P/E is the standard lens',
    bearGrowthDelta: -6,  bearMarginDelta: -3,  bearMultipleDelta: -7,
    bullGrowthDelta:  7,  bullMarginDelta:  3,  bullMultipleDelta: 10,
  };
}

function evEbitdaProfile(label: string, defaultMult: number, min: number, max: number): SectorProfile {
  return {
    model: 'ev_ebitda',
    sectorLabel: label,
    exitMultipleLabel: 'Exit EV/EBITDA',
    defaultExitMultiple: defaultMult,
    exitMultipleMin: min,
    exitMultipleMax: max,
    exitMultipleStep: 0.5,
    multipleRationale: 'Asset-heavy / cyclical sectors — EV/EBITDA removes D&A distortion',
    bearGrowthDelta: -8,  bearMarginDelta: -4,  bearMultipleDelta: -2.0,
    bullGrowthDelta:  9,  bullMarginDelta:  4,  bullMultipleDelta:  3.0,
  };
}

function pbProfile(label: string, defaultPB: number, max: number): SectorProfile {
  return {
    model: 'pb',
    sectorLabel: label,
    exitMultipleLabel: 'Exit P/B',
    defaultExitMultiple: defaultPB,
    exitMultipleMin: 0.3,
    exitMultipleMax: max,
    exitMultipleStep: 0.1,
    multipleRationale: 'Financials valued on Book Value — ROE drives P/B premium',
    // Wider deltas — bear/bull should feel meaningfully different
    bearGrowthDelta: -6,  bearMarginDelta: -2,  bearMultipleDelta: -1.0,
    bullGrowthDelta:  7,  bullMarginDelta:  2,  bullMultipleDelta:  1.5,
  };
}

// ─── The map ─────────────────────────────────────────────────────────────────

export const SECTOR_PROFILES: Record<string, SectorProfile> = {
  // ══ P/E-based ══════════════════════════════════════════════════════════════

  // ── IT / Tech ──
  'Information Technology': peProfile('IT / Software', 28),
  'Technology':             peProfile('IT / Software', 28),

  // ── Consumer ──
  'FMCG':                    peProfile('FMCG', 52),
  'Consumer':                peProfile('Consumer', 40),
  'Consumer Discretionary':  peProfile('Consumer', 35),
  // Yahoo Finance aliases — many Indian stocks come tagged with these
  'Consumer Cyclical':       peProfile('Consumer Cyclical', 25),   // autos, retail, discretionary
  'Consumer Defensive':      peProfile('Consumer Defensive', 40),  // FMCG, staples

  // ── Healthcare / Pharma ──
  'Pharmaceuticals':         peProfile('Pharma', 32),
  'Healthcare':              peProfile('Healthcare', 45),

  // ── Auto ──
  'Automobiles':             peProfile('Auto', 22),
  'Auto':                    peProfile('Auto', 22),

  // ── Industrials / Capital Goods ──
  'Capital Goods':           peProfile('Capital Goods', 28),
  'Industrials':             peProfile('Industrials', 26),         // Yahoo Finance alias
  'Industrial Conglomerates':peProfile('Industrials', 26),
  'Electrical Equipment':    peProfile('Electrical Equip', 30),
  'Defence':                 peProfile('Defence', 35),

  // ── Other P/E ──
  'Cement':                  peProfile('Cement', 28),
  'Chemicals':               peProfile('Chemicals', 30),
  'Telecom':                 peProfile('Telecom', 35),
  'Communication Services':  peProfile('Telecom / Media', 30),     // Yahoo Finance alias
  'Conglomerate':            peProfile('Conglomerate', 35),
  'Retail':                  peProfile('Retail', 35),
  'Real Estate':             peProfile('Real Estate / REIT', 22),
  'Textiles':                peProfile('Textiles', 18),
  'Hospitality':             peProfile('Hospitality', 30),
  'Aviation':                peProfile('Aviation', 15),
  'Logistics':               peProfile('Logistics', 25),
  'Media':                   peProfile('Media', 22),

  // ══ EV/EBITDA-based ════════════════════════════════════════════════════════
  'Metals':           evEbitdaProfile('Metals & Mining',    6,  2, 15),
  'Metals & Mining':  evEbitdaProfile('Metals & Mining',    6,  2, 15),
  'Mining':           evEbitdaProfile('Mining',             7,  2, 15),
  'Basic Materials':  evEbitdaProfile('Metals / Materials', 6,  2, 15),  // Yahoo Finance alias
  'Infrastructure':   evEbitdaProfile('Infrastructure',    14,  5, 30),
  'Energy':           evEbitdaProfile('Energy / O&G',       7,  3, 18),
  'Utilities':        evEbitdaProfile('Power / Utilities',  9,  4, 20),
  'Oil & Gas':        evEbitdaProfile('Oil & Gas',          5,  2, 12),

  // ══ P/B-based ══════════════════════════════════════════════════════════════
  'Banking':            pbProfile('Banking',            2.2,  8),
  'Financial Services': pbProfile('Financial Services',  4.5, 12),
  'NBFC':               pbProfile('NBFC',                4.5, 12),
  'Insurance':          pbProfile('Insurance',           8,   20),

  // ══ EV/Sales-based (high-growth / early-stage) ═════════════════════════════
  'Electronics': {
    model: 'ev_sales',
    sectorLabel: 'Electronics / EMS',
    exitMultipleLabel: 'Exit EV/Sales',
    defaultExitMultiple: 2.5,
    exitMultipleMin: 0.5,
    exitMultipleMax: 10,
    exitMultipleStep: 0.25,
    multipleRationale: 'High-growth EMS / electronics priced on revenue multiple',
    bearGrowthDelta: -6,  bearMarginDelta: -1,  bearMultipleDelta: -0.5,
    bullGrowthDelta:  8,  bullMarginDelta:  1,  bullMultipleDelta:  1.0,
  },
};

export const DEFAULT_SECTOR_PROFILE: SectorProfile = peProfile('Broad Market', 25);

export function getSectorProfile(sector: string): SectorProfile {
  return SECTOR_PROFILES[sector] ?? DEFAULT_SECTOR_PROFILE;
}

// ─── Company-name overrides ──────────────────────────────────────────────────
// Problem: Screener.in tags a huge variety of businesses as "Financial Services"
// — banks, NBFCs, exchanges, AMCs, depositories, brokers all get the same sector.
// Applying P/B to MCX (an exchange) is like valuing Google on book value — wrong.
//
// This function goes one level deeper: it inspects the company NAME to detect
// the actual business type and returns the correct valuation profile.
//
// Rule priority:
//   1. Name-based override (most specific)
//   2. Sector-based lookup (SECTOR_PROFILES map)
//   3. DEFAULT_SECTOR_PROFILE (Broad Market P/E)

// Dedicated profiles for mis-classified "Financial Services" sub-types
const EXCHANGE_PROFILE: SectorProfile = {
  model: 'pe',
  sectorLabel: 'Exchange / Capital Mkt',
  exitMultipleLabel: 'Exit P/E',
  defaultExitMultiple: 45,
  exitMultipleMin: 20,
  exitMultipleMax: 100,
  exitMultipleStep: 1,
  multipleRationale: 'Exchanges are fee-based platform businesses — valued on earnings (P/E), not book value',
  bearGrowthDelta: -7,  bearMarginDelta: -3,  bearMultipleDelta: -10,
  bullGrowthDelta:  8,  bullMarginDelta:  3,  bullMultipleDelta:  15,
};

const DEPOSITORY_PROFILE: SectorProfile = {
  model: 'pe',
  sectorLabel: 'Depository / Registrar',
  exitMultipleLabel: 'Exit P/E',
  defaultExitMultiple: 40,
  exitMultipleMin: 20,
  exitMultipleMax: 80,
  exitMultipleStep: 1,
  multipleRationale: 'Depositories are utility-like monopolies — priced on earnings quality, not book',
  bearGrowthDelta: -5,  bearMarginDelta: -3,  bearMultipleDelta: -8,
  bullGrowthDelta:  6,  bullMarginDelta:  3,  bullMultipleDelta: 10,
};

const AMC_PROFILE: SectorProfile = {
  model: 'pe',
  sectorLabel: 'Asset Management (AMC)',
  exitMultipleLabel: 'Exit P/E',
  defaultExitMultiple: 35,
  exitMultipleMin: 15,
  exitMultipleMax: 80,
  exitMultipleStep: 1,
  multipleRationale: 'AMCs earn management fees on AUM — valued on P/E, grows with market cap expansion',
  bearGrowthDelta: -8,  bearMarginDelta: -3,  bearMultipleDelta: -8,
  bullGrowthDelta:  9,  bullMarginDelta:  3,  bullMultipleDelta: 10,
};

const INSURANCE_PROFILE: SectorProfile = {
  model: 'pe',
  sectorLabel: 'Insurance',
  exitMultipleLabel: 'Exit P/E',
  defaultExitMultiple: 55,
  exitMultipleMin: 20,
  exitMultipleMax: 120,
  exitMultipleStep: 1,
  multipleRationale: 'Indian insurers trade on P/E (embedded value proxy) — HDFC Life / SBI Life trade at 55–80x',
  bearGrowthDelta: -6,  bearMarginDelta: -2,  bearMultipleDelta: -10,
  bullGrowthDelta:  8,  bullMarginDelta:  2,  bullMultipleDelta:  15,
};

const BROKER_PROFILE: SectorProfile = {
  model: 'pe',
  sectorLabel: 'Broking / Wealth Mgmt',
  exitMultipleLabel: 'Exit P/E',
  defaultExitMultiple: 28,
  exitMultipleMin: 10,
  exitMultipleMax: 60,
  exitMultipleStep: 1,
  multipleRationale: 'Fee-based brokers & wealth managers — earnings-driven, not book-value driven',
  bearGrowthDelta: -8,  bearMarginDelta: -4,  bearMultipleDelta: -6,
  bullGrowthDelta: 10,  bullMarginDelta:  4,  bullMultipleDelta:  8,
};

// Known symbols that are mis-classified by Screener.in (belt-and-suspenders)
// Add any stock here where the name-based detection doesn't catch it.
const SYMBOL_OVERRIDES: Record<string, SectorProfile> = {
  // ── Exchanges ──
  MCX:       EXCHANGE_PROFILE,
  BSE:       EXCHANGE_PROFILE,
  // ── Depositories / Registrars ──
  CDSL:      DEPOSITORY_PROFILE,
  CAMS:      DEPOSITORY_PROFILE,
  KFINTECH:  DEPOSITORY_PROFILE,
  // ── AMCs ──
  HDFCAMC:   AMC_PROFILE,
  NAM_INDIA:  AMC_PROFILE,   // Nippon AMC
  ABSLAMC:   AMC_PROFILE,    // Aditya Birla Sun Life AMC
  // ── Brokers & Wealth Managers ──
  ANGELONE:  BROKER_PROFILE,  // Angel One (was Angel Broking — name change hides it)
  MOFSL:     BROKER_PROFILE,  // Motilal Oswal Financial Services
  IIFLSEC:   BROKER_PROFILE,  // IIFL Securities
  '360ONE':  BROKER_PROFILE,  // 360 ONE WAM (wealth management)
  NUVAMA:    BROKER_PROFILE,  // Nuvama Wealth

  // ── Energy / Conglomerates ────────────────────────────────────────────────
  // RELIANCE is O&G + Jio (Telecom) + Retail — Screener sometimes returns
  // the company website "ril.com" as sector; force a correct profile here.
  RELIANCE:    evEbitdaProfile('Conglomerate / Energy', 8, 4, 18),
  ADANIENT:    evEbitdaProfile('Conglomerate / Infra',  10, 5, 22),
  ITC:         peProfile('Conglomerate / FMCG', 28),

  // ── Oil & Gas ─────────────────────────────────────────────────────────────
  ONGC:        evEbitdaProfile('Oil & Gas', 5, 2, 10),
  IOC:         evEbitdaProfile('Oil & Gas / Refining', 6, 2, 12),
  BPCL:        evEbitdaProfile('Oil & Gas / Refining', 6, 2, 12),
  HPCL:        evEbitdaProfile('Oil & Gas / Refining', 5, 2, 10),
  GAIL:        evEbitdaProfile('Gas Utilities', 8, 3, 15),

  // ── Infrastructure / Engineering ──────────────────────────────────────────
  LT:          evEbitdaProfile('Infrastructure / EPC', 12, 5, 25),

  // ── Auto companies tagged as "Consumer Cyclical" by Yahoo Finance ──
  // These stocks use Screener.in sector = "Consumer Cyclical" but should be Auto P/E
  MM:          peProfile('Auto / Diversified', 22),   // Mahindra & Mahindra
  MARUTI:      peProfile('Auto', 24),                 // Maruti Suzuki
  TMPV:        peProfile('Auto', 14),                 // Tata Motors PV (demerged from TATAMOTORS Nov 2025)
  TMCV:        peProfile('Auto', 12),                 // Tata Motors CV (listed Nov 2025)
  HEROMOTOCO:  peProfile('Auto', 20),                 // Hero MotoCorp
  BAJAJ_AUTO:  peProfile('Auto', 25),                 // Bajaj Auto
  EICHERMOT:   peProfile('Auto / Premium', 30),       // Eicher Motors (Royal Enfield premium)
  TIINDIA:     peProfile('Auto Ancillaries', 28),     // Tube Investments
  MOTHERSON:   peProfile('Auto Ancillaries', 18),     // Samvardhana Motherson
  BOSCHLTD:    peProfile('Auto Ancillaries', 40),     // Bosch India
  BHARATFORG:  peProfile('Auto Ancillaries', 28),     // Bharat Forge

  // ── Retail / consumer stocks tagged as "Consumer Cyclical" ──
  TITAN:       peProfile('Premium Consumer', 55),     // Titan (jewellery/watches — premium brand PE)
  DMART:       peProfile('Retail', 80),               // Avenue Supermarts (DMart — extremely premium)
  TRENT:       peProfile('Retail / Fashion', 120),    // Trent (high-growth premium)
  JUBLFOOD:    peProfile('QSR / Food', 65),           // Jubilant FoodWorks (Dominos)
  DEVYANI:     peProfile('QSR / Food', 75),           // Devyani Intl (KFC/Pizza Hut)
};

// ─── Industry → Profile map (Yahoo Finance "summaryProfile.industry" values) ──
// Yahoo Finance industry is MORE granular than sector — check it first.
// e.g. M&M sector="Consumer Cyclical" but industry="Auto Manufacturers" → correct!
const INDUSTRY_PROFILES: Record<string, SectorProfile> = {
  // ── Auto ──
  'Auto Manufacturers':             peProfile('Auto', 22),
  'Auto Parts':                     peProfile('Auto Ancillaries', 25),
  'Recreational Vehicles':          peProfile('Auto', 20),
  'Farm & Heavy Construction Machinery': peProfile('Industrials', 20),
  'Trucks, Construction & Farm Machinery': peProfile('Industrials', 20),

  // ── Exchanges & Capital Markets ──
  'Financial Data & Stock Exchanges': EXCHANGE_PROFILE,
  'Capital Markets':                  EXCHANGE_PROFILE,
  'Securities & Data Services':       DEPOSITORY_PROFILE,

  // ── Asset Management ──
  'Asset Management':               AMC_PROFILE,
  'Investment Management':          AMC_PROFILE,

  // ── Insurance ──
  'Insurance—Life':                 INSURANCE_PROFILE,
  'Insurance—Diversified':          INSURANCE_PROFILE,
  'Insurance—Property & Casualty':  INSURANCE_PROFILE,
  'Insurance':                      INSURANCE_PROFILE,

  // ── Banking ──
  'Banks—Diversified':              pbProfile('Banking', 2.2, 8),
  'Banks—Regional':                 pbProfile('Banking', 1.8, 6),

  // ── IT / Software ──
  'Software—Application':           peProfile('IT / Software', 28),
  'Software—Infrastructure':        peProfile('IT / Software', 28),
  'Information Technology Services':peProfile('IT / Software', 28),
  'IT Services':                    peProfile('IT / Software', 28),

  // ── Pharma / Healthcare ──
  'Drug Manufacturers—General':     peProfile('Pharma', 30),
  'Drug Manufacturers—Specialty & Generic': peProfile('Pharma', 28),
  'Biotechnology':                  peProfile('Pharma / Biotech', 35),
  'Medical Devices':                peProfile('Healthcare', 35),
  'Medical Care Facilities':        peProfile('Healthcare', 40),
  'Diagnostics & Research':         peProfile('Healthcare', 45),

  // ── Consumer / Retail ──
  'Specialty Retail':               peProfile('Retail', 35),
  'Department Stores':              peProfile('Retail', 25),
  'Grocery Stores':                 peProfile('Retail', 30),
  'Restaurants':                    peProfile('QSR / Food', 60),
  'Consumer Electronics':           peProfile('Consumer Electronics', 30),
  'Household & Personal Products':  peProfile('FMCG', 50),
  'Food Distribution':              peProfile('FMCG', 35),

  // ── Industrials ──
  'Electrical Equipment & Parts':   peProfile('Electrical Equip', 30),
  'Industrial Distribution':        peProfile('Industrials', 25),
  'Specialty Industrial Machinery': peProfile('Industrials', 28),
  'Aerospace & Defense':            peProfile('Defence', 35),
  'Engineering & Construction':     evEbitdaProfile('Infrastructure', 12, 4, 25),

  // ── Materials / Metals ──
  'Steel':                          evEbitdaProfile('Steel', 6, 2, 12),
  'Aluminum':                       evEbitdaProfile('Metals', 5, 2, 10),
  'Copper':                         evEbitdaProfile('Metals', 5, 2, 10),
  'Other Industrial Metals & Mining': evEbitdaProfile('Metals', 6, 2, 12),
  'Gold':                           evEbitdaProfile('Mining', 8, 3, 15),
  'Specialty Chemicals':            peProfile('Specialty Chemicals', 32),
  'Basic Materials':                evEbitdaProfile('Materials', 6, 2, 12),

  // ── Energy ──
  'Oil & Gas E&P':                  evEbitdaProfile('Oil & Gas', 5, 2, 10),
  'Oil & Gas Integrated':           evEbitdaProfile('Oil & Gas', 5, 2, 10),
  'Oil & Gas Refining & Marketing': evEbitdaProfile('Oil & Gas / Refining', 6, 2, 12),

  // ── Telecom / Media ──
  'Telecom Services':               peProfile('Telecom', 30),
  'Broadcasting':                   peProfile('Media', 22),
  'Entertainment':                  peProfile('Media', 25),

  // ── Real Estate ──
  'Real Estate—Diversified':        peProfile('Real Estate', 25),
  'Real Estate—Development':        peProfile('Real Estate', 20),
  'REIT—Diversified':               peProfile('REIT', 20),

  // ── Utilities ──
  'Utilities—Regulated Electric':   evEbitdaProfile('Power / Utilities', 9, 4, 18),
  'Utilities—Renewable':            evEbitdaProfile('Power / Utilities', 12, 5, 22),
};

export function getCompanyProfile(company: {
  name: string;
  symbol: string;
  sector: string;
  industry?: string;
}): SectorProfile {
  const name = company.name.toLowerCase();
  const sym  = company.symbol.toUpperCase().replace('.NS', '').replace('.BO', '');

  // 1. Symbol-level hard overrides (known mis-classifications)
  if (SYMBOL_OVERRIDES[sym]) return SYMBOL_OVERRIDES[sym];

  // 2. Industry-level lookup — most precise signal available
  //    Yahoo Finance "summaryProfile.industry" is far more granular than "sector"
  //    e.g. M&M: sector="Consumer Cyclical" but industry="Auto Manufacturers" → correct model
  if (company.industry && INDUSTRY_PROFILES[company.industry]) {
    return INDUSTRY_PROFILES[company.industry];
  }

  // 2. Name-based detection — catches companies Screener.in dumps into "Financial Services"
  //    that are NOT banks or lending NBFCs

  // Exchanges: MCX, BSE, NSE — platform fee businesses, NOT lending
  if (name.includes('exchange') || name.includes('commodity exchang')) {
    return EXCHANGE_PROFILE;
  }

  // Depositories and registrars: CDSL, NSDL, CAMS, KFin
  if (
    name.includes('depositor') ||
    name.includes('registrar') ||
    name.includes('transfer agent') ||
    name.includes('kfin')
  ) {
    return DEPOSITORY_PROFILE;
  }

  // Asset Management Companies
  if (
    name.includes('asset management') ||
    name.includes('asset mgmt') ||
    name.includes('mutual fund') ||
    (name.includes(' amc') && !name.includes('bank'))
  ) {
    return AMC_PROFILE;
  }

  // Insurance companies (life, general, reinsurance)
  if (
    name.includes('insurance') ||
    name.includes('reinsurance') ||
    name.includes('life insurance') ||
    name.includes('general insurance')
  ) {
    return INSURANCE_PROFILE;
  }

  // Broking, wealth management, financial advisory
  if (
    (name.includes('broking') || name.includes('brokerage') || name.includes('wealth')) &&
    !name.includes('bank') && !name.includes('finance')
  ) {
    return BROKER_PROFILE;
  }

  // 3. Sector-based fallback (original logic)
  return getSectorProfile(company.sector);
}

// ─── India sector long-run CAGR table ────────────────────────────────────────
// Source: NASSCOM (IT), CRISIL (FMCG/Pharma/Cement/Metals), IBEF (sector reports),
//         RBI credit growth data (Banking), PLI scheme projections (Electronics).
//
// This is the "speed limit" — the rate at which the entire industry grows.
// No individual company can sustainably grow faster than its industry forever.
// These are 5–10yr structural growth rates, not cyclical spikes.
//
// Simple analogy: if all restaurants in India grow at 10%/yr on average,
// a single restaurant chain growing at 30% will eventually slow to 10% as it matures.
export const INDIA_SECTOR_CAGR: Record<string, number> = {
  // ── Technology ──
  'Information Technology':  11,   // NASSCOM: IT-BPM industry ~$350B by 2026, ~11% CAGR
  'Technology':              11,
  'Electronics':             25,   // PLI scheme + China+1: EMS/electronics fastest growing

  // ── Consumer ──
  'FMCG':                    9,    // CRISIL: volume + premiumisation, urban+rural
  'Consumer':                10,
  'Consumer Discretionary':  13,   // rising aspirational spending, premiumisation

  // ── Healthcare ──
  'Pharmaceuticals':         13,   // CRISIL: domestic formulations + exports + biosimilars
  'Healthcare':              15,   // hospitals + diagnostics expanding rapidly

  // ── Industrials / Infra ──
  'Cement':                   9,   // tied to GDP + infra spend (NIP ₹111L Cr)
  'Infrastructure':           14,  // NMP + roads + ports + smart cities
  'Automobiles':              10,  // EV transition + rural demand

  // ── Cyclicals ──
  'Metals':                   6,   // China-linked; structural India infra demand but cyclical
  'Metals & Mining':          6,
  'Mining':                   5,
  'Energy':                   8,   // O&G + green energy mix
  'Utilities':                7,   // power demand growing ~6-8%/yr (CEA projections)

  // ── Financial ──
  'Banking':                 13,   // RBI credit growth target; retail + SME driving growth
  'Financial Services':      16,   // financialisation of savings; MF + insurance penetration
  'NBFC':                    16,
  'Insurance':               18,   // massive underpenetration; IRDAI projections

  // ── Other ──
  'Telecom':                  8,   // ARPU growth + 5G; subscriber base mature
  'Telecom / Media':          8,
  'Conglomerate':            10,   // weighted average across verticals
  'Conglomerate / Energy':    9,   // RELIANCE — O&G + Jio + Retail
  'Conglomerate / Infra':    12,   // ADANI — ports + energy + data centres
  'Conglomerate / FMCG':     10,   // ITC — FMCG + hotels + agri
  'Oil & Gas':                7,   // Integrated O&G; refining margins cycle
  'Oil & Gas / Refining':     7,
  'Gas Utilities':            9,   // City gas distribution; volume-linked
  'Infrastructure / EPC':    12,   // L&T, NCC — infra ordering cycle
  'IT / Software':           11,   // maps to Information Technology
  'Auto':                    10,
  'Auto / Diversified':      10,
  'Auto / Premium':          12,
  'Auto Ancillaries':         9,
  'Defence':                 18,   // PLI + indigenisation push
  'Pharma':                  13,
  'Specialty Chemicals':     14,
  'Real Estate':             11,
  'REIT':                     7,
  'Power / Utilities':        7,
  'Steel':                    6,
  'Retail':                  13,
  'Premium Consumer':        14,
  'QSR / Food':              16,
  'Capital Goods':           12,
  'Industrials':             10,
  'Electrical Equip':        13,
  'Exchange / Capital Mkt':  15,
  'Depository / Registrar':  12,
  'Asset Management (AMC)':  14,
  'Broking / Wealth Mgmt':   13,
  'Electronics / EMS':       25,
};

export function getIndustryCagr(sector: string): number {
  return INDIA_SECTOR_CAGR[sector] ?? 10; // 10% = nominal GDP growth as fallback
}

// ─── Dynamic scenario deltas ──────────────────────────────────────────────────
// Instead of fixed sector-wide deltas, use the company's own revenue sigma (σ).
//
// Think of it like this:
//   HDFC Bank's revenue almost never swings more than ±5% from expectations.
//   Tata Steel's revenue can swing ±25% in a bad year (commodity cycle).
//
// So Bear/Bull spreads should be WIDER for Tata Steel and TIGHTER for HDFC Bank.
// We use 1.5× the historical revenue sigma as the growth spread, and take
// the MAX of that vs the pre-set sector floor (so we never go narrower than intended).
export interface DynamicDeltas {
  bearGrowthDelta: number;
  bullGrowthDelta: number;
  bearMarginDelta: number;
  bullMarginDelta: number;
  bearMultipleDelta: number;
  bullMultipleDelta: number;
  isCompanySpecific: boolean; // true = derived from actual history, false = sector defaults used
}

export function getDynamicDeltas(profile: SectorProfile, sigma: number): DynamicDeltas {
  // sigma = standard deviation of the company's historical revenue growth (%)
  // Minimum sigma floor = 5 so very stable companies still get some spread
  const effectiveSigma = Math.max(sigma, 5);

  // 1.5σ is approximately a ±85% confidence interval on the growth estimate
  const growthSpread = Math.round(effectiveSigma * 1.5);

  // Take whichever is wider: company-specific spread OR sector-template floor
  const bearGrowth = -Math.max(growthSpread, Math.abs(profile.bearGrowthDelta));
  const bullGrowth =  Math.max(growthSpread, Math.abs(profile.bullGrowthDelta));

  return {
    bearGrowthDelta:   bearGrowth,
    bullGrowthDelta:   bullGrowth,
    bearMarginDelta:   profile.bearMarginDelta,   // margins use sector template (we don't have per-company margin sigma yet)
    bullMarginDelta:   profile.bullMarginDelta,
    bearMultipleDelta: profile.bearMultipleDelta,
    bullMultipleDelta: profile.bullMultipleDelta,
    isCompanySpecific: sigma >= 3,                // if sigma < 3 we used the floor anyway
  };
}
