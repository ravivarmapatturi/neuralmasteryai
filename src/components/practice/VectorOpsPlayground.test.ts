import { describe, expect, it } from 'vitest';
import { getVectorOpSpec } from './VectorOpsPlayground';
import { diagnoseFailure } from './TestResultsPane';
import { getMasteryTier } from '../../lib/gamification';
import { PRACTICE_PROBLEMS } from '../../lib/practiceProblem';

describe('VectorOpsPlayground classifier & coverage', () => {
  it('identifies batch-dot-product for dot product operation spec', () => {
    const prob = PRACTICE_PROBLEMS['batch-dot-product'];
    expect(prob).toBeDefined();
    const spec = getVectorOpSpec(prob);
    expect(spec).not.toBeNull();
    expect(spec?.type).toBe('dot_product');
  });

  it('identifies matrix-multiplication for matrix_multiply spec', () => {
    const prob = PRACTICE_PROBLEMS['matrix-multiplication'];
    expect(prob).toBeDefined();
    const spec = getVectorOpSpec(prob);
    expect(spec).not.toBeNull();
    expect(spec?.type).toBe('matrix_multiply');
  });

  it('reports the exact count of covered problems in the catalogue', () => {
    const all = Object.values(PRACTICE_PROBLEMS);
    const matched = all.filter((p) => getVectorOpSpec(p) !== null);
    expect(matched.length).toBeGreaterThanOrEqual(10);
    // Conservative check: unrelated problem like fizz-buzz must not match
    expect(getVectorOpSpec(PRACTICE_PROBLEMS['fizz-buzz'])).toBeNull();
    expect(getVectorOpSpec(PRACTICE_PROBLEMS['calculate-average'])).toBeNull();
  });
});

describe('Pedagogical Test Failure Diagnostics (diagnoseFailure)', () => {
  it('detects type mismatch', () => {
    const diag = diagnoseFailure(42, '42');
    expect(diag).toBe('Expected a number but your function returned a string.');
  });

  it('detects list vs non-list type mismatch', () => {
    const diag = diagnoseFailure([1, 2], 3);
    expect(diag).toBe('Expected a list but your function returned a number.');
  });

  it('says None, not "a object", when the function returned nothing', () => {
    expect(diagnoseFailure([1, 2], null)).toBe('Your function returned None. Check that it ends with a return statement.');
  });

  it('names a dict as a dict', () => {
    expect(diagnoseFailure([1, 2], { a: 1 })).toBe('Expected a list but your function returned a dict.');
  });

  it('detects array length mismatch', () => {
    const diag = diagnoseFailure([1, 2, 3], [1, 2]);
    expect(diag).toBe('Expected 3 elements but got 2.');
  });

  it('detects off-by-a-small-amount float precision', () => {
    const diag = diagnoseFailure(3.14159, 3.14150);
    expect(diag).toBe('Your answer is very close — check for a rounding or floating-point precision issue.');
  });

  it('detects unexpected runtime exception', () => {
    const diag = diagnoseFailure([1, 2], undefined, 'ZeroDivisionError: division by zero');
    expect(diag).toBe('Your code encountered a runtime error before returning a value.');
  });

  it('returns null when difference is generic and honest raw JSON suffices', () => {
    const diag = diagnoseFailure(100, 200);
    expect(diag).toBeNull();
  });
});

describe('Mastery Tiers (Gold / Bronze)', () => {
  it('returns gold for independent solve (hintUsed === false)', () => {
    const tier = getMasteryTier({
      permalink: '/practice/batch-dot-product',
      kind: 'complete',
      date: '2026-09-09',
      points: 50,
      hintUsed: false,
    });
    expect(tier).toBe('gold');
  });

  it('returns bronze when hints were used (hintUsed === true)', () => {
    const tier = getMasteryTier({
      permalink: '/practice/batch-dot-product',
      kind: 'complete',
      date: '2026-09-09',
      points: 50,
      hintUsed: true,
    });
    expect(tier).toBe('bronze');
  });

  it('backward compatibility: returns bronze for legacy awards missing hintUsed', () => {
    const tier = getMasteryTier({
      permalink: '/practice/batch-dot-product',
      kind: 'complete',
      date: '2026-09-09',
      points: 50,
    });
    expect(tier).toBe('bronze');
  });

  it('returns null for missing award', () => {
    expect(getMasteryTier(undefined)).toBeNull();
  });
});
