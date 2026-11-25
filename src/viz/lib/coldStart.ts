export type ColdStartEntity = 'new-user' | 'new-item';
export type ColdStartStrategyFocus = 'collab' | 'content' | 'hybrid';
export type MetadataRichness = 'none' | 'basic' | 'rich';

export const COLD_START_PLAYBACK_K = [0, 2, 5, 10, 20, 35] as const;

export interface CatalogCandidate {
  id: string;
  label: string;
  tag: string;
  popularityScore: number;
  contentScore: number;
  collabScore: number;
}

export const CATALOG_CANDIDATES: readonly CatalogCandidate[] = [
  { id: 'blockbuster', label: 'Blockbuster Hit', tag: 'popular', popularityScore: 0.92, contentScore: 0.45, collabScore: 0.35 },
  { id: 'niche-gem', label: 'Niche Favorite', tag: 'hidden gem', popularityScore: 0.25, contentScore: 0.48, collabScore: 0.95 },
  { id: 'topic-match', label: 'Topic Match', tag: 'matches signup tag', popularityScore: 0.56, contentScore: 0.88, collabScore: 0.72 },
  { id: 'deep-cut', label: 'Deep Taste Pick', tag: 'similar users', popularityScore: 0.32, contentScore: 0.52, collabScore: 0.89 },
  { id: 'trending', label: 'Trending Now', tag: 'popular', popularityScore: 0.84, contentScore: 0.5, collabScore: 0.41 },
];

export interface ColdStartInput {
  entity: ColdStartEntity;
  interactions: number;
  richness: MetadataRichness;
  exploreRate: number;
  focus: ColdStartStrategyFocus;
}

export interface ColdStartPoint {
  k: number;
  popularity: number;
  content: number;
  collab: number;
  hybrid: number;
  collabWeight: number;
}

export interface RankedRecommendation {
  id: string;
  label: string;
  tag: string;
  score: number;
  sourceNote: string;
}

export interface ColdStartAnalysis {
  entity: ColdStartEntity;
  interactions: number;
  richness: MetadataRichness;
  exploreRate: number;
  focus: ColdStartStrategyFocus;
  effectiveK: number;
  priorCountK0: number;
  collabWeight: number;
  contentWeight: number;
  current: ColdStartPoint;
  crossoverK: number | null;
  curve: ColdStartPoint[];
  rankedItems: RankedRecommendation[];
  stepExplain: string;
}

const RICHNESS_FACTOR: Record<MetadataRichness, number> = {
  none: 0,
  basic: 0.65,
  rich: 1.0,
};

const PRIOR_COUNT_K0 = 8;
const Q_RANDOM = 0.12;
const Q_POPULARITY = 0.42;
const CONTENT_LIFT_MAX = 0.28;
const COLLAB_SPAN = 0.78;

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

export function evaluateAtK(
  k: number,
  richness: MetadataRichness,
  exploreRate: number,
): ColdStartPoint {
  const effectiveK = k * (1 + 2 * exploreRate);
  const collabWeight = effectiveK / (effectiveK + PRIOR_COUNT_K0);
  const factor = RICHNESS_FACTOR[richness];
  const popularity = Q_POPULARITY;
  const content = Q_POPULARITY + factor * CONTENT_LIFT_MAX;
  const collab = Q_RANDOM + COLLAB_SPAN * collabWeight;
  // Blend weights fallback and collaborative signal, adding complementary lift when both contribute.
  const baseBlend = (1 - collabWeight) * content + collabWeight * Math.max(content, collab);
  const synergy = 0.14 * factor * collabWeight * (1 - collabWeight) + 0.04 * factor * collabWeight;
  const hybrid = Math.min(0.95, baseBlend + synergy);
  return { k, popularity, content, collab, hybrid, collabWeight };
}

export function analyzeColdStart(input: ColdStartInput): ColdStartAnalysis {
  const interactions = Math.round(clamp(input.interactions, 0, 40));
  const exploreRate = clamp(input.exploreRate, 0, 0.25);
  const factor = RICHNESS_FACTOR[input.richness];
  const current = evaluateAtK(interactions, input.richness, exploreRate);
  const effectiveK = interactions * (1 + 2 * exploreRate);
  const contentWeight = 1 - current.collabWeight;

  const curve: ColdStartPoint[] = [];
  for (let k = 0; k <= 40; k += 2) {
    curve.push(evaluateAtK(k, input.richness, exploreRate));
  }

  // Exact analytic crossover k where collab(k) >= content
  const targetWeight = (current.content - Q_RANDOM) / COLLAB_SPAN;
  let crossoverK: number | null = null;
  if (targetWeight > 0 && targetWeight < 1) {
    const neededEffectiveK = (PRIOR_COUNT_K0 * targetWeight) / (1 - targetWeight);
    crossoverK = neededEffectiveK / (1 + 2 * exploreRate);
  }

  const rankedItems: RankedRecommendation[] = CATALOG_CANDIDATES.map((item) => {
    const fallback = factor > 0
      ? (1 - factor) * item.popularityScore + factor * item.contentScore
      : item.popularityScore;
    let score: number;
    let sourceNote: string;
    if (input.focus === 'collab') {
      // At k=0 collaborative has no history signal, so its prediction sits near random baseline.
      score = current.collabWeight > 0 ? (1 - current.collabWeight) * 0.5 + current.collabWeight * item.collabScore : 0.5;
      sourceNote = interactions === 0 ? 'no history (blind guess)' : `${Math.round(current.collabWeight * 100)}% collab fit`;
    } else if (input.focus === 'content') {
      score = fallback;
      sourceNote = factor > 0 ? 'item/profile attributes' : 'popularity fallback';
    } else {
      score = contentWeight * fallback + current.collabWeight * item.collabScore;
      sourceNote = current.collabWeight < 0.25
        ? 'mostly fallback'
        : current.collabWeight < 0.6
          ? 'blended handoff'
          : 'mostly collaborative';
    }
    return {
      id: item.id,
      label: item.label,
      tag: item.tag,
      score,
      sourceNote,
    };
  }).sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));

  const subject = input.entity === 'new-user' ? 'user' : 'item';
  let stepExplain: string;
  if (interactions === 0) {
    stepExplain = `At k = 0 interactions, this new ${subject} has zero behavior logs: pure collaborative sits at ${(current.collab * 100).toFixed(0)}%, while ${input.richness === 'none' ? 'popularity fallback' : 'content metadata'} already scores ${(current.content * 100).toFixed(0)}%.`;
  } else if (current.collab < current.content) {
    stepExplain = `At k = ${interactions} (effective ${effectiveK.toFixed(1)} with ${Math.round(exploreRate * 100)}% explore), collaborative weight is ${(current.collabWeight * 100).toFixed(0)}%: fallback still carries most of the ${subject}'s ranking.`;
  } else {
    stepExplain = `At k = ${interactions} (past the ~${crossoverK?.toFixed(0) ?? 12}-click crossover), collaborative weight reaches ${(current.collabWeight * 100).toFixed(0)}% and beats static content at ${(current.collab * 100).toFixed(0)}% (hybrid ${(current.hybrid * 100).toFixed(0)}%).`;
  }

  return {
    entity: input.entity,
    interactions,
    richness: input.richness,
    exploreRate,
    focus: input.focus,
    effectiveK,
    priorCountK0: PRIOR_COUNT_K0,
    collabWeight: current.collabWeight,
    contentWeight,
    current,
    crossoverK,
    curve,
    rankedItems,
    stepExplain,
  };
}
