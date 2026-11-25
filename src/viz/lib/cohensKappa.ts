import { cohensKappa, type ConfusionCounts } from './humanEval';

export interface KappaPreset {
  id: string;
  label: string;
  counts: ConfusionCounts;
}

export const KAPPA_PRESETS: readonly KappaPreset[] = [
  {
    id: 'skewed-trap',
    label: 'Skewed trap (86% raw, κ ≈ 0.05)',
    counts: { bothGood: 85, r1GoodR2Bad: 7, r1BadR2Good: 7, bothBad: 1 },
  },
  {
    id: 'balanced-strong',
    label: 'Balanced & clear (κ = 0.80)',
    counts: { bothGood: 45, r1GoodR2Bad: 5, r1BadR2Good: 5, bothBad: 45 },
  },
  {
    id: 'moderate',
    label: 'Moderate rubric (κ = 0.51)',
    counts: { bothGood: 45, r1GoodR2Bad: 10, r1BadR2Good: 15, bothBad: 30 },
  },
  {
    id: 'worse-than-chance',
    label: 'Opposite graders (κ = −0.60)',
    counts: { bothGood: 10, r1GoodR2Bad: 40, r1BadR2Good: 40, bothBad: 10 },
  },
];

export type KappaBand = 'poor' | 'slight' | 'fair' | 'moderate' | 'substantial' | 'near-perfect';

export interface KappaStepRecord {
  id: 'observed' | 'marginals' | 'chance' | 'kappa';
  title: string;
  explain: string;
}

export interface CohensKappaAnalysis {
  counts: ConfusionCounts;
  total: number;
  agreeCount: number;
  disagreeCount: number;
  r1GoodCount: number;
  r1BadCount: number;
  r2GoodCount: number;
  r2BadCount: number;
  r1GoodRate: number;
  r2GoodRate: number;
  expectedBothGood: number;
  expectedBothBad: number;
  observedAgreement: number;
  expectedAgreement: number;
  liftAboveChance: number;
  maxLiftPossible: number;
  kappa: number;
  band: KappaBand;
  trace: KappaStepRecord[];
}

function clampCount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(200, Math.round(value)));
}

export function classifyKappaBand(kappa: number): KappaBand {
  if (kappa < 0) return 'poor';
  if (kappa < 0.2) return 'slight';
  if (kappa < 0.4) return 'fair';
  if (kappa < 0.6) return 'moderate';
  if (kappa < 0.8) return 'substantial';
  return 'near-perfect';
}

export function analyzeCohensKappa(rawCounts: ConfusionCounts): CohensKappaAnalysis {
  const counts: ConfusionCounts = {
    bothGood: clampCount(rawCounts.bothGood),
    r1GoodR2Bad: clampCount(rawCounts.r1GoodR2Bad),
    r1BadR2Good: clampCount(rawCounts.r1BadR2Good),
    bothBad: clampCount(rawCounts.bothBad),
  };

  const total = counts.bothGood + counts.r1GoodR2Bad + counts.r1BadR2Good + counts.bothBad;
  const agreeCount = counts.bothGood + counts.bothBad;
  const disagreeCount = counts.r1GoodR2Bad + counts.r1BadR2Good;

  const r1GoodCount = counts.bothGood + counts.r1GoodR2Bad;
  const r1BadCount = counts.r1BadR2Good + counts.bothBad;
  const r2GoodCount = counts.bothGood + counts.r1BadR2Good;
  const r2BadCount = counts.r1GoodR2Bad + counts.bothBad;

  if (total === 0) {
    return {
      counts,
      total: 0,
      agreeCount: 0,
      disagreeCount: 0,
      r1GoodCount: 0,
      r1BadCount: 0,
      r2GoodCount: 0,
      r2BadCount: 0,
      r1GoodRate: 0,
      r2GoodRate: 0,
      expectedBothGood: 0,
      expectedBothBad: 0,
      observedAgreement: 0,
      expectedAgreement: 0,
      liftAboveChance: 0,
      maxLiftPossible: 1,
      kappa: 0,
      band: 'slight',
      trace: [
        { id: 'observed', title: '1. No ratings entered', explain: 'Enter at least one rated example above to compute agreement.' },
        { id: 'marginals', title: '2. Rater Good/Bad rates', explain: 'Marginal rates require at least one rated example.' },
        { id: 'chance', title: '3. Chance overlap', explain: 'Chance overlap is 0 when total N = 0.' },
        { id: 'kappa', title: '4. Cohen’s κ', explain: 'Cohen’s κ is 0 when total N = 0.' },
      ],
    };
  }

  const r1GoodRate = r1GoodCount / total;
  const r2GoodRate = r2GoodCount / total;
  const r1BadRate = 1 - r1GoodRate;
  const r2BadRate = 1 - r2GoodRate;

  const expectedBothGood = total * r1GoodRate * r2GoodRate;
  const expectedBothBad = total * r1BadRate * r2BadRate;

  const { kappa, observedAgreement, expectedAgreement } = cohensKappa(counts);
  const liftAboveChance = observedAgreement - expectedAgreement;
  const maxLiftPossible = 1 - expectedAgreement;
  const band = classifyKappaBand(kappa);

  const trace: KappaStepRecord[] = [
    {
      id: 'observed',
      title: '1. Count how often both raters agreed',
      explain: `They agreed on ${agreeCount} of ${total} items (${counts.bothGood} both Good + ${counts.bothBad} both Bad), giving raw agreement p₀ = ${(observedAgreement * 100).toFixed(1)}%.`,
    },
    {
      id: 'marginals',
      title: '2. Check each rater’s own Good / Bad rate',
      explain: `Rater 1 marks Good ${(r1GoodRate * 100).toFixed(1)}% of the time (${r1GoodCount}/${total}); Rater 2 marks Good ${(r2GoodRate * 100).toFixed(1)}% of the time (${r2GoodCount}/${total}).`,
    },
    {
      id: 'chance',
      title: '3. Find the agreement you get by pure luck',
      explain: `If both raters guessed independently at those same rates, they would still match on ${(expectedBothGood + expectedBothBad).toFixed(1)} items: pₑ = ${(expectedAgreement * 100).toFixed(1)}%.`,
    },
    {
      id: 'kappa',
      title: '4. Subtract luck to reveal Cohen’s κ',
      explain: `Observed ${(observedAgreement * 100).toFixed(1)}% beats chance ${(expectedAgreement * 100).toFixed(1)}% by ${(liftAboveChance * 100).toFixed(1)} pp out of ${(maxLiftPossible * 100).toFixed(1)} pp possible → κ = ${kappa.toFixed(3)} (${band}).`,
    },
  ];

  return {
    counts,
    total,
    agreeCount,
    disagreeCount,
    r1GoodCount,
    r1BadCount,
    r2GoodCount,
    r2BadCount,
    r1GoodRate,
    r2GoodRate,
    expectedBothGood,
    expectedBothBad,
    observedAgreement,
    expectedAgreement,
    liftAboveChance,
    maxLiftPossible,
    kappa,
    band,
    trace,
  };
}
