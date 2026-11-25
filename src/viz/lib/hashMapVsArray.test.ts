import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HASH_KEYS,
  buildLookupTrace,
  computeKeyHash,
  computeScaleComparison,
  explainLookupStep,
  formatHashFormula,
  parseKeyList,
} from './hashMapVsArray';

describe('hashMapVsArray pure computation', () => {
  it('computes exact hand-checked weighted character sum mod m', () => {
    // "cat": 1*99 + 2*97 + 3*116 = 99 + 194 + 348 = 641; 641 mod 8 = 1
    const h = computeKeyHash('cat', 8);
    expect(h.weightedSum).toBe(641);
    expect(h.bucket).toBe(1);

    // "mat": 1*109 + 2*97 + 3*116 = 651; 651 mod 8 = 3
    expect(computeKeyHash('mat', 8).bucket).toBe(3);

    // "sat": 1*115 + 2*97 + 3*116 = 657; 657 mod 8 = 1 (collides with "cat" in bucket 1!)
    expect(computeKeyHash('sat', 8).bucket).toBe(1);
  });

  it('builds a real array scan vs bucketed hash lookup trace', () => {
    const trace = buildLookupTrace(DEFAULT_HASH_KEYS, 'mat', 8);
    // DEFAULT_HASH_KEYS = ['rat','cat','dog','fox','fig','mat','sat','hat'] -> 'mat' at index 5 => 6 array checks
    expect(trace.foundInArray).toBe(true);
    expect(trace.arrayFoundIndex).toBe(5);
    expect(trace.arrayTotalChecks).toBe(6);

    // Bucket 3 only contains 'mat' -> 1 hash check
    expect(trace.hashInfo.bucket).toBe(3);
    expect(trace.buckets[3].keys).toEqual(['mat']);
    expect(trace.hashTotalChecks).toBe(1);
    expect(trace.steps).toHaveLength(6);
    expect(trace.steps[0].hashFound).toBe(true);
    expect(trace.steps[5].arrayFoundIndex).toBe(5);
  });

  it('handles collisions and missing keys honestly', () => {
    // Both 'cat' and 'sat' land in bucket 1 -> searching 'sat' checks bucket 1 chain (2 checks) vs 7 array checks
    const collisionTrace = buildLookupTrace(DEFAULT_HASH_KEYS, 'sat', 8);
    expect(collisionTrace.buckets[1].keys).toEqual(['cat', 'sat']);
    expect(collisionTrace.hashTotalChecks).toBe(2);
    expect(collisionTrace.arrayTotalChecks).toBe(7);

    // Missing key 'zebra': 1*122+2*101+3*98+4*114+5*97 = 1559; 1559 mod 8 = 7 ('dog' is in bucket 7!)
    const missTrace = buildLookupTrace(DEFAULT_HASH_KEYS, 'zebra', 8);
    expect(missTrace.foundInArray).toBe(false);
    expect(missTrace.arrayTotalChecks).toBe(8);
    expect(missTrace.hashInfo.weightedSum).toBe(1559);
    expect(missTrace.hashInfo.bucket).toBe(7);
    expect(missTrace.steps.at(-1)!.hashFound).toBe(false);
  });

  it('parses custom key lists, computes production scale speedup, and formats captions/formulas', () => {
    expect(parseKeyList('alpha, beta, alpha, gamma')).toEqual(['alpha', 'beta', 'gamma']);
    const trace = buildLookupTrace(DEFAULT_HASH_KEYS, 'mat', 8);
    const scale = computeScaleComparison(100_000, trace.loadFactor);
    expect(scale.arrayWorstOps).toBe(100_000);
    expect(scale.hashAvgOps).toBeCloseTo(1.5, 6);
    expect(scale.speedupWorst).toBeCloseTo(66_666.7, 1);

    expect(explainLookupStep(trace, 0)).toContain('bucket 3');
    const formula = formatHashFormula(trace, scale);
    expect(formula.general).toContain('bucket(k)');
    expect(formula.worked).toContain('651 mod 8 = bucket 3');
  });
});
