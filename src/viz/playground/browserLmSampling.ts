export interface SamplingOptions {
  temperature: number;
  topK: number;
  topP: number;
  greedy: boolean;
}

export interface SamplingCandidate {
  id: number;
  rank: number;
  probability: number;
  finalProbability: number;
  cutByTopK: boolean;
  cutByTopP: boolean;
  cutByGreedy: boolean;
}

export interface SamplingResult {
  selectedId: number;
  candidates: SamplingCandidate[];
}

function argMax(values: readonly number[]): number {
  if (values.length === 0) throw new Error('Cannot sample from an empty logits array.');
  let bestIndex = 0;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] > values[bestIndex]) bestIndex = index;
  }
  return bestIndex;
}

/** Stable temperature-scaled softmax. Temperature 0 is the greedy limit. */
export function softmaxWithTemperature(logits: readonly number[], temperature: number): number[] {
  if (logits.length === 0) return [];
  if (!Number.isFinite(temperature) || temperature < 0) {
    throw new Error('Temperature must be a finite number greater than or equal to 0.');
  }
  if (temperature === 0) {
    const winner = argMax(logits);
    return logits.map((_, index) => (index === winner ? 1 : 0));
  }

  const scaled = logits.map((value) => value / temperature);
  let max = -Infinity;
  for (const value of scaled) max = Math.max(max, value);
  const exponentials = scaled.map((value) => Math.exp(value - max));
  const total = exponentials.reduce((sum, value) => sum + value, 0);
  return exponentials.map((value) => value / total);
}

/** Keep the k most probable tokens. A k of 0 disables this filter. */
export function topKMask(probabilities: readonly number[], topK: number): boolean[] {
  if (!Number.isFinite(topK) || topK < 0) throw new Error('Top-k must be at least 0.');
  const keep = new Array(probabilities.length).fill(false);
  const count = topK === 0 ? probabilities.length : Math.min(probabilities.length, Math.floor(topK));
  probabilities
    .map((probability, id) => ({ id, probability }))
    .sort((a, b) => b.probability - a.probability || a.id - b.id)
    .slice(0, count)
    .forEach(({ id }) => { keep[id] = true; });
  return keep;
}

/**
 * Keep the smallest eligible probability prefix whose normalized mass reaches p.
 * This runs after top-k, matching the lab's visible filter order.
 */
export function topPMask(
  probabilities: readonly number[],
  topP: number,
  eligible: readonly boolean[] = probabilities.map(() => true),
): boolean[] {
  if (!Number.isFinite(topP) || topP <= 0 || topP > 1) {
    throw new Error('Top-p must be greater than 0 and at most 1.');
  }
  if (eligible.length !== probabilities.length) {
    throw new Error('Top-p eligibility mask must match the probability array length.');
  }

  const ranked = probabilities
    .map((probability, id) => ({ id, probability }))
    .filter(({ id }) => eligible[id])
    .sort((a, b) => b.probability - a.probability || a.id - b.id);
  const keep = new Array(probabilities.length).fill(false);
  if (ranked.length === 0) return keep;

  const eligibleMass = ranked.reduce((sum, item) => sum + item.probability, 0);
  let cumulative = 0;
  for (const item of ranked) {
    keep[item.id] = true;
    cumulative += eligibleMass > 0 ? item.probability / eligibleMass : 1 / ranked.length;
    if (cumulative >= topP) break;
  }
  return keep;
}

/** Small deterministic PRNG so a seed reproduces the same sampling path. */
export function createSeededRandom(seed: number): () => number {
  let state = Math.trunc(seed) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function sampleFromLogits(
  logits: readonly number[],
  options: SamplingOptions,
  random: () => number = Math.random,
): SamplingResult {
  if (logits.length === 0) throw new Error('Cannot sample from an empty logits array.');
  const effectiveGreedy = options.greedy || options.temperature === 0;
  const probabilities = softmaxWithTemperature(logits, effectiveGreedy ? 0 : options.temperature);
  const rankedIds = probabilities
    .map((probability, id) => ({ id, probability }))
    .sort((a, b) => b.probability - a.probability || a.id - b.id)
    .map(({ id }) => id);

  const topK = effectiveGreedy ? probabilities.map(() => true) : topKMask(probabilities, options.topK);
  const topP = effectiveGreedy ? probabilities.map(() => true) : topPMask(probabilities, options.topP, topK);
  const retained = probabilities.map((_, id) => effectiveGreedy ? id === rankedIds[0] : topK[id] && topP[id]);
  const retainedMass = probabilities.reduce((sum, probability, id) => sum + (retained[id] ? probability : 0), 0);
  const finalProbabilities = probabilities.map((probability, id) => (
    retained[id] && retainedMass > 0 ? probability / retainedMass : 0
  ));

  let selectedId = rankedIds[0];
  if (!effectiveGreedy) {
    const draw = Math.min(Math.max(random(), 0), 1 - Number.EPSILON);
    let cumulative = 0;
    for (const id of rankedIds) {
      cumulative += finalProbabilities[id];
      if (draw < cumulative) {
        selectedId = id;
        break;
      }
    }
  }

  return {
    selectedId,
    candidates: rankedIds.map((id, rank) => ({
      id,
      rank: rank + 1,
      probability: probabilities[id],
      finalProbability: finalProbabilities[id],
      cutByTopK: !effectiveGreedy && !topK[id],
      cutByTopP: !effectiveGreedy && topK[id] && !topP[id],
      cutByGreedy: effectiveGreedy && id !== selectedId,
    })),
  };
}
