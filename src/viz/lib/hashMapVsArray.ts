// Pure-TypeScript Hash Map vs. Linear Array lookup engine.
// Computes transparent weighted character-sum hashes mod m, builds real
// bucket chains, generates step-by-step comparison traces for both data
// structures, and projects Big-O costs at production collection size N.

export const DEFAULT_HASH_KEYS: readonly string[] = [
  'rat',
  'cat',
  'dog',
  'fox',
  'fig',
  'mat',
  'sat',
  'hat',
];

export interface CharHashTerm {
  char: string;
  pos: number;
  code: number;
}

export interface KeyHashResult {
  key: string;
  terms: CharHashTerm[];
  weightedSum: number;
  bucket: number;
}

export interface HashBucket {
  bucketIndex: number;
  keys: string[];
}

export interface LookupStep {
  step: number;
  arrayIndexChecked: number | null;
  arrayComparisons: number;
  arrayFoundIndex: number;
  arrayDone: boolean;
  hashBucket: number;
  hashChainIndexChecked: number | null;
  hashComparisons: number;
  hashFound: boolean;
  hashDone: boolean;
}

export interface LookupTrace {
  keys: string[];
  targetKey: string;
  bucketCount: number;
  hashInfo: KeyHashResult;
  buckets: HashBucket[];
  steps: LookupStep[];
  arrayTotalChecks: number;
  hashTotalChecks: number;
  foundInArray: boolean;
  arrayFoundIndex: number;
  loadFactor: number;
}

export interface ScaleComparison {
  n: number;
  arrayWorstOps: number;
  arrayAvgOps: number;
  hashAvgOps: number;
  speedupWorst: number;
}

/** Parse comma- or whitespace-separated unique keys (capped at maxItems for clear display). */
export function parseKeyList(input: string, maxItems = 10): string[] {
  const tokens = input
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const unique: string[] = [];
  for (const tok of tokens) {
    if (!unique.includes(tok)) unique.push(tok);
    if (unique.length >= maxItems) break;
  }
  return unique.length > 0 ? unique : [...DEFAULT_HASH_KEYS];
}

/** Transparent weighted character-sum hash: sum((i + 1) * charCodeAt(i)) mod bucketCount. */
export function computeKeyHash(key: string, bucketCount: number): KeyHashResult {
  const m = Math.max(1, Math.round(bucketCount));
  const clean = key.trim() || 'key';
  const terms: CharHashTerm[] = [];
  let weightedSum = 0;
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    const pos = i + 1;
    weightedSum += pos * code;
    terms.push({ char: clean[i], pos, code });
  }
  const bucket = weightedSum % m;
  return { key: clean, terms, weightedSum, bucket };
}

/** Build a real chained hash table and linear array, then trace searching `targetKey` step by step. */
export function buildLookupTrace(
  rawKeys: readonly string[],
  rawTargetKey: string,
  bucketCount: number,
): LookupTrace {
  const keys = rawKeys.length > 0 ? [...rawKeys] : [...DEFAULT_HASH_KEYS];
  const targetKey = rawTargetKey.trim() || keys[0];
  const m = Math.max(2, Math.min(16, Math.round(bucketCount)));

  const buckets: HashBucket[] = Array.from({ length: m }, (_, i) => ({
    bucketIndex: i,
    keys: [],
  }));
  for (const k of keys) {
    const h = computeKeyHash(k, m);
    buckets[h.bucket].keys.push(k);
  }

  const hashInfo = computeKeyHash(targetKey, m);
  const targetBucket = buckets[hashInfo.bucket].keys;

  const arrayMatchIdx = keys.indexOf(targetKey);
  const arrayTotalChecks = arrayMatchIdx >= 0 ? arrayMatchIdx + 1 : keys.length;

  const hashMatchIdx = targetBucket.indexOf(targetKey);
  // Step 0 always computes the hash jump (1 bucket check even if bucket is empty -> 1 op)
  const hashTotalChecks =
    targetBucket.length === 0 ? 1 : hashMatchIdx >= 0 ? hashMatchIdx + 1 : targetBucket.length;

  const totalSteps = Math.max(1, arrayTotalChecks, hashTotalChecks);
  const steps: LookupStep[] = [];

  for (let s = 0; s < totalSteps; s++) {
    const arrayActive = s < arrayTotalChecks;
    const arrayIndexChecked = arrayActive ? s : null;
    const arrayComparisons = Math.min(s + 1, arrayTotalChecks);
    const arrayDone = s + 1 >= arrayTotalChecks;
    const arrayFoundIndex = arrayDone && arrayMatchIdx >= 0 ? arrayMatchIdx : -1;

    const hashActive = s < hashTotalChecks;
    const hashChainIndexChecked =
      hashActive && targetBucket.length > 0 ? Math.min(s, targetBucket.length - 1) : null;
    const hashComparisons = Math.min(s + 1, hashTotalChecks);
    const hashDone = s + 1 >= hashTotalChecks;
    const hashFound = hashDone && hashMatchIdx >= 0;

    steps.push({
      step: s,
      arrayIndexChecked,
      arrayComparisons,
      arrayFoundIndex,
      arrayDone,
      hashBucket: hashInfo.bucket,
      hashChainIndexChecked,
      hashComparisons,
      hashFound,
      hashDone,
    });
  }

  return {
    keys,
    targetKey,
    bucketCount: m,
    hashInfo,
    buckets,
    steps,
    arrayTotalChecks,
    hashTotalChecks,
    foundInArray: arrayMatchIdx >= 0,
    arrayFoundIndex: arrayMatchIdx,
    loadFactor: keys.length / m,
  };
}

/** Scale comparison at production size N with current load factor alpha. */
export function computeScaleComparison(n: number, loadFactor: number): ScaleComparison {
  const safeN = Math.max(10, Math.round(Number.isFinite(n) ? n : 100));
  const alpha = Math.max(0.25, loadFactor);
  // Expected probes for a chained hash table with load factor alpha (assuming resized to keep alpha constant)
  const hashAvgOps = Number((1 + alpha / 2).toFixed(2));
  const arrayWorstOps = safeN;
  const arrayAvgOps = (safeN + 1) / 2;
  const speedupWorst = Number((arrayWorstOps / hashAvgOps).toFixed(1));
  return { n: safeN, arrayWorstOps, arrayAvgOps, hashAvgOps, speedupWorst };
}

/** One-line plain-English explanation of what just happened on `stepIdx` and why. */
export function explainLookupStep(trace: LookupTrace, stepIdx: number): string {
  const s = trace.steps[Math.min(stepIdx, trace.steps.length - 1)];
  const bucketKeys = trace.buckets[trace.hashInfo.bucket].keys;

  if (stepIdx === 0) {
    const hashDesc = `hash("${trace.targetKey}") = ${trace.hashInfo.weightedSum} mod ${trace.bucketCount} = bucket ${trace.hashInfo.bucket}`;
    if (bucketKeys.length === 0) {
      return `Step 1: ${hashDesc} is empty, so the hash map proves "${trace.targetKey}" is missing in 1 check while the array starts at slot 0.`;
    }
    if (s.hashFound) {
      return `Step 1: ${hashDesc} jumps straight to "${trace.targetKey}" in 1 check; the array must scan from slot 0 ("${trace.keys[0]}").`;
    }
    return `Step 1: ${hashDesc} jumps to bucket ${trace.hashInfo.bucket} (${bucketKeys.length} collided keys) while the array checks slot 0.`;
  }

  if (s.hashDone && !s.arrayDone) {
    const outcome = s.hashFound ? `found "${trace.targetKey}"` : `proved "${trace.targetKey}" absent`;
    return `Step ${stepIdx + 1}: Hash map already ${outcome} in ${s.hashComparisons} check${s.hashComparisons > 1 ? 's' : ''}, while the array is still scanning slot ${s.arrayIndexChecked} ("${trace.keys[s.arrayIndexChecked ?? 0]}").`;
  }

  if (s.arrayDone) {
    if (trace.foundInArray) {
      return `Done after ${trace.arrayTotalChecks} array checks vs ${trace.hashTotalChecks} hash check${trace.hashTotalChecks > 1 ? 's' : ''}: linear scan finally reached "${trace.targetKey}" at index ${trace.arrayFoundIndex}.`;
    }
    return `Done: array scanned all ${trace.arrayTotalChecks} slots to confirm "${trace.targetKey}" is missing; hash map checked only bucket ${trace.hashInfo.bucket} (${trace.hashTotalChecks} check${trace.hashTotalChecks > 1 ? 's' : ''}).`;
  }

  return `Step ${stepIdx + 1}: Array checks index ${s.arrayIndexChecked} ("${trace.keys[s.arrayIndexChecked ?? 0]}"), totaling ${s.arrayComparisons} comparisons so far.`;
}

/** General hash & Big-O formulas filled with current live numbers. */
export function formatHashFormula(
  trace: LookupTrace,
  scale: ScaleComparison,
): { general: string; worked: string } {
  const sumExpr = trace.hashInfo.terms
    .slice(0, 4)
    .map((t) => `${t.pos}×${t.code}`)
    .join(' + ');
  const ellipsis = trace.hashInfo.terms.length > 4 ? ' + …' : '';
  return {
    general: 'bucket(k) = (Σ i·code(kᵢ)) mod m   |   Scale: Array O(n) vs Hash O(1 + α/2)',
    worked: `hash("${trace.targetKey}") = (${sumExpr}${ellipsis}) mod ${trace.bucketCount} = ${trace.hashInfo.weightedSum} mod ${trace.bucketCount} = bucket ${trace.hashInfo.bucket}  |  At n=${scale.n.toLocaleString('en-US')}: ${scale.arrayWorstOps.toLocaleString('en-US')} vs ~${scale.hashAvgOps} checks`,
  };
}
