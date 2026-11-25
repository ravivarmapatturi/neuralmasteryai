export interface NgramRow {
  order: number;
  candidateNgrams: string[];
  candidateMatches: boolean[];
  referenceNgrams: string[];
  clippedMatches: number;
  totalCandidateNgrams: number;
  precision: number;
}

export interface BleuCalculation {
  referenceTokens: string[];
  candidateTokens: string[];
  requestedOrder: number;
  effectiveOrder: number;
  rows: NgramRow[];
  brevityPenalty: number;
  geometricMean: number;
  score: number;
}

export interface BleuInput {
  reference: string;
  candidate: string;
  maxOrder: number;
  lowercase: boolean;
}

/** BLEU is defined over tokens. This small, deterministic tokenizer keeps words
 * and contractions, discards punctuation, and optionally folds case. */
export function tokenizeBleu(text: string, lowercase = true): string[] {
  const source = lowercase ? text.toLocaleLowerCase() : text;
  return source.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? [];
}

export function buildNgrams(tokens: readonly string[], order: number): string[] {
  const n = Math.max(1, Math.round(order));
  const grams: string[] = [];
  for (let i = 0; i + n <= tokens.length; i += 1) {
    grams.push(tokens.slice(i, i + n).join(' '));
  }
  return grams;
}

export function clippedNgramPrecision(
  candidateTokens: readonly string[],
  referenceTokens: readonly string[],
  order: number,
): NgramRow {
  const candidateNgrams = buildNgrams(candidateTokens, order);
  const referenceNgrams = buildNgrams(referenceTokens, order);
  const remaining = new Map<string, number>();
  for (const gram of referenceNgrams) {
    remaining.set(gram, (remaining.get(gram) ?? 0) + 1);
  }

  let clippedMatches = 0;
  const candidateMatches: boolean[] = [];
  for (const gram of candidateNgrams) {
    const available = remaining.get(gram) ?? 0;
    if (available > 0) {
      clippedMatches += 1;
      remaining.set(gram, available - 1);
      candidateMatches.push(true);
    } else {
      candidateMatches.push(false);
    }
  }

  return {
    order,
    candidateNgrams,
    candidateMatches,
    referenceNgrams,
    clippedMatches,
    totalCandidateNgrams: candidateNgrams.length,
    precision: candidateNgrams.length === 0 ? 0 : clippedMatches / candidateNgrams.length,
  };
}

export function calculateBleu(input: BleuInput): BleuCalculation {
  const referenceTokens = tokenizeBleu(input.reference, input.lowercase);
  const candidateTokens = tokenizeBleu(input.candidate, input.lowercase);
  const requestedOrder = Math.max(1, Math.min(4, Math.round(input.maxOrder)));
  const effectiveOrder = Math.max(0, Math.min(requestedOrder, candidateTokens.length, referenceTokens.length));
  const rows = Array.from({ length: effectiveOrder }, (_, index) => (
    clippedNgramPrecision(candidateTokens, referenceTokens, index + 1)
  ));

  const brevityPenalty = candidateTokens.length === 0
    ? 0
    : candidateTokens.length >= referenceTokens.length
      ? 1
      : Math.exp(1 - referenceTokens.length / candidateTokens.length);
  const hasZeroPrecision = rows.length === 0 || rows.some((row) => row.precision === 0);
  const geometricMean = hasZeroPrecision
    ? 0
    : Math.exp(rows.reduce((sum, row) => sum + Math.log(row.precision), 0) / rows.length);

  return {
    referenceTokens,
    candidateTokens,
    requestedOrder,
    effectiveOrder,
    rows,
    brevityPenalty,
    geometricMean,
    score: brevityPenalty * geometricMean,
  };
}

export function explainBleuStep(result: BleuCalculation, step: number): string {
  if (step === 0) {
    return `Step 1: The reference has ${result.referenceTokens.length} words and the candidate has ${result.candidateTokens.length}; BLEU compares their word groups, not their meaning.`;
  }
  if (step === 1) {
    const summary = result.rows.map((row) => `${row.order}-gram ${row.clippedMatches}/${row.totalCandidateNgrams}`).join(', ');
    return `Step 2: Count each matching word group only as often as it appears in the reference: ${summary || 'there are no comparable groups'}.`;
  }
  if (step === 2) {
    return `Step 3: The brevity penalty is ${result.brevityPenalty.toFixed(3)} because the candidate has ${result.candidateTokens.length} words and the reference has ${result.referenceTokens.length}.`;
  }
  return `Step 4: Multiply the precision average ${result.geometricMean.toFixed(3)} by the brevity penalty ${result.brevityPenalty.toFixed(3)} to get BLEU ${(result.score * 100).toFixed(1)}.`;
}
