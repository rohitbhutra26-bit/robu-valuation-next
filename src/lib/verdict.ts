// Single source of truth for the cheap / fair / expensive classification.
// Every card (VerdictCard, ValuationEngine method + composite, SensitivityMatrix)
// MUST classify off these cutoffs so the same stock never reads "cheap" on one
// card and "fairly valued" on another. Cutoffs are upside % to fair value.

export const VERDICT_CUTOFFS = {
  veryCheap: 30,
  cheap: 12,
  expensive: -12,
  veryExpensive: -30,
} as const;

export type VerdictKey =
  | 'very-cheap' | 'cheap' | 'fair' | 'expensive' | 'very-expensive';
export type VerdictTone = 'gain' | 'warning' | 'loss';

export function verdictKey(upside: number): VerdictKey {
  if (upside >= VERDICT_CUTOFFS.veryCheap) return 'very-cheap';
  if (upside >= VERDICT_CUTOFFS.cheap) return 'cheap';
  if (upside > VERDICT_CUTOFFS.expensive) return 'fair';
  if (upside > VERDICT_CUTOFFS.veryExpensive) return 'expensive';
  return 'very-expensive';
}

export function verdictTone(upside: number): VerdictTone {
  const k = verdictKey(upside);
  if (k === 'very-cheap' || k === 'cheap') return 'gain';
  if (k === 'fair') return 'warning';
  return 'loss';
}
