// Real temperature / top-k / top-p sampling math over a small fixed set of
// candidate next-tokens, for the LLM Inference Flow Visualizer's sampling
// playground. The logits themselves are illustrative (a plausible-looking
// completion of "the cat sat on the ___"), but softmax, temperature scaling,
// top-k truncation, and top-p (nucleus) truncation below are the real formulas.

export interface Candidate {
  token: string;
  baseLogit: number;
}

export interface DistributionEntry extends Candidate {
  prob: number;
  keptByTopK: boolean;
  keptByTopP: boolean;
  finalProb: number;
}

export const CANDIDATES: Candidate[] = [
  { token: 'mat', baseLogit: 4.8 },
  { token: 'chair', baseLogit: 3.9 },
  { token: 'table', baseLogit: 3.1 },
  { token: 'floor', baseLogit: 2.0 },
  { token: 'roof', baseLogit: 1.2 },
  { token: 'moon', baseLogit: -0.5 },
];

export type InferenceStageId = 'prompt' | 'tokens' | 'embedding' | 'transformer' | 'logits' | 'softmax' | 'truncate' | 'sample' | 'append';

export interface InferenceStage {
  id: InferenceStageId;
  label: string;
  plainMeaning: string;
}

function softmax(xs: number[]): number[] {
  const max = Math.max(...xs);
  const exps = xs.map((x) => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/**
 * Computes the final sampling distribution for the fixed candidate set.
 * Returns each candidate with its post-temperature probability, whether
 * top-k kept it, whether top-p kept it, and its final (renormalized) prob.
 */
export function computeDistributionFor(
  candidates: Candidate[],
  temperature: number,
  topK: number,
  topP: number,
): DistributionEntry[] {
  const logits = candidates.map((c) => c.baseLogit);
  const scaled = logits.map((l) => l / Math.max(temperature, 0.05));
  const probs = softmax(scaled);

  const withProb = candidates.map((c, i) => ({ ...c, prob: probs[i] }));
  const ranked = [...withProb].sort((a, b) => b.prob - a.prob);

  const topKRows = ranked.slice(0, Math.max(1, Math.round(topK)));
  const topKSet = new Set(topKRows.map((r) => r.token));
  const topKMass = topKRows.reduce((sum, row) => sum + row.prob, 0) || 1;

  let cumulative = 0;
  const topPSet = new Set<string>();
  for (const r of topKRows) {
    if (cumulative >= topP) break;
    topPSet.add(r.token);
    cumulative += r.prob / topKMass;
  }

  const kept = withProb.map((c) => ({
    ...c,
    keptByTopK: topKSet.has(c.token),
    keptByTopP: topPSet.has(c.token),
  }));

  const survivors = kept.filter((c) => c.keptByTopK && c.keptByTopP);
  const survivorSum = survivors.reduce((s, c) => s + c.prob, 0) || 1;

  return kept.map((c) => ({
    ...c,
    finalProb: c.keptByTopK && c.keptByTopP ? c.prob / survivorSum : 0,
  }));
}

export function computeDistribution(temperature: number, topK: number, topP: number): DistributionEntry[] {
  return computeDistributionFor(CANDIDATES, temperature, topK, topP);
}

export function sampleFromDistribution(distribution: DistributionEntry[], draw: number): DistributionEntry {
  const survivors = distribution.filter((entry) => entry.finalProb > 0);
  if (survivors.length === 0) return distribution[0];
  const target = Math.max(0, Math.min(0.999999999, Number.isFinite(draw) ? draw : 0));
  let cumulative = 0;
  for (const entry of survivors) {
    cumulative += entry.finalProb;
    if (target < cumulative) return entry;
  }
  return survivors.at(-1)!;
}

export function distributionEntropy(distribution: DistributionEntry[]): number {
  return distribution.reduce(
    (sum, entry) => entry.finalProb > 0 ? sum - entry.finalProb * Math.log2(entry.finalProb) : sum,
    0,
  );
}

export function buildInferenceStages(prompt: string, layers: number, selectedToken: string): InferenceStage[] {
  const tokenCount = Math.max(1, prompt.trim().split(/\s+/).filter(Boolean).length);
  const layerCount = Math.max(1, Math.round(Number.isFinite(layers) ? layers : 1));
  return [
    { id: 'prompt', label: 'Prompt text', plainMeaning: `The model starts with the words “${prompt.trim() || 'empty prompt'}”.` },
    { id: 'tokens', label: 'Token IDs', plainMeaning: `The tokenizer turns the prompt into ${tokenCount} toy word token${tokenCount === 1 ? '' : 's'}.` },
    { id: 'embedding', label: 'Token + position vectors', plainMeaning: 'Each token ID becomes a vector, and position information tells the model the word order.' },
    { id: 'transformer', label: `Decoder block × ${layerCount}`, plainMeaning: `Masked attention and an MLP update every token vector through ${layerCount} layer${layerCount === 1 ? '' : 's'}.` },
    { id: 'logits', label: 'Vocabulary scores (logits)', plainMeaning: 'The language-model head produces one raw score, called a logit, for every possible next token.' },
    { id: 'softmax', label: 'Temperature + softmax', plainMeaning: 'Temperature rescales the logits; softmax turns them into probabilities that sum to 1.' },
    { id: 'truncate', label: 'Top-k then top-p', plainMeaning: 'Top-k keeps a fixed count, then top-p keeps the smallest high-probability set that reaches the chosen mass.' },
    { id: 'sample', label: 'Draw one token', plainMeaning: `The random draw lands on “${selectedToken}” inside the final cumulative distribution.` },
    { id: 'append', label: 'Append and repeat', plainMeaning: `“${selectedToken}” is added to the prompt, and the same decoder flow runs again for the next token.` },
  ];
}
