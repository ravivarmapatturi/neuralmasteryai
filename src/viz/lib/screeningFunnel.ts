// Pure-TypeScript scientific screening funnel simulation.
// Reuses generateCandidateScores and funnelCounts from ./aiforscience so
// library candidate counts remain identical across the site, and adds
// true-active hit recall, top-K precision, enrichment factor, and wet-lab cost savings.

import { funnelCounts, generateCandidateScores } from './aiforscience';

export type ScreeningStage = 0 | 1 | 2 | 3;

export const SCREENING_STAGES: readonly { id: ScreeningStage; label: string; shortLabel: string }[] = [
  { id: 0, label: '1. Candidate library', shortLabel: '1. Library' },
  { id: 1, label: '2. ML filter ≥ τ', shortLabel: '2. ML filter' },
  { id: 2, label: '3. Top-K wet lab', shortLabel: '3. Top-K lab' },
  { id: 3, label: '4. Hits & savings', shortLabel: '4. Hits & ROI' },
];

export const MAX_SCREENING_N = 200_000;

export interface ScreeningRunParams {
  librarySize: number;
  threshold: number;
  shortlistBudget: number;
  assayCostUsd: number;
}

export interface HistogramBin {
  min: number;
  max: number;
  totalCount: number;
  hitCount: number;
  passesThreshold: boolean;
}

export interface ScreeningResult {
  librarySize: number;
  threshold: number;
  shortlistBudget: number;
  assayCostUsd: number;
  passedMl: number;
  passedPct: number;
  shortlist: number;
  totalTrueHits: number;
  hitsPassingMl: number;
  recallPct: number;
  hitsInShortlist: number;
  hitRatePct: number;
  baselineHitRatePct: number;
  enrichmentFactor: number;
  naiveCostUsd: number;
  mlFunnelCostUsd: number;
  costSavedUsd: number;
  savingsPct: number;
  histogram: HistogramBin[];
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic true-active labels correlated with ML score (rare ~1.3% overall hit rate). */
export function generateLibraryWithHits(n: number): { scores: number[]; hits: boolean[] } {
  const safeN = Math.max(100, Math.min(MAX_SCREENING_N, Math.round(n)));
  const scores = generateCandidateScores(safeN, 7);
  const randHit = mulberry32(31);
  const hits = scores.map((s) => {
    const p = s >= 0.6 ? 0.35 * ((s - 0.6) / 0.4) ** 2 : 0.0005;
    return randHit() < p;
  });
  return { scores, hits };
}

/** Compute exact screening funnel counts, recall, enrichment, and lab budget savings. */
export function runScreeningFunnel(
  params: ScreeningRunParams,
  precomputed?: { scores: number[]; hits: boolean[] },
): ScreeningResult {
  const librarySize = Math.max(100, Math.min(MAX_SCREENING_N, Math.round(params.librarySize)));
  const threshold = Math.max(0.05, Math.min(0.99, params.threshold));
  const shortlistBudget = Math.max(1, Math.min(200, Math.round(params.shortlistBudget)));
  const assayCostUsd = Math.max(50, Math.min(100_000, Math.round(params.assayCostUsd)));

  const data = precomputed ?? generateLibraryWithHits(librarySize);
  const scores = data.scores.slice(0, librarySize);
  const hits = data.hits.slice(0, librarySize);

  const counts = funnelCounts(scores, threshold, shortlistBudget);

  // Build 10-bin score histogram (0.0..1.0) and collect passed indices for exact top-K ranking
  const binCount = 10;
  const binTotals = new Array<number>(binCount).fill(0);
  const binHits = new Array<number>(binCount).fill(0);
  const passedIndices: number[] = [];
  let totalTrueHits = 0;
  let hitsPassingMl = 0;

  for (let i = 0; i < librarySize; i++) {
    const s = scores[i];
    const isHit = hits[i];
    if (isHit) totalTrueHits++;
    const binIdx = Math.min(binCount - 1, Math.floor(s * binCount));
    binTotals[binIdx]++;
    if (isHit) binHits[binIdx]++;
    if (s >= threshold) {
      passedIndices.push(i);
      if (isHit) hitsPassingMl++;
    }
  }

  // Sort passing candidates descending by ML score and take top K for physical synthesis
  passedIndices.sort((a, b) => scores[b] - scores[a]);
  const shortlistIndices = passedIndices.slice(0, shortlistBudget);
  const hitsInShortlist = shortlistIndices.reduce((acc, idx) => acc + (hits[idx] ? 1 : 0), 0);

  const passedPct = (counts.passedMl / librarySize) * 100;
  const recallPct = totalTrueHits > 0 ? (hitsPassingMl / totalTrueHits) * 100 : 0;
  const hitRatePct = counts.shortlist > 0 ? (hitsInShortlist / counts.shortlist) * 100 : 0;
  const baselineHitRatePct = (totalTrueHits / librarySize) * 100;
  const enrichmentFactor = baselineHitRatePct > 0 ? hitRatePct / baselineHitRatePct : 0;

  const naiveCostUsd = librarySize * assayCostUsd;
  const mlFunnelCostUsd = counts.shortlist * assayCostUsd;
  const costSavedUsd = Math.max(0, naiveCostUsd - mlFunnelCostUsd);
  const savingsPct = naiveCostUsd > 0 ? (costSavedUsd / naiveCostUsd) * 100 : 0;

  const histogram: HistogramBin[] = Array.from({ length: binCount }, (_, b) => ({
    min: b / binCount,
    max: (b + 1) / binCount,
    totalCount: binTotals[b],
    hitCount: binHits[b],
    passesThreshold: (b + 1) / binCount > threshold,
  }));

  return {
    librarySize,
    threshold,
    shortlistBudget,
    assayCostUsd,
    passedMl: counts.passedMl,
    passedPct,
    shortlist: counts.shortlist,
    totalTrueHits,
    hitsPassingMl,
    recallPct,
    hitsInShortlist,
    hitRatePct,
    baselineHitRatePct,
    enrichmentFactor,
    naiveCostUsd,
    mlFunnelCostUsd,
    costSavedUsd,
    savingsPct,
    histogram,
  };
}

export function formatUsdCompact(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(2)}B`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd.toLocaleString('en-US')}`;
}

/** One-line plain-English explanation of what just happened at `stage` and why. */
export function explainScreeningStage(stage: ScreeningStage, res: ScreeningResult): string {
  if (stage === 0) {
    return `Start with ${res.librarySize.toLocaleString('en-US')} candidates containing ${res.totalTrueHits.toLocaleString('en-US')} true hits (${res.baselineHitRatePct.toFixed(2)}%) — testing all physically would cost ${formatUsdCompact(res.naiveCostUsd)}.`;
  }
  if (stage === 1) {
    return `ML filter ≥ ${res.threshold.toFixed(2)} cuts ${res.librarySize.toLocaleString('en-US')} down to ${res.passedMl.toLocaleString('en-US')} (${res.passedPct.toFixed(2)}%), keeping ${res.recallPct.toFixed(1)}% of all true hits.`;
  }
  if (stage === 2) {
    if (res.passedMl < res.shortlistBudget) {
      return `Threshold ${res.threshold.toFixed(2)} is so strict only ${res.shortlist} candidates survived (< ${res.shortlistBudget} wet-lab slots), leaving lab capacity unused.`;
    }
    return `Rank the ${res.passedMl.toLocaleString('en-US')} survivors and synthesize only the top ${res.shortlist} in the wet lab for ${formatUsdCompact(res.mlFunnelCostUsd)}.`;
  }
  return `Physical tests confirm ${res.hitsInShortlist}/${res.shortlist} real hits (${res.hitRatePct.toFixed(1)}% hit rate = ${res.enrichmentFactor.toFixed(1)}× over random), saving ${formatUsdCompact(res.costSavedUsd)}.`;
}

/** General formula and substituted numbers for the active screening stage. */
export function formatScreeningFormula(
  stage: ScreeningStage,
  res: ScreeningResult,
): { general: string; worked: string } {
  if (stage === 0) {
    return {
      general: 'Naive lab cost = N × cost_per_assay',
      worked: `${res.librarySize.toLocaleString('en-US')} × $${res.assayCostUsd.toLocaleString('en-US')} = ${formatUsdCompact(res.naiveCostUsd)}`,
    };
  }
  if (stage === 1) {
    return {
      general: 'Filter recall = hits_passing(score ≥ τ) / total_true_hits',
      worked: `${res.hitsPassingMl.toLocaleString('en-US')} / ${res.totalTrueHits.toLocaleString('en-US')} = ${res.recallPct.toFixed(1)}% recall (${res.passedMl.toLocaleString('en-US')} passed)`,
    };
  }
  if (stage === 2) {
    return {
      general: 'Wet-lab shortlist = min(K, passed_ML)   |   Lab cost = shortlist × cost_per_assay',
      worked: `min(${res.shortlistBudget}, ${res.passedMl.toLocaleString('en-US')}) = ${res.shortlist} tests → ${formatUsdCompact(res.mlFunnelCostUsd)}`,
    };
  }
  return {
    general: 'Enrichment = (hits_in_K / K) / baseline_hit_rate',
    worked: `(${res.hitsInShortlist}/${res.shortlist}) / ${res.baselineHitRatePct.toFixed(2)}% = ${res.hitRatePct.toFixed(1)}% / ${res.baselineHitRatePct.toFixed(2)}% = ${res.enrichmentFactor.toFixed(1)}×`,
  };
}
